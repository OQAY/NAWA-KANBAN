"""
FocusTracker - Headless productivity tracker (no UI).
Runs as Windows Service via NSSM. Collects activity data, syncs to backend.

Features:
- Mouse/keyboard idle detection via Windows API
- Active window capture (app + title) every second
- Focus Score calculation (switching detection)
- SQLite WAL storage + HTTP batch sync
- Named Mutex for single instance
- Graceful shutdown via threading.Event
- Pomodoro state machine (controllable via IPC file)
"""

import ctypes
import ctypes.wintypes
import json
import os
import signal
import sqlite3
import sys
import threading
import time
import winsound

import win32event
import win32api
import winerror

from data_collector import DataCollector
from window_tracker import get_active_window

VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# Quando compilado com PyInstaller, __file__ aponta pro temp dir
# Usar o diretorio do executavel pra dados persistentes
if getattr(sys, 'frozen', False):
    APP_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(APP_DIR, "config.json")
SOUNDS_DIR = os.path.join(APP_DIR, "sounds")
IPC_DIR = os.path.join(APP_DIR, "data")

DEFAULT_CONFIG = {
    "nivel1_seg": 60,
    "nivel2_seg": 90,
    "nivel3_seg": 120,
    "nivel3_repete_seg": 30,
    "som_nivel1": "1D_gota_agua.wav",
    "som_nivel2": "2D_nudge_duplo.wav",
    "som_nivel3": "3A_pulsos_rapidos.wav",
    "sound_enabled": True,
}

# ---------------------------------------------------------------------------
# Windows API
# ---------------------------------------------------------------------------

class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]


def get_idle_seconds() -> float:
    lii = LASTINPUTINFO()
    lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
    ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
    tick = ctypes.windll.kernel32.GetTickCount()
    return ((tick - lii.dwTime) & 0xFFFFFFFF) / 1000.0


# ---------------------------------------------------------------------------
# Single Instance (Named Mutex)
# ---------------------------------------------------------------------------

_mutex_handle = None


def acquire_mutex() -> bool:
    """Kernel-level single instance via Named Mutex."""
    global _mutex_handle
    _mutex_handle = win32event.CreateMutex(None, False, "Global\\FocusTrackerMutex")
    if win32api.GetLastError() == winerror.ERROR_ALREADY_EXISTS:
        win32api.CloseHandle(_mutex_handle)
        _mutex_handle = None
        return False
    return True


def release_mutex():
    global _mutex_handle
    if _mutex_handle:
        win32event.ReleaseMutex(_mutex_handle)
        win32api.CloseHandle(_mutex_handle)
        _mutex_handle = None


# ---------------------------------------------------------------------------
# Focus Score Algorithm
# ---------------------------------------------------------------------------

class FocusScorer:
    """Calculates real-time Focus Score based on window switching patterns."""

    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds  # 5-min rolling window
        self.switches: list[float] = []       # timestamps of app switches
        self.last_app: str = ""
        self.ide_apps = {"code.exe", "code - insiders.exe", "idea64.exe",
                         "pycharm64.exe", "webstorm64.exe", "rider64.exe",
                         "devenv.exe", "windowsterminal.exe", "powershell.exe",
                         "cmd.exe"}
        self.ide_seconds: float = 0
        self.total_seconds: float = 0

    def tick(self, app_name: str, is_afk: bool):
        """Called every second with current active app."""
        now = time.time()
        app_lower = app_name.lower()

        if not is_afk:
            self.total_seconds += 1
            if app_lower in self.ide_apps:
                self.ide_seconds += 1

        # Detect app switch
        if app_lower != self.last_app and self.last_app:
            self.switches.append(now)
        self.last_app = app_lower

        # Prune old switches
        cutoff = now - self.window_seconds
        self.switches = [t for t in self.switches if t > cutoff]

    @property
    def switches_per_minute(self) -> float:
        if not self.switches:
            return 0
        window = min(self.window_seconds, time.time() - self.switches[0]) if self.switches else 60
        return (len(self.switches) / max(window, 1)) * 60

    @property
    def score(self) -> int:
        """0-100 focus score. High = focused, low = distracted."""
        if self.total_seconds < 60:
            return 50  # Not enough data

        # Component 1: IDE ratio (0-50 points)
        ide_ratio = self.ide_seconds / max(self.total_seconds, 1)
        ide_score = min(50, int(ide_ratio * 60))

        # Component 2: Low switching (0-50 points)
        spm = self.switches_per_minute
        if spm <= 1:
            switch_score = 50    # Very focused
        elif spm <= 3:
            switch_score = 35    # Normal
        elif spm <= 6:
            switch_score = 20    # Somewhat distracted
        else:
            switch_score = 5     # Thrashing

        return min(100, ide_score + switch_score)


# ---------------------------------------------------------------------------
# Tracker Core
# ---------------------------------------------------------------------------

class FocusTracker:

    def __init__(self):
        self.config = self._load_config()
        self.running = threading.Event()
        self.running.set()  # Start in running state
        self.sound_enabled = self.config.get("sound_enabled", True)

        # Data
        self.collector = DataCollector()
        self.scorer = FocusScorer()

        # Alert state
        self._alerting = False
        self._last_sound_level = -1
        self._last_level3_time = 0.0

        # Pomodoro
        self.pomo = {
            "active": False,
            "mode": "off",        # off | focus | break | flow
            "start": 0,
            "work_sec": 50 * 60,  # 50 min
            "break_sec": 10 * 60, # 10 min
            "active_time": 0,
            "idle_time": 0,
            "penalties": 0,
            "auto_flow": True,    # auto-detect flow state
        }
        self._flow_ide_streak = 0  # consecutive seconds in IDE

        # IPC state file (overlay reads this)
        self._state_file = os.path.join(IPC_DIR, "tracker_state.json")
        os.makedirs(IPC_DIR, exist_ok=True)

        # PID file
        pid_file = os.path.join(IPC_DIR, "tracker.pid")
        with open(pid_file, "w") as f:
            f.write(str(os.getpid()))

    def _load_config(self) -> dict:
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE) as f:
                    cfg = json.load(f)
                for k, v in DEFAULT_CONFIG.items():
                    cfg.setdefault(k, v)
                return cfg
            except Exception:
                pass
        return DEFAULT_CONFIG.copy()

    def _write_state(self, idle: float, window: dict):
        """Write current state to JSON file for overlay to read."""
        state = {
            "pid": os.getpid(),
            "timestamp": time.time(),
            "idle_seconds": round(idle, 1),
            "is_afk": idle >= self.config["nivel1_seg"],
            "alerting": self._alerting,
            "alert_level": self._get_alert_level(idle),
            "app_name": window.get("app_name", ""),
            "window_title": window.get("window_title", ""),
            "focus_score": self.scorer.score,
            "switches_per_minute": round(self.scorer.switches_per_minute, 1),
            "sound_enabled": self.sound_enabled,
            "pomodoro": {
                "active": self.pomo["active"],
                "mode": self.pomo["mode"],
                "elapsed": round(time.time() - self.pomo["start"]) if self.pomo["active"] else 0,
                "work_sec": self.pomo["work_sec"],
                "break_sec": self.pomo["break_sec"],
                "active_time": round(self.pomo["active_time"]),
                "penalties": self.pomo["penalties"],
            },
            "today_stats": self.collector.get_today_stats(),
        }
        try:
            tmp = self._state_file + ".tmp"
            with open(tmp, "w") as f:
                json.dump(state, f)
            os.replace(tmp, self._state_file)
        except Exception:
            pass

    def _get_alert_level(self, idle: float) -> int:
        cfg = self.config
        if idle >= cfg["nivel3_seg"]:
            return 3
        if idle >= cfg["nivel2_seg"]:
            return 2
        if idle >= cfg["nivel1_seg"]:
            return 1
        return 0

    def _play_wav(self, filename: str):
        if not self.sound_enabled:
            return
        path = os.path.join(SOUNDS_DIR, filename)
        if os.path.exists(path):
            try:
                winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_NODEFAULT)
            except Exception:
                pass

    # -- Main loops ---------------------------------------------------------

    def _tracking_loop(self):
        """Core tracking: every second, capture state and record."""
        while self.running.is_set():
            try:
                idle = get_idle_seconds()
                window = get_active_window()
                threshold = self.config["nivel1_seg"]

                is_afk = idle >= threshold
                alert_level = self._get_alert_level(idle)

                # Record in data collector
                self.collector.record_state(
                    is_afk=is_afk,
                    alert_level=alert_level,
                    app_name=window["app_name"],
                    window_title=window["window_title"],
                )

                # Update focus scorer
                self.scorer.tick(window["app_name"], is_afk)

                # Update alert state
                self._alerting = is_afk

                # Pomodoro logic
                self._pomo_tick(idle, window["app_name"])

                # Write state for overlay
                self._write_state(idle, window)

                # Check IPC commands (sound toggle, config reload)
                self._check_ipc_commands()

            except Exception:
                pass

            self.running.wait(timeout=1.0)  # Sleep 1s but wake on shutdown

    def _alert_loop(self):
        """Sound alerts when idle too long."""
        while self.running.is_set():
            if self.sound_enabled and self._alerting:
                try:
                    idle = get_idle_seconds()
                    now = time.time()
                    cfg = self.config

                    if idle >= cfg["nivel3_seg"]:
                        if self._last_sound_level < 2:
                            self._play_wav(cfg["som_nivel3"])
                            self._last_sound_level = 2
                            self._last_level3_time = now
                        elif now - self._last_level3_time >= cfg["nivel3_repete_seg"]:
                            self._play_wav(cfg["som_nivel3"])
                            self._last_level3_time = now
                    elif idle >= cfg["nivel2_seg"]:
                        if self._last_sound_level < 1:
                            self._play_wav(cfg["som_nivel2"])
                            self._last_sound_level = 1
                    elif idle >= cfg["nivel1_seg"]:
                        if self._last_sound_level < 0:
                            self._play_wav(cfg["som_nivel1"])
                            self._last_sound_level = 0
                except Exception:
                    pass

                self.running.wait(timeout=1.0)
            else:
                if self._last_sound_level >= 0:
                    self._last_sound_level = -1
                    self._last_level3_time = 0.0
                self.running.wait(timeout=0.5)

    def _pomo_tick(self, idle: float, app_name: str):
        """Pomodoro state machine tick."""
        p = self.pomo
        app_lower = app_name.lower()

        # Auto-flow detection: 5+ min in IDE without break → start flow mode
        if p["auto_flow"] and not p["active"]:
            if app_lower in self.scorer.ide_apps and idle < 30:
                self._flow_ide_streak += 1
                if self._flow_ide_streak >= 300:  # 5 min
                    p["active"] = True
                    p["mode"] = "flow"
                    p["start"] = time.time() - 300
                    p["active_time"] = 300
                    p["idle_time"] = 0
                    p["penalties"] = 0
            else:
                self._flow_ide_streak = 0

        if not p["active"]:
            return

        elapsed = time.time() - p["start"]

        if p["mode"] in ("focus", "flow"):
            # Track active vs idle time
            if idle < self.config["nivel1_seg"]:
                p["active_time"] += 1
            else:
                p["idle_time"] += 1

            # Penalty: level 3 alert during focus = penalty
            if idle >= self.config["nivel3_seg"]:
                if p["penalties"] == 0 or (time.time() - p.get("_last_penalty", 0)) > 60:
                    p["penalties"] += 1
                    p["_last_penalty"] = time.time()

            # Auto-pause flow if idle too long
            if p["mode"] == "flow" and idle >= self.config["nivel3_seg"]:
                self._end_pomo("auto_paused")
                return

            # Focus mode: check if work time completed
            if p["mode"] == "focus" and elapsed >= p["work_sec"]:
                p["mode"] = "break"
                p["start"] = time.time()
                try:
                    winsound.Beep(500, 200)
                    winsound.Beep(700, 300)
                except Exception:
                    pass

        elif p["mode"] == "break":
            if elapsed >= p["break_sec"]:
                self._end_pomo("completed")

    def _end_pomo(self, status: str):
        """End current Pomodoro session and save."""
        p = self.pomo
        self.collector.save_pomodoro(
            planned=p["work_sec"],
            actual=int(p["active_time"]),
            status=status,
            started_at=p["start"] - p["active_time"],
            interruptions=p["penalties"],
            afk_time=int(p["idle_time"]),
        )
        p["active"] = False
        p["mode"] = "off"
        self._flow_ide_streak = 0

    def _check_ipc_commands(self):
        """Check for commands from overlay (toggle sound, reload config, etc)."""
        cmd_file = os.path.join(IPC_DIR, "command.json")
        if os.path.exists(cmd_file):
            try:
                with open(cmd_file) as f:
                    cmd = json.load(f)
                os.remove(cmd_file)

                action = cmd.get("action")
                if action == "toggle_sound":
                    self.sound_enabled = not self.sound_enabled
                elif action == "reload_config":
                    self.config = self._load_config()
                elif action == "shutdown":
                    self.shutdown()
                elif action == "pomo_start":
                    self.pomo["active"] = True
                    self.pomo["mode"] = "focus"
                    self.pomo["start"] = time.time()
                    self.pomo["active_time"] = 0
                    self.pomo["idle_time"] = 0
                    self.pomo["penalties"] = 0
                elif action == "pomo_stop":
                    if self.pomo["active"]:
                        self._end_pomo("interrupted")
                elif action == "pomo_toggle_auto":
                    self.pomo["auto_flow"] = not self.pomo["auto_flow"]
            except Exception:
                pass

    # -- Lifecycle ----------------------------------------------------------

    def shutdown(self):
        """Graceful shutdown."""
        self.running.clear()
        self.collector.flush_current()
        release_mutex()
        # Clean state file
        try:
            os.remove(self._state_file)
        except OSError:
            pass
        try:
            os.remove(os.path.join(IPC_DIR, "tracker.pid"))
        except OSError:
            pass

    def run(self):
        """Start all threads and block until shutdown."""
        # Tracking thread
        t1 = threading.Thread(target=self._tracking_loop, daemon=True, name="tracking")
        t1.start()

        # Alert thread
        t2 = threading.Thread(target=self._alert_loop, daemon=True, name="alerts")
        t2.start()

        # Sync thread
        self.collector.start_sync_loop()

        print(f"FocusTracker v{VERSION} running (PID {os.getpid()})")

        # Block main thread until shutdown signal
        try:
            while self.running.is_set():
                self.running.wait(timeout=5.0)
        except KeyboardInterrupt:
            pass
        finally:
            self.shutdown()
            print("FocusTracker stopped.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    if not acquire_mutex():
        print("FocusTracker already running. Exiting.")
        sys.exit(0)

    # Signal handlers for graceful shutdown
    tracker = FocusTracker()

    def handle_signal(signum, frame):
        tracker.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        # Windows-specific: handle console close
        import win32api as _api
        def console_handler(event):
            if event in (0, 1, 2, 5, 6):  # CTRL_C, CTRL_BREAK, CTRL_CLOSE, LOGOFF, SHUTDOWN
                tracker.shutdown()
                return True
            return False
        _api.SetConsoleCtrlHandler(console_handler, True)
    except Exception:
        pass

    tracker.run()


if __name__ == "__main__":
    main()
