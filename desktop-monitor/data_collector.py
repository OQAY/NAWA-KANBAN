"""
Data Collector - Coleta eventos de atividade e sincroniza com o backend.

Armazena localmente em SQLite e envia em batch para a API.
Funciona offline - faz sync quando o backend estiver disponivel.
"""

import sqlite3
import json
import time
import threading
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(APP_DIR, "data", "activity.db")
SYNC_CONFIG_FILE = os.path.join(APP_DIR, "sync_config.json")

DEFAULT_SYNC_CONFIG = {
    "api_url": "http://localhost:7001",
    "email": "",
    "password": "",
    "jwt_token": "",
    "sync_interval_seconds": 300,  # 5 minutos
    "enabled": False,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DataCollector:
    """Coleta eventos de atividade do monitor e armazena localmente."""

    def __init__(self):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        self.conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        self.lock = threading.Lock()
        self._init_db()

        # Estado atual do periodo
        self._current_period_start: float | None = None
        self._current_is_afk: bool | None = None
        self._current_alert_level: int = 0
        self._current_app: str = ""
        self._current_title: str = ""
        self._current_focus_score: int = 0
        self._current_productivity_category: int = 0
        self._current_audio_source: str = ""
        self._current_keystroke_rate: int = 0
        self._current_whisper_active: bool = False
        self._current_work_score: int = 0

        # Sync config
        self.sync_config = self._load_sync_config()
        self._sync_running = False

    def _init_db(self):
        with self.lock:
            # WAL mode for concurrent read/write (overlay can read while tracker writes)
            self.conn.execute("PRAGMA journal_mode=WAL;")
            self.conn.execute("PRAGMA synchronous=NORMAL;")
            self.conn.executescript("""
                CREATE TABLE IF NOT EXISTS heartbeats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_seconds INTEGER NOT NULL,
                    is_afk INTEGER NOT NULL DEFAULT 0,
                    alert_level INTEGER NOT NULL DEFAULT 0,
                    app_name TEXT,
                    window_title TEXT,
                    focus_score INTEGER NOT NULL DEFAULT 0,
                    productivity_category INTEGER NOT NULL DEFAULT 0,
                    audio_source TEXT,
                    keystroke_rate INTEGER NOT NULL DEFAULT 0,
                    whisper_active INTEGER NOT NULL DEFAULT 0,
                    work_score INTEGER NOT NULL DEFAULT 0,
                    synced INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_hb_synced ON heartbeats(synced);
                CREATE INDEX IF NOT EXISTS idx_hb_start ON heartbeats(start_time);

                CREATE TABLE IF NOT EXISTS daily_stats (
                    date TEXT PRIMARY KEY,
                    total_seconds INTEGER DEFAULT 0,
                    active_seconds INTEGER DEFAULT 0,
                    afk_seconds INTEGER DEFAULT 0,
                    alerts_l1 INTEGER DEFAULT 0,
                    alerts_l2 INTEGER DEFAULT 0,
                    alerts_l3 INTEGER DEFAULT 0,
                    longest_streak INTEGER DEFAULT 0,
                    first_activity TEXT,
                    last_activity TEXT
                );
            """)
            # Migrate: add columns if missing (existing DBs)
            migrations = [
                "ALTER TABLE heartbeats ADD COLUMN focus_score INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE heartbeats ADD COLUMN productivity_category INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE heartbeats ADD COLUMN audio_source TEXT",
                "ALTER TABLE heartbeats ADD COLUMN keystroke_rate INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE heartbeats ADD COLUMN whisper_active INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE heartbeats ADD COLUMN work_score INTEGER NOT NULL DEFAULT 0",
            ]
            for sql in migrations:
                try:
                    self.conn.execute(sql)
                except Exception:
                    pass  # Column already exists
            self.conn.commit()

    def _load_sync_config(self) -> dict:
        if os.path.exists(SYNC_CONFIG_FILE):
            try:
                with open(SYNC_CONFIG_FILE, "r") as f:
                    cfg = json.load(f)
                for k, v in DEFAULT_SYNC_CONFIG.items():
                    cfg.setdefault(k, v)
                return cfg
            except Exception:
                pass
        return DEFAULT_SYNC_CONFIG.copy()

    def save_sync_config(self):
        with open(SYNC_CONFIG_FILE, "w") as f:
            json.dump(self.sync_config, f, indent=2)

    # ------------------------------------------------------------------
    # COLETA: Chamado pelo monitor a cada segundo
    # ------------------------------------------------------------------

    def record_state(self, is_afk: bool, alert_level: int = 0,
                     app_name: str = "", window_title: str = "",
                     focus_score: int = 0, productivity_category: int = 0,
                     audio_source: str = "", keystroke_rate: int = 0,
                     whisper_active: bool = False, work_score: int = 0):
        """Registra o estado atual. Agrupa periodos com mesmo (is_afk + app)."""
        now = time.time()

        # Mesmo estado E mesmo app? Apenas estende o periodo atual
        same_state = (self._current_is_afk == is_afk and
                      self._current_app == app_name and
                      self._current_period_start is not None)
        if same_state:
            self._current_alert_level = max(self._current_alert_level, alert_level)
            self._current_title = window_title
            self._current_focus_score = focus_score
            self._current_productivity_category = productivity_category
            self._current_audio_source = audio_source
            self._current_keystroke_rate = keystroke_rate
            self._current_whisper_active = whisper_active
            self._current_work_score = work_score
            return

        # Estado ou app mudou - salva periodo anterior e inicia novo
        if self._current_period_start is not None:
            self._flush_period(now)

        self._current_period_start = now
        self._current_is_afk = is_afk
        self._current_alert_level = alert_level
        self._current_app = app_name
        self._current_title = window_title
        self._current_focus_score = focus_score
        self._current_productivity_category = productivity_category
        self._current_audio_source = audio_source
        self._current_keystroke_rate = keystroke_rate
        self._current_whisper_active = whisper_active
        self._current_work_score = work_score

    def _flush_period(self, end_time: float):
        """Salva o periodo acumulado no SQLite."""
        if self._current_period_start is None:
            return

        duration = int(end_time - self._current_period_start)
        if duration < 1:
            return

        start_iso = datetime.fromtimestamp(self._current_period_start, tz=timezone.utc).isoformat()
        end_iso = datetime.fromtimestamp(end_time, tz=timezone.utc).isoformat()
        today = datetime.fromtimestamp(self._current_period_start, tz=timezone.utc).strftime("%Y-%m-%d")

        with self.lock:
            self.conn.execute(
                """INSERT INTO heartbeats (
                    start_time, end_time, duration_seconds, is_afk, alert_level,
                    app_name, window_title, focus_score,
                    productivity_category, audio_source, keystroke_rate, whisper_active, work_score,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (start_iso, end_iso, duration, int(self._current_is_afk or False),
                 self._current_alert_level, self._current_app, self._current_title,
                 self._current_focus_score,
                 self._current_productivity_category, self._current_audio_source or None,
                 self._current_keystroke_rate, int(self._current_whisper_active),
                 self._current_work_score, _now_iso()),
            )

            # Atualiza stats diarias
            self.conn.execute(
                """INSERT INTO daily_stats (date, total_seconds, active_seconds, afk_seconds,
                       alerts_l1, alerts_l2, alerts_l3, first_activity, last_activity)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(date) DO UPDATE SET
                       total_seconds = total_seconds + excluded.total_seconds,
                       active_seconds = active_seconds + excluded.active_seconds,
                       afk_seconds = afk_seconds + excluded.afk_seconds,
                       alerts_l1 = alerts_l1 + excluded.alerts_l1,
                       alerts_l2 = alerts_l2 + excluded.alerts_l2,
                       alerts_l3 = alerts_l3 + excluded.alerts_l3,
                       last_activity = excluded.last_activity
                """,
                (
                    today,
                    duration,
                    duration if not self._current_is_afk else 0,
                    duration if self._current_is_afk else 0,
                    1 if self._current_alert_level == 1 else 0,
                    1 if self._current_alert_level == 2 else 0,
                    1 if self._current_alert_level == 3 else 0,
                    start_iso,
                    end_iso,
                ),
            )
            self.conn.commit()

    def flush_current(self):
        """Forca salvamento do periodo atual (chamado ao fechar)."""
        if self._current_period_start is not None:
            self._flush_period(time.time())
            self._current_period_start = None

    def save_pomodoro(self, planned: int, actual: int, status: str,
                      started_at: float, interruptions: int = 0, afk_time: int = 0):
        """Salva sessao Pomodoro e envia pra API."""
        start_iso = datetime.fromtimestamp(started_at, tz=timezone.utc).isoformat()
        end_iso = _now_iso()

        # Enviar direto pra API (sem fila local)
        if self.sync_config.get("enabled") and self.sync_config.get("jwt_token"):
            try:
                payload = json.dumps({
                    "plannedDurationSeconds": planned,
                    "actualDurationSeconds": actual,
                    "status": status,
                    "startedAt": start_iso,
                    "endedAt": end_iso,
                    "interruptionCount": interruptions,
                    "afkTimeSeconds": afk_time,
                }).encode("utf-8")

                url = self.sync_config["api_url"].rstrip("/") + "/productivity/pomodoro/sessions"
                req = urllib.request.Request(
                    url, data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.sync_config['jwt_token']}",
                    },
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=10)
            except Exception:
                pass

    # ------------------------------------------------------------------
    # CONSULTA LOCAL: Para exibir no overlay
    # ------------------------------------------------------------------

    def get_today_stats(self) -> dict:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with self.lock:
            row = self.conn.execute(
                "SELECT * FROM daily_stats WHERE date = ?", (today,)
            ).fetchone()

        if not row:
            return {
                "date": today, "total_seconds": 0, "active_seconds": 0,
                "afk_seconds": 0, "alerts_l1": 0, "alerts_l2": 0, "alerts_l3": 0,
                "longest_streak": 0,
            }

        return {
            "date": row[0], "total_seconds": row[1], "active_seconds": row[2],
            "afk_seconds": row[3], "alerts_l1": row[4], "alerts_l2": row[5],
            "alerts_l3": row[6], "longest_streak": row[7],
            "first_activity": row[8], "last_activity": row[9],
        }

    def get_pending_count(self) -> int:
        with self.lock:
            row = self.conn.execute(
                "SELECT COUNT(*) FROM heartbeats WHERE synced = 0"
            ).fetchone()
        return row[0] if row else 0

    # ------------------------------------------------------------------
    # SYNC: Envia heartbeats pendentes para o backend
    # ------------------------------------------------------------------

    def start_sync_loop(self):
        """Inicia thread de sync periodico."""
        threading.Thread(target=self._sync_loop, daemon=True).start()

    def _sync_loop(self):
        while True:
            if self.sync_config.get("enabled"):
                try:
                    self._do_sync()
                except Exception:
                    pass
            interval = self.sync_config.get("sync_interval_seconds", 300)
            time.sleep(interval)

    def _do_sync(self):
        """Envia heartbeats nao sincronizados em batch."""
        if self._sync_running:
            return
        self._sync_running = True

        try:
            # Pegar token se nao tem
            if not self.sync_config.get("jwt_token"):
                self._login()

            # Buscar pendentes (max 200 por batch)
            with self.lock:
                rows = self.conn.execute(
                    "SELECT id, start_time, end_time, duration_seconds, is_afk, alert_level, "
                    "app_name, window_title, focus_score, "
                    "productivity_category, audio_source, keystroke_rate, whisper_active, work_score "
                    "FROM heartbeats WHERE synced = 0 ORDER BY start_time LIMIT 200"
                ).fetchall()

            if not rows:
                return

            events = []
            ids = []
            for row in rows:
                ids.append(row[0])
                event = {
                    "startTime": row[1],
                    "endTime": row[2],
                    "durationSeconds": row[3],
                    "isAfk": bool(row[4]),
                    "alertLevel": row[5],
                    "appName": row[6] or "",
                    "windowTitle": row[7] or "",
                    "focusScore": row[8] or 0,
                    "productivityCategory": row[9] or 0,
                    "keystrokeRate": row[11] or 0,
                    "whisperActive": bool(row[12]),
                    "workScore": row[13] or 0,
                }
                if row[10]:  # audio_source (nullable)
                    event["audioSource"] = row[10]
                events.append(event)

            payload = json.dumps({
                "clientMetadata": {"hostname": os.environ.get("COMPUTERNAME", "unknown"), "version": "1.0.0"},
                "events": events,
            }).encode("utf-8")

            url = self.sync_config["api_url"].rstrip("/") + "/productivity/heartbeats/bulk"
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.sync_config['jwt_token']}",
                },
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 201):
                    # Marcar como sincronizados
                    with self.lock:
                        placeholders = ",".join("?" for _ in ids)
                        self.conn.execute(
                            f"UPDATE heartbeats SET synced = 1 WHERE id IN ({placeholders})", ids
                        )
                        self.conn.commit()

        except urllib.error.HTTPError as e:
            if e.code == 401:
                # Token expirado, tenta relogar
                self.sync_config["jwt_token"] = ""
                try:
                    self._login()
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            self._sync_running = False

    def _login(self):
        """Faz login na API e salva o JWT token."""
        email = self.sync_config.get("email")
        password = self.sync_config.get("password")
        if not email or not password:
            return

        url = self.sync_config["api_url"].rstrip("/") + "/auth/login"
        payload = json.dumps({"email": email, "password": password}).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("access_token") or data.get("token")
            if token:
                self.sync_config["jwt_token"] = token
                self.save_sync_config()
