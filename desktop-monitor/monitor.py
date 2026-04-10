"""
FocusTracker - Productivity Monitor
====================================
Overlay visual + system tray + sons WAV + janela de config.

Uso:
  python monitor.py        # Inicia com overlay + tray
  Clique no overlay        # Ativa/Desativa
  Clique direito overlay   # Menu: Configurar, Sair

Dependencias: pip install pystray Pillow
"""

import ctypes
import ctypes.wintypes
import json
import threading
import time
import winsound
import tkinter as tk
from tkinter import ttk
import sys
import os
import signal
from data_collector import DataCollector
from window_tracker import get_active_window
from activity_classifier import classify, calculate_work_score
from audio_tracker import AudioTracker

VERSION = "2.0.0"

try:
    import pystray
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pystray", "Pillow"])
    import pystray
    from PIL import Image, ImageDraw, ImageFont

try:
    import win32event
    import win32api
    import winerror
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False


# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------

APP_DIR = os.path.dirname(os.path.abspath(__file__))
SOUNDS_DIR = os.path.join(APP_DIR, "sounds")
CONFIG_FILE = os.path.join(APP_DIR, "config.json")
IPC_DIR = os.path.join(APP_DIR, "data")

DEFAULT_CONFIG = {
    "nivel1_seg": 60,
    "nivel2_seg": 90,
    "nivel3_seg": 120,
    "nivel3_repete_seg": 30,
    "som_nivel1": "1D_gota_agua.wav",
    "som_nivel2": "2D_nudge_duplo.wav",
    "som_nivel3": "3A_pulsos_rapidos.wav",
}


def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                cfg = json.load(f)
            # Merge com defaults caso falte algo
            for k, v in DEFAULT_CONFIG.items():
                cfg.setdefault(k, v)
            return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def save_config(cfg: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


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


def get_screen_size() -> tuple[int, int]:
    user32 = ctypes.windll.user32
    return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)


# ---------------------------------------------------------------------------
# Tray icon helpers
# ---------------------------------------------------------------------------

def make_icon(color: tuple, letter: str = "", size: int = 64) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill=color, outline=(255, 255, 255, 220), width=3)
    if letter:
        try:
            font = ImageFont.truetype("arial.ttf", size // 2)
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) / 2, (size - th) / 2 - 2), letter,
                  fill=(255, 255, 255, 240), font=font)
    return img


ICON_PAUSED = make_icon((100, 100, 100, 255), "P")
ICON_ACTIVE = make_icon((34, 197, 94, 255))
ICON_ALERT = make_icon((239, 68, 68, 255), "!")


# ---------------------------------------------------------------------------
# Cores e estilos
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Focus Score Algorithm
# ---------------------------------------------------------------------------

class FocusScorer:
    """Calculates real-time Focus Score based on window switching patterns."""

    IDE_APPS = {"code.exe", "code - insiders.exe", "idea64.exe",
                "pycharm64.exe", "webstorm64.exe", "rider64.exe",
                "devenv.exe", "windowsterminal.exe", "powershell.exe",
                "cmd.exe"}

    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds
        self.switches: list[float] = []
        self.last_app: str = ""
        self.ide_seconds: float = 0
        self.total_seconds: float = 0

    def tick(self, app_name: str, is_afk: bool):
        now = time.time()
        app_lower = app_name.lower()
        if not is_afk:
            self.total_seconds += 1
            if app_lower in self.IDE_APPS:
                self.ide_seconds += 1
        if app_lower != self.last_app and self.last_app:
            self.switches.append(now)
        self.last_app = app_lower
        cutoff = now - self.window_seconds
        self.switches = [t for t in self.switches if t > cutoff]

    @property
    def switches_per_minute(self) -> float:
        if not self.switches:
            return 0
        window = min(self.window_seconds, time.time() - self.switches[0])
        return (len(self.switches) / max(window, 1)) * 60

    @property
    def score(self) -> int:
        if self.total_seconds < 60:
            return 50
        ide_ratio = self.ide_seconds / max(self.total_seconds, 1)
        ide_score = min(50, int(ide_ratio * 60))
        spm = self.switches_per_minute
        if spm <= 1:
            switch_score = 50
        elif spm <= 3:
            switch_score = 35
        elif spm <= 6:
            switch_score = 20
        else:
            switch_score = 5
        return min(100, ide_score + switch_score)


# ---------------------------------------------------------------------------
# Keystroke Counter (privacy-safe: conta teclas, NÃO loga quais)
# ---------------------------------------------------------------------------

class KeystrokeCounter:
    """Conta teclas por minuto sem registrar qual tecla foi pressionada."""

    def __init__(self):
        self._count: int = 0
        self._lock = threading.Lock()
        self._listener = None
        self._per_minute: float = 0.0
        self._last_calc: float = time.time()
        self._start()

    def _start(self):
        try:
            from pynput import keyboard as pynput_kb

            def on_press(_key):
                with self._lock:
                    self._count += 1

            self._listener = pynput_kb.Listener(on_press=on_press, suppress=False)
            self._listener.daemon = True
            self._listener.start()
        except Exception:
            # pynput não disponível ou bloqueado por antivírus — fallback polling
            threading.Thread(target=self._polling_fallback, daemon=True).start()

    def _polling_fallback(self):
        """Detecta pressão de tecla via GetAsyncKeyState (sem capturar qual)."""
        KEYS = list(range(0x08, 0x90))  # backspace até F19
        prev = set()
        while True:
            curr = set()
            for vk in KEYS:
                if ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000:
                    curr.add(vk)
            new_keys = curr - prev
            if new_keys:
                with self._lock:
                    self._count += len(new_keys)
            prev = curr
            time.sleep(0.05)

    def tick(self):
        """Chama a cada segundo para atualizar KPM. Janela deslizante de 60s."""
        now = time.time()
        elapsed = now - self._last_calc
        if elapsed >= 5.0:  # Recalcula a cada 5s para suavizar
            with self._lock:
                count = self._count
                self._count = 0
            self._per_minute = (count / elapsed) * 60
            self._last_calc = now

    @property
    def per_minute(self) -> float:
        return self._per_minute


# ---------------------------------------------------------------------------
# Whisper Detector (Ctrl+Win = início de ditado por 30s)
# ---------------------------------------------------------------------------

class WhisperDetector:
    """Detecta quando o usuário usa Whisper STT (hotkey Ctrl+Win)."""

    COOLDOWN_SECONDS = 30

    def __init__(self):
        self._active_until: float = 0.0
        self._lock = threading.Lock()
        self._start_listener()

    def _start_listener(self):
        try:
            from pynput import keyboard as pynput_kb

            held = set()

            def on_press(key):
                try:
                    held.add(key)
                    # Detecta Ctrl + Win (left ou right)
                    ctrl = (pynput_kb.Key.ctrl_l in held or pynput_kb.Key.ctrl_r in held)
                    win = (pynput_kb.Key.cmd in held or pynput_kb.Key.cmd_r in held)
                    if ctrl and win:
                        with self._lock:
                            self._active_until = time.time() + self.COOLDOWN_SECONDS
                except Exception:
                    pass

            def on_release(key):
                held.discard(key)

            listener = pynput_kb.Listener(on_press=on_press, on_release=on_release, suppress=False)
            listener.daemon = True
            listener.start()
        except Exception:
            pass  # pynput não disponível

    @property
    def is_active(self) -> bool:
        with self._lock:
            return time.time() < self._active_until


STYLES = {
    "paused": {
        "bg": "#2d2d2d", "dot": "#3b82f6", "text": "#9ca3af",
        "label": "SOM PAUSADO", "border": "#333344",
    },
    "active": {
        "bg": "#1a2e1a", "dot": "#22c55e", "text": "#4ade80",
        "label": "MONITORANDO", "border": "#2d5a2d",
    },
    "alert": {
        "bg": "#2e1a1a", "dot": "#ef4444", "text": "#f87171",
        "label": "MEXE ESSE MOUSE!", "border": "#5a2d2d",
    },
}


# ---------------------------------------------------------------------------
# Janela de Configuracoes
# ---------------------------------------------------------------------------

class ConfigWindow:
    """Janela popup para configurar tempos e sons."""

    BG = "#1e1e2e"
    FG = "#e0e0e0"
    ACCENT = "#7c3aed"
    INPUT_BG = "#2a2a3e"

    def __init__(self, parent: tk.Tk, app: "AntiProcrastinacao"):
        self.app = app
        self.win = tk.Toplevel(parent)
        self.win.title("Configuracoes - Anti-Procrastinacao")
        self.win.geometry("400x520")
        self.win.resizable(False, False)
        self.win.attributes("-topmost", True)
        self.win.configure(bg=self.BG)
        self.win.grab_set()

        self.available_sounds = []
        if os.path.exists(SOUNDS_DIR):
            self.available_sounds = sorted(
                f for f in os.listdir(SOUNDS_DIR) if f.endswith(".wav")
            )

        self._build_ui()

    def _build_ui(self):
        bg, fg, accent = self.BG, self.FG, self.ACCENT
        cfg = self.app.config

        # Titulo
        tk.Label(
            self.win, text="Configuracoes", font=("Segoe UI", 16, "bold"),
            bg=bg, fg=fg,
        ).pack(pady=(16, 4))

        tk.Label(
            self.win, text="Tempos em segundos. Salvar reinicia o monitor.",
            font=("Segoe UI", 9), bg=bg, fg="#888888",
        ).pack(pady=(0, 8))

        main = tk.Frame(self.win, bg=bg)
        main.pack(fill="both", expand=True, padx=24)

        # -- Nivel 1 --
        self.var_n1 = self._make_row(main, 0,
            "Nivel 1 - Primeiro alerta", "seg", cfg["nivel1_seg"])
        self.var_som1 = self._make_sound_row(main, 1, cfg["som_nivel1"])

        # -- Nivel 2 --
        self.var_n2 = self._make_row(main, 2,
            "Nivel 2 - Segundo alerta", "seg", cfg["nivel2_seg"])
        self.var_som2 = self._make_sound_row(main, 3, cfg["som_nivel2"])

        # -- Nivel 3 --
        self.var_n3 = self._make_row(main, 4,
            "Nivel 3 - Alerta insistente", "seg", cfg["nivel3_seg"])
        self.var_som3 = self._make_sound_row(main, 5, cfg["som_nivel3"])

        # -- Repeticao --
        self.var_rep = self._make_row(main, 6,
            "Repetir nivel 3 a cada", "seg", cfg["nivel3_repete_seg"])

        # -- Botoes --
        btn_frame = tk.Frame(self.win, bg=bg)
        btn_frame.pack(fill="x", padx=24, pady=(16, 20))

        tk.Button(
            btn_frame, text="Salvar e Reiniciar", font=("Segoe UI", 11, "bold"),
            bg=accent, fg="white", activebackground="#6d28d9",
            relief="flat", padx=20, pady=8, cursor="hand2",
            command=self._save_and_restart,
        ).pack(side="right", padx=(8, 0))

        tk.Button(
            btn_frame, text="Cancelar", font=("Segoe UI", 10),
            bg="#444444", fg="#cccccc", activebackground="#555555",
            relief="flat", padx=16, pady=8, cursor="hand2",
            command=self.win.destroy,
        ).pack(side="right")

        tk.Button(
            btn_frame, text="Testar sons", font=("Segoe UI", 10),
            bg="#1a5c2e", fg="#4ade80", activebackground="#166534",
            relief="flat", padx=16, pady=8, cursor="hand2",
            command=self._test_sounds,
        ).pack(side="left")

    def _make_row(self, parent, row, label_text, unit, default_val):
        """Cria uma linha: label + input numerico + unidade."""
        bg, fg = self.BG, self.FG

        f = tk.Frame(parent, bg=bg)
        f.grid(row=row, column=0, sticky="ew", pady=(10, 0))
        parent.columnconfigure(0, weight=1)

        tk.Label(f, text=label_text, font=("Segoe UI", 10, "bold"),
                 bg=bg, fg=fg).pack(side="left")

        right = tk.Frame(f, bg=bg)
        right.pack(side="right")

        var = tk.StringVar(value=str(default_val))
        entry = tk.Entry(
            right, textvariable=var, font=("Consolas", 12, "bold"),
            bg=self.INPUT_BG, fg=self.ACCENT, insertbackground=self.ACCENT,
            relief="flat", width=5, justify="center",
        )
        entry.pack(side="left", padx=(0, 4))
        entry.bind("<FocusIn>", lambda e: entry.select_range(0, "end"))

        tk.Label(right, text=unit, font=("Segoe UI", 9),
                 bg=bg, fg="#888888").pack(side="left")

        return var

    def _make_sound_row(self, parent, row, default_sound):
        """Cria uma linha: dropdown de som + botao preview."""
        bg = self.BG
        f = tk.Frame(parent, bg=bg)
        f.grid(row=row, column=0, sticky="ew", pady=(2, 0))

        var = tk.StringVar(value=default_sound)
        combo = ttk.Combobox(
            f, textvariable=var, values=self.available_sounds,
            state="readonly", width=28,
        )
        combo.pack(side="left")

        tk.Button(
            f, text="▶", font=("Segoe UI", 9), bg="#333333", fg="#e0e0e0",
            relief="flat", padx=6, cursor="hand2",
            command=lambda: self._preview_sound(var.get()),
        ).pack(side="left", padx=(6, 0))

        return var

    def _preview_sound(self, filename):
        path = os.path.join(SOUNDS_DIR, filename)
        if os.path.exists(path):
            threading.Thread(
                target=lambda: winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_NODEFAULT),
                daemon=True,
            ).start()

    def _test_sounds(self):
        sounds = [self.var_som1.get(), self.var_som2.get(), self.var_som3.get()]
        def _play():
            for s in sounds:
                path = os.path.join(SOUNDS_DIR, s)
                if os.path.exists(path):
                    winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_NODEFAULT)
                    time.sleep(0.5)
        threading.Thread(target=_play, daemon=True).start()

    def _get_int(self, var, fallback):
        try:
            return max(1, int(var.get()))
        except (ValueError, tk.TclError):
            return fallback

    def _save_and_restart(self):
        n1 = self._get_int(self.var_n1, 60)
        n2 = self._get_int(self.var_n2, 90)
        n3 = self._get_int(self.var_n3, 120)
        rep = self._get_int(self.var_rep, 30)

        # Garantir ordem crescente
        if n2 <= n1:
            n2 = n1 + 15
        if n3 <= n2:
            n3 = n2 + 15

        new_cfg = {
            "nivel1_seg": n1,
            "nivel2_seg": n2,
            "nivel3_seg": n3,
            "nivel3_repete_seg": rep,
            "som_nivel1": self.var_som1.get(),
            "som_nivel2": self.var_som2.get(),
            "som_nivel3": self.var_som3.get(),
        }

        save_config(new_cfg)
        self.win.destroy()

        # Reinicia: lanca processo desacoplado (sem janela CMD) e fecha o atual
        import subprocess
        start_script = os.path.join(APP_DIR, "start.py")
        subprocess.Popen(
            [sys.executable, start_script],
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
            close_fds=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.app.quit_app()


# ---------------------------------------------------------------------------
# App principal
# ---------------------------------------------------------------------------

class AntiProcrastinacao:

    def __init__(self):
        self.config = load_config()
        self.ativo = True
        self._shutdown_event = threading.Event()
        self.alerting = False
        self.tray_icon: pystray.Icon | None = None
        self._last_sound_level = -1
        self._last_level3_time = 0.0
        self._config_open = False

        # Focus Score
        self.scorer = FocusScorer()

        # Smart Detection v2.0
        self.audio_tracker = AudioTracker()
        self.keystroke_counter = KeystrokeCounter()
        self.whisper_detector = WhisperDetector()
        self._last_category: int = 0
        self._last_audio_source: str = ""
        self._last_work_score: int = 0

        # Idle Resolution (popup ao voltar de idle longo)
        self._idle_was_long: bool = False
        self._idle_start_time: float = 0.0
        self._idle_popup_open: bool = False
        self._IDLE_LONG_THRESHOLD: float = 300.0  # 5 min → pede resolução

        # Pomodoro
        self.pomo_active = False
        self.pomo_start: float = 0
        self.pomo_work_sec = 50 * 60    # 50 min trabalho
        self.pomo_break_sec = 10 * 60   # 10 min pausa
        self.pomo_on_break = False
        self.pomo_paused_by_idle = False
        self.pomo_active_time = 0.0     # tempo ativo acumulado na sessao
        self.pomo_idle_time = 0.0       # tempo idle acumulado (penalidade)
        self.pomo_penalties = 0         # vezes que nivel 3 tocou na sessao

        # Data collector (SQLite + sync)
        self.collector = DataCollector()

        # Beep de confirmacao
        winsound.Beep(600, 150)
        winsound.Beep(900, 150)

        # Overlay tkinter
        self.root: tk.Tk | None = None
        self.canvas: tk.Canvas | None = None
        self._drag_data = {"x": 0, "y": 0}

    def reload_config(self, cfg: dict):
        """Aplica nova config sem reiniciar."""
        self.config = cfg

    @property
    def idle_threshold(self) -> int:
        return self.config["nivel1_seg"]

    @property
    def state(self) -> str:
        if not self.ativo:
            return "paused"
        return "alert" if self.alerting else "active"

    def toggle(self, *_):
        self.ativo = not self.ativo
        self.alerting = False
        self._update_all()

    def open_config(self, *_):
        if not self._config_open and self.root:
            self._config_open = True
            cw = ConfigWindow(self.root, self)
            cw.win.protocol("WM_DELETE_WINDOW", lambda: self._on_config_close(cw))

    def _on_config_close(self, cw):
        self._config_open = False
        cw.win.destroy()

    # -- Pomodoro -----------------------------------------------------------

    def pomo_start_session(self, *_):
        self.pomo_active = True
        self.pomo_on_break = False
        self.pomo_paused_by_idle = False
        self.pomo_start = time.time()
        self.pomo_active_time = 0.0
        self.pomo_idle_time = 0.0
        self.pomo_penalties = 0
        # Ativa monitoramento junto
        self.ativo = True
        self._update_all()

    def pomo_stop_session(self, *_):
        if not self.pomo_active:
            return
        elapsed = time.time() - self.pomo_start
        status = "completed" if elapsed >= self.pomo_work_sec else "interrupted"
        if self.pomo_penalties >= 2:
            status = "abandoned"

        # Registrar no collector pra sync com API
        self.collector.save_pomodoro(
            planned=self.pomo_work_sec,
            actual=int(elapsed),
            status=status,
            started_at=self.pomo_start,
            interruptions=self.pomo_penalties,
            afk_time=int(self.pomo_idle_time),
        )

        self.pomo_active = False
        self.pomo_on_break = False
        self.pomo_paused_by_idle = False

    def pomo_tick(self, idle_seconds: float):
        """Chamado a cada segundo pelo monitor_thread."""
        if not self.pomo_active:
            return

        elapsed = time.time() - self.pomo_start

        if not self.pomo_on_break:
            # Fase de trabalho
            if idle_seconds < self.idle_threshold:
                self.pomo_active_time += 1
                self.pomo_paused_by_idle = False
            else:
                self.pomo_idle_time += 1
                # Auto-pause se idle por muito tempo (nivel 3)
                cfg = self.config
                if idle_seconds >= cfg["nivel3_seg"] and not self.pomo_paused_by_idle:
                    self.pomo_paused_by_idle = True
                    self.pomo_penalties += 1

            # Transicao trabalho -> pausa
            if elapsed >= self.pomo_work_sec:
                self.pomo_on_break = True
                self.pomo_start = time.time()  # reset timer pra pausa
                winsound.Beep(500, 200)
                winsound.Beep(600, 200)
                winsound.Beep(700, 300)
        else:
            # Fase de pausa
            if elapsed >= self.pomo_break_sec:
                # Pausa acabou - inicia novo ciclo
                self.pomo_stop_session()
                self.pomo_start_session()

    def quit_app(self, *_):
        self._shutdown_event.set()
        self.ativo = False
        self.alerting = False
        self.collector.flush_current()
        release_single_instance()
        # Clean state file
        try:
            os.remove(os.path.join(IPC_DIR, "tracker_state.json"))
        except OSError:
            pass
        if self.tray_icon:
            try:
                self.tray_icon.stop()
            except Exception:
                pass
        if self.root:
            try:
                self.root.after(0, self.root.destroy)
            except Exception:
                pass
        # Force exit (daemon threads may hang)
        os._exit(0)

    # -- Overlay (tkinter) --------------------------------------------------

    def _build_overlay(self):
        self.root = tk.Tk()
        self.root.title("AntiProc")
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", 0.92)

        self.overlay_w = 340
        self.overlay_h = 48

        sw, sh = get_screen_size()
        x = (sw - self.overlay_w) // 2
        y = sh - self.overlay_h - 52
        self.root.geometry(f"{self.overlay_w}x{self.overlay_h}+{x}+{y}")

        self.canvas = tk.Canvas(
            self.root, width=self.overlay_w, height=self.overlay_h,
            highlightthickness=0, cursor="hand2",
        )
        self.canvas.pack(fill="both", expand=True)

        self.canvas.bind("<Button-1>", self._on_click_start)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_click_end)
        self.canvas.bind("<Button-3>", lambda e: self._show_context_menu(e))

        self.ctx_menu = tk.Menu(self.root, tearoff=0)
        self.ctx_menu.add_command(label="Pomodoro (50/10)", command=self._toggle_pomodoro)
        self.ctx_menu.add_command(label="Configurar...", command=self.open_config)
        self.ctx_menu.add_command(label="Stats de hoje", command=self._show_stats_popup)
        self.ctx_menu.add_separator()
        self.ctx_menu.add_command(label="Sair", command=self.quit_app)

        self._draw_overlay()
        self._tick_overlay()

    def _get_alert_level(self) -> int:
        if not self.alerting:
            return -1
        idle = get_idle_seconds()
        if idle >= self.config["nivel3_seg"]:
            return 2
        if idle >= self.config["nivel2_seg"]:
            return 1
        return 0

    def _draw_overlay(self):
        c = self.canvas
        w, h = self.overlay_w, self.overlay_h
        style = STYLES[self.state]

        c.delete("all")
        c.create_rectangle(0, 0, w, h, fill=style["bg"], outline=style["border"], width=2)

        # Versao (discreto, canto superior direito)
        c.create_text(w - 6, 6, text=f"v{VERSION}", fill="#3a3a4a", font=("Segoe UI", 7), anchor="ne")

        # Bolinha de status
        dot_x, dot_y = 20, h // 2
        dot_r = 8
        c.create_oval(
            dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r,
            fill=style["dot"], outline="",
        )

        # Pomodoro info (right side)
        if self.pomo_active:
            elapsed = time.time() - self.pomo_start
            if self.pomo_on_break:
                remaining = max(0, self.pomo_break_sec - elapsed)
                pomo_label = "PAUSA"
                pomo_color = "#3b82f6"
            else:
                remaining = max(0, self.pomo_work_sec - elapsed)
                pomo_label = "FOCO"
                pomo_color = "#f59e0b" if not self.pomo_paused_by_idle else "#ef4444"
            pm, ps = divmod(int(remaining), 60)
            pomo_text = f"{pomo_label} {pm:02d}:{ps:02d}"
            if self.pomo_penalties > 0:
                pomo_text += f" [{self.pomo_penalties}x]"

            c.create_text(w - 14, h // 2, text=pomo_text,
                          fill=pomo_color, font=("Consolas", 11, "bold"), anchor="e")

        # Helpers para overlay
        stats = self.collector.get_today_stats()
        active_m = stats["active_seconds"] // 60
        ah, am = divmod(active_m, 60)
        ws = self._last_work_score
        cat = self._last_category
        cat_colors = {2: "#4ade80", 1: "#86efac", 0: "#9ca3af", -1: "#fbbf24", -2: "#f87171"}
        cat_color = cat_colors.get(cat, "#9ca3af")

        if not self.ativo:
            c.create_text(38, h // 2 - 5, text="SOM PAUSADO",
                          fill=style["text"], font=("Segoe UI", 11, "bold"), anchor="w")
            c.create_text(38, h // 2 + 10,
                          text=f"Hoje: {ah}h{am:02d}min  |  Work: {ws}%",
                          fill="#666666", font=("Segoe UI", 8), anchor="w")
            if not self.pomo_active:
                c.create_text(w - 14, h // 2, text="coletando...",
                              fill="#4a5568", font=("Segoe UI", 9), anchor="e")
        else:
            idle = get_idle_seconds()
            mins, secs = divmod(int(idle), 60)
            timer_text = f"{mins:01d}:{secs:02d}"

            if self.alerting:
                level = self._get_alert_level()

                c.create_text(38, h // 2, text=style["label"],
                              fill=style["text"], font=("Segoe UI", 11, "bold"), anchor="w")

                # Barrinhas de nivel
                bar_x = w - 100
                for i in range(3):
                    color = style["dot"] if i <= level else "#444444"
                    c.create_rectangle(
                        bar_x + i * 16, h // 2 - 5,
                        bar_x + i * 16 + 12, h // 2 + 5,
                        fill=color, outline="",
                    )

                c.create_text(w - 14, h // 2, text=timer_text,
                              fill=style["text"], font=("Consolas", 14, "bold"), anchor="e")
            else:
                # Linha superior: status + tempo ativo
                c.create_text(38, h // 2 - 7, text="MONITORANDO",
                              fill=style["text"], font=("Segoe UI", 10, "bold"), anchor="w")
                c.create_text(38, h // 2 + 8,
                              text=f"Hoje: {ah}h{am:02d}min  |  Work: {ws}%",
                              fill=cat_color, font=("Segoe UI", 8), anchor="w")

                # Barra de progresso (idle)
                threshold = self.config["nivel1_seg"]
                progress = min(idle / threshold, 1.0) if threshold > 0 else 0
                bar_y = h - 4
                bar_w = w - 4
                c.create_rectangle(2, bar_y, bar_w, h - 1, fill="#2a2a2a", outline="")
                bar_color = "#22c55e" if progress < 0.7 else "#f59e0b" if progress < 0.9 else "#ef4444"
                if progress > 0:
                    c.create_rectangle(2, bar_y, 2 + (bar_w - 2) * progress, h - 1,
                                       fill=bar_color, outline="")

                c.create_text(w - 14, h // 2 - 7, text=timer_text,
                              fill="#9ca3af", font=("Consolas", 12), anchor="e")

    def _tick_overlay(self):
        if self._shutdown_event.is_set():
            return
        self._draw_overlay()
        self.root.after(300, self._tick_overlay)

    # -- Drag ---------------------------------------------------------------

    def _on_click_start(self, event):
        self._drag_data["x"] = event.x
        self._drag_data["y"] = event.y
        self._drag_data["moved"] = False

    def _on_drag(self, event):
        dx = event.x - self._drag_data["x"]
        dy = event.y - self._drag_data["y"]
        if abs(dx) > 3 or abs(dy) > 3:
            self._drag_data["moved"] = True
        x = self.root.winfo_x() + dx
        y = self.root.winfo_y() + dy
        self.root.geometry(f"+{x}+{y}")

    def _on_click_end(self, event):
        if not self._drag_data.get("moved", False):
            self.toggle()

    def _toggle_pomodoro(self):
        if self.pomo_active:
            self.pomo_stop_session()
        else:
            self.pomo_start_session()

    def _show_context_menu(self, event):
        # Atualiza label do Pomodoro no menu
        label = "Parar Pomodoro" if self.pomo_active else "Pomodoro (50/10)"
        self.ctx_menu.entryconfig(0, label=label)
        self.ctx_menu.post(event.x_root, event.y_root)

    def _show_stats_popup(self):
        stats = self.collector.get_today_stats()
        pending = self.collector.get_pending_count()
        active_h, active_m = divmod(stats["active_seconds"] // 60, 60)
        afk_h, afk_m = divmod(stats["afk_seconds"] // 60, 60)

        msg = (
            f"Hoje ({stats['date']})\n\n"
            f"Tempo ativo:  {active_h}h {active_m}min\n"
            f"Tempo idle:   {afk_h}h {afk_m}min\n\n"
            f"Alertas Nivel 1: {stats['alerts_l1']}\n"
            f"Alertas Nivel 2: {stats['alerts_l2']}\n"
            f"Alertas Nivel 3: {stats['alerts_l3']}\n\n"
            f"Pendentes sync: {pending}"
        )
        from tkinter import messagebox
        messagebox.showinfo("Stats de Hoje", msg)

    # -- Tray icon ----------------------------------------------------------

    def _update_tray(self):
        if not self.tray_icon:
            return
        icons = {"paused": ICON_PAUSED, "active": ICON_ACTIVE, "alert": ICON_ALERT}
        titles = {
            "paused": "FocusTracker v1.0: PAUSADO",
            "active": "FocusTracker v1.0: Monitorando",
            "alert": "FocusTracker v1.0: MEXE ESSE MOUSE!",
        }
        self.tray_icon.icon = icons[self.state]
        self.tray_icon.title = titles[self.state]

    def _update_all(self):
        self._update_tray()

    def _run_tray(self):
        def get_toggle_text(item):
            return "Desativar" if self.ativo else "Ativar"

        menu = pystray.Menu(
            pystray.MenuItem(get_toggle_text, self.toggle, default=True),
            pystray.MenuItem("Configurar", lambda *_: self.root.after(0, self.open_config)),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Sair", self.quit_app),
        )
        initial_icon = ICON_ACTIVE if self.ativo else ICON_PAUSED
        initial_title = "FocusTracker v1.0: Monitorando" if self.ativo else "FocusTracker v1.0: PAUSADO"
        self.tray_icon = pystray.Icon("anti-procrastinacao", initial_icon, initial_title, menu)
        self.tray_icon.run()

    # -- Som ----------------------------------------------------------------

    def _play_wav(self, filename: str):
        path = os.path.join(SOUNDS_DIR, filename)
        if os.path.exists(path):
            try:
                winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_NODEFAULT)
            except Exception:
                winsound.Beep(400, 300)

    # -- Threads ------------------------------------------------------------

    def _alert_thread(self):
        while not self._shutdown_event.is_set():
            if self.ativo and self.alerting:
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

                self._shutdown_event.wait(timeout=1.0)
            else:
                if self._last_sound_level >= 0:
                    self._last_sound_level = -1
                    self._last_level3_time = 0.0
                self._shutdown_event.wait(timeout=0.5)

    def _monitor_thread(self):
        while not self._shutdown_event.is_set():
            try:
                idle = get_idle_seconds()
                window = get_active_window()
                app_name = window["app_name"]
                window_title = window["window_title"]

                # 1. Classify app/site
                classification = classify(app_name, window_title)
                category = classification["category"]

                # 2. Audio detection
                audio_signal = self.audio_tracker.get_distraction_signal(app_name, window_title)
                audio_source = audio_signal["audio_source"]
                audio_distraction = audio_signal["is_distraction"]

                # 3. Keystroke rate
                self.keystroke_counter.tick()
                kpm = self.keystroke_counter.per_minute

                # 4. Whisper detection
                whisper = self.whisper_detector.is_active

                # 5. Work score
                work_score = calculate_work_score(
                    category=category,
                    whisper_active=whisper,
                    audio_distraction=audio_distraction,
                    keystrokes_per_min=kpm,
                    focus_stability=self.scorer.score,
                )

                # Cache for overlay
                self._last_category = category
                self._last_audio_source = audio_source
                self._last_work_score = work_score

                # ALWAYS collect data, regardless of sound pause
                is_afk = idle >= self.idle_threshold
                alert_level = 0
                if is_afk:
                    cfg = self.config
                    if idle >= cfg["nivel3_seg"]:
                        alert_level = 3
                    elif idle >= cfg["nivel2_seg"]:
                        alert_level = 2
                    elif idle >= cfg["nivel1_seg"]:
                        alert_level = 1

                # Idle Resolution: detecta volta de ausência longa
                if is_afk:
                    if not self._idle_was_long:
                        if self._idle_start_time == 0.0:
                            self._idle_start_time = time.time()
                        elif (time.time() - self._idle_start_time) >= self._IDLE_LONG_THRESHOLD:
                            self._idle_was_long = True
                else:
                    if self._idle_was_long and not self._idle_popup_open:
                        idle_duration = time.time() - self._idle_start_time
                        self._trigger_idle_resolution(idle_duration)
                    self._idle_was_long = False
                    self._idle_start_time = 0.0

                self.collector.record_state(
                    is_afk=is_afk,
                    alert_level=alert_level,
                    app_name=app_name,
                    window_title=window_title,
                    focus_score=self.scorer.score,
                    productivity_category=category,
                    audio_source=audio_source,
                    keystroke_rate=int(kpm),
                    whisper_active=whisper,
                    work_score=work_score,
                )

                # Focus Score tick
                self.scorer.tick(app_name, is_afk)

                # Pomodoro tick
                self.pomo_tick(idle)

                # Sound alerts ONLY when active
                if self.ativo:
                    was = self.alerting
                    self.alerting = is_afk
                    if was != self.alerting:
                        self._update_tray()
                else:
                    self.alerting = False

                # Write IPC state file for external readers
                self._write_state(idle, window, category, audio_source, work_score, whisper)

            except Exception:
                pass

            self._shutdown_event.wait(timeout=1.0)

    def _write_state(self, idle: float, window: dict,
                     category: int = 0, audio_source: str = "",
                     work_score: int = 0, whisper: bool = False):
        """Write current state to JSON file for IPC."""
        state = {
            "pid": os.getpid(),
            "version": VERSION,
            "timestamp": time.time(),
            "idle_seconds": round(idle, 1),
            "is_afk": idle >= self.idle_threshold,
            "alerting": self.alerting,
            "sound_paused": not self.ativo,
            "app_name": window.get("app_name", ""),
            "window_title": window.get("window_title", ""),
            "focus_score": self.scorer.score,
            "switches_per_minute": round(self.scorer.switches_per_minute, 1),
            "productivity_category": category,
            "audio_source": audio_source,
            "keystroke_rate": int(self.keystroke_counter.per_minute),
            "whisper_active": whisper,
            "work_score": work_score,
            "pomodoro": {
                "active": self.pomo_active,
                "on_break": self.pomo_on_break,
                "elapsed": round(time.time() - self.pomo_start) if self.pomo_active else 0,
                "work_sec": self.pomo_work_sec,
                "break_sec": self.pomo_break_sec,
                "penalties": self.pomo_penalties,
            },
            "today_stats": self.collector.get_today_stats(),
        }
        try:
            state_file = os.path.join(IPC_DIR, "tracker_state.json")
            tmp = state_file + ".tmp"
            with open(tmp, "w") as f:
                json.dump(state, f)
            os.replace(tmp, state_file)
        except Exception:
            pass

    def _trigger_idle_resolution(self, idle_duration: float):
        """Abre popup perguntando o que o usuário estava fazendo durante a ausência."""
        if not self.root:
            return
        self._idle_popup_open = True
        self.root.after(0, lambda: self._show_idle_popup(idle_duration))

    def _show_idle_popup(self, idle_duration: float):
        """Popup tkinter para resolução de idle longo."""
        BG = "#1e1e2e"
        FG = "#e0e0e0"
        ACCENT = "#7c3aed"
        INPUT_BG = "#2a2a3e"

        idle_ended_at = time.time()
        idle_started_at = idle_ended_at - idle_duration

        mins = int(idle_duration / 60)
        duration_label = f"{mins} min" if mins < 60 else f"{mins // 60}h {mins % 60}min"

        popup = tk.Toplevel(self.root)
        popup.title("O que você estava fazendo?")
        popup.configure(bg=BG)
        popup.attributes("-topmost", True)
        popup.resizable(False, False)
        popup.geometry("380x330")

        sw, sh = get_screen_size()
        popup.geometry(f"+{(sw - 380) // 2}+{(sh - 330) // 2}")

        tk.Label(
            popup, text=f"Você ficou ausente por {duration_label}.",
            font=("Segoe UI", 11, "bold"), bg=BG, fg=FG,
        ).pack(pady=(16, 2))
        tk.Label(
            popup, text="O que estava fazendo?",
            font=("Segoe UI", 10), bg=BG, fg="#888888",
        ).pack(pady=(0, 8))

        btn_frame = tk.Frame(popup, bg=BG)
        btn_frame.pack(fill="x", padx=20)

        options = [
            ("away_working",  "Trabalhando fora do PC", "#166534", "#4ade80"),
            ("break",         "Pausa (café, banheiro)", "#1e3a5f", "#60a5fa"),
            ("procrastinating", "Procrastinando",        "#7c1d1d", "#f87171"),
            ("discarded",     "Descartar",               "#333333", "#9ca3af"),
        ]

        # Campo de nota livre
        tk.Label(
            popup, text="Nota (opcional — o que estava fazendo de verdade):",
            font=("Segoe UI", 9), bg=BG, fg="#888888",
        ).pack(padx=20, anchor="w", pady=(8, 2))

        note_var = tk.StringVar()
        note_entry = tk.Entry(
            popup, textvariable=note_var,
            font=("Segoe UI", 10), bg=INPUT_BG, fg=FG,
            insertbackground=FG, relief="flat",
        )
        note_entry.pack(fill="x", padx=20, pady=(0, 10), ipady=6)
        note_entry.focus_set()

        def resolve(resolution_key: str):
            note = note_var.get().strip() or None
            popup.destroy()
            self._idle_popup_open = False
            # Envia para o backend em thread separada
            threading.Thread(
                target=self._sync_idle_resolution,
                args=(idle_started_at, idle_ended_at, int(idle_duration), resolution_key, note),
                daemon=True,
            ).start()

        for key, label, bg_color, fg_color in options:
            tk.Button(
                btn_frame, text=label, font=("Segoe UI", 10),
                bg=bg_color, fg=fg_color, activebackground=bg_color,
                relief="flat", pady=5, cursor="hand2",
                command=lambda k=key: resolve(k),
            ).pack(fill="x", pady=2)

        def on_close():
            self._idle_popup_open = False
            popup.destroy()

        popup.protocol("WM_DELETE_WINDOW", on_close)
        # Enter confirma com "Pausa" por padrão
        popup.bind("<Return>", lambda e: resolve("break"))

    def _sync_idle_resolution(self, started_at: float, ended_at: float,
                               duration: int, resolution: str, note: str | None):
        """Envia resolução de idle para o backend via HTTP."""
        cfg = self.collector.sync_config
        if not cfg.get("enabled") or not cfg.get("jwt_token"):
            return
        try:
            from datetime import datetime, timezone
            payload = json.dumps({
                "idleStartedAt": datetime.fromtimestamp(started_at, tz=timezone.utc).isoformat(),
                "idleEndedAt": datetime.fromtimestamp(ended_at, tz=timezone.utc).isoformat(),
                "durationSeconds": duration,
                "resolution": resolution,
                "note": note,
            }).encode("utf-8")

            url = cfg["api_url"].rstrip("/") + "/productivity/idle-resolutions"
            req = urllib.request.Request(
                url, data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {cfg['jwt_token']}",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception:
            pass

    # -- Run ----------------------------------------------------------------

    def run(self):
        self.audio_tracker.start()
        threading.Thread(target=self._monitor_thread, daemon=True).start()
        threading.Thread(target=self._alert_thread, daemon=True).start()
        threading.Thread(target=self._run_tray, daemon=True).start()
        self.collector.start_sync_loop()

        self._build_overlay()
        self.root.mainloop()


# ---------------------------------------------------------------------------
# Single Instance (Named Mutex + PID file)
# ---------------------------------------------------------------------------

_mutex_handle = None


def acquire_single_instance() -> bool:
    """Kernel-level single instance via Named Mutex (auto-released on crash)."""
    global _mutex_handle
    os.makedirs(IPC_DIR, exist_ok=True)

    if HAS_WIN32:
        _mutex_handle = win32event.CreateMutex(None, False, "Global\\FocusTrackerMutex")
        if win32api.GetLastError() == winerror.ERROR_ALREADY_EXISTS:
            win32api.CloseHandle(_mutex_handle)
            _mutex_handle = None
            return False
    else:
        # Fallback: PID file check
        pid_file = os.path.join(IPC_DIR, "monitor.pid")
        if os.path.exists(pid_file):
            try:
                with open(pid_file) as f:
                    old_pid = int(f.read().strip())
                kernel32 = ctypes.windll.kernel32
                handle = kernel32.OpenProcess(0x00100000, False, old_pid)
                if handle:
                    kernel32.CloseHandle(handle)
                    return False
            except (ValueError, FileNotFoundError):
                pass

    # Write PID file (for identification, not locking)
    pid_file = os.path.join(IPC_DIR, "monitor.pid")
    with open(pid_file, "w") as f:
        f.write(str(os.getpid()))
    return True


def release_single_instance():
    """Release mutex and clean PID file."""
    global _mutex_handle
    if HAS_WIN32 and _mutex_handle:
        try:
            win32event.ReleaseMutex(_mutex_handle)
            win32api.CloseHandle(_mutex_handle)
        except Exception:
            pass
        _mutex_handle = None
    pid_file = os.path.join(IPC_DIR, "monitor.pid")
    try:
        os.remove(pid_file)
    except OSError:
        pass


if __name__ == "__main__":
    if not acquire_single_instance():
        ctypes.windll.user32.MessageBoxW(
            0,
            "O FocusTracker ja esta rodando.\n\n"
            "Verifique a barra de tarefas.",
            "Instancia duplicada",
            0x40,
        )
        sys.exit(0)

    app = AntiProcrastinacao()
    app.run()
