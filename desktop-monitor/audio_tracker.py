"""
Audio Tracker — detecta quais apps estão emitindo som via WASAPI/pycaw.

Roda em thread daemon dedicada (COM deve ser inicializado por thread no Windows).
Thread-safe: expõe apenas propriedades que leem snapshots copiados.
"""

import threading
import time
import re

try:
    from pycaw.pycaw import AudioUtilities, IAudioMeterInformation
    from comtypes import CLSCTX_ALL, CoInitialize, CoUninitialize
    HAS_PYCAW = True
except ImportError:
    HAS_PYCAW = False

# Limiar mínimo de peak para considerar que há som
PEAK_THRESHOLD = 0.01

# ---------------------------------------------------------------------------
# Regras: quais processos de áudio indicam distração
# ---------------------------------------------------------------------------

# (process_name_regex, is_distraction, label)
_AUDIO_RULES: list[tuple[re.Pattern, bool, str]] = [
    (re.compile(r"^(vivaldi|chrome|brave|msedge|firefox|opera)\.exe$", re.I), True,  "Browser (vídeo?)"),
    (re.compile(r"^spotify\.exe$",                                           re.I), False, "Spotify"),
    (re.compile(r"^(vlc|mpv|mpc-hc64?|potplayer64?)\.exe$",                 re.I), True,  "Player local"),
    (re.compile(r"^(teams|msteams|slack|zoom|discord)\.exe$",                re.I), False, "Comunicação"),
]


def _classify_audio(process_name: str) -> tuple[bool, str]:
    """Retorna (is_distraction, label) para um processo emitindo som."""
    pn = (process_name or "").strip()
    for pattern, distraction, label in _AUDIO_RULES:
        if pattern.search(pn):
            return distraction, label
    return False, pn  # processo desconhecido = não distrativo por padrão


# ---------------------------------------------------------------------------
# AudioTracker
# ---------------------------------------------------------------------------

class AudioTracker:
    """
    Monitora pico de áudio por processo em background.

    Uso:
        tracker = AudioTracker()
        tracker.start()
        ...
        signal = tracker.get_distraction_signal(app_name, window_title)
        # signal = {"audio_source": str, "is_distraction": bool}
    """

    def __init__(self, poll_interval: float = 1.5):
        self._poll_interval = poll_interval
        self._lock = threading.Lock()
        self._snapshot: list[dict] = []  # [{process_name, peak, is_emitting}]
        self._running = False
        self._thread: threading.Thread | None = None

    def start(self):
        if not HAS_PYCAW:
            return
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True, name="AudioTracker")
        self._thread.start()

    def stop(self):
        self._running = False

    # -- Thread principal -------------------------------------------------------

    def _run(self):
        """Loop que roda na thread COM dedicada."""
        try:
            CoInitialize()
        except Exception:
            pass

        while self._running:
            try:
                sources = self._poll_audio()
                with self._lock:
                    self._snapshot = sources
            except Exception:
                pass
            time.sleep(self._poll_interval)

        try:
            CoUninitialize()
        except Exception:
            pass

    def _poll_audio(self) -> list[dict]:
        """Consulta pico de áudio de cada sessão WASAPI."""
        if not HAS_PYCAW:
            return []

        results: list[dict] = []
        try:
            sessions = AudioUtilities.GetAllSessions()
            for session in sessions:
                try:
                    if session.Process is None:
                        continue
                    process_name = session.Process.name()
                    volume = session._ctl.QueryInterface(IAudioMeterInformation)
                    peak = volume.GetPeakValue()
                    results.append({
                        "process_name": process_name,
                        "peak": round(peak, 3),
                        "is_emitting": peak > PEAK_THRESHOLD,
                    })
                except Exception:
                    continue
        except Exception:
            pass
        return results

    # -- API pública ------------------------------------------------------------

    def get_audio_sources(self) -> list[dict]:
        """Retorna lista de processos emitindo som (snapshot do último poll)."""
        with self._lock:
            return [s for s in self._snapshot if s["is_emitting"]]

    def get_distraction_signal(self, active_app: str = "", window_title: str = "") -> dict:
        """
        Analisa se há áudio de distração dado o contexto atual.

        Retorna:
            {
                "audio_source": str,      # nome do processo emitindo som (ou "")
                "is_distraction": bool,   # True se for áudio distrativo
            }
        """
        sources = self.get_audio_sources()
        if not sources:
            return {"audio_source": "", "is_distraction": False}

        # Prioridade: se o app ativo está emitindo, analisar ele
        active_lower = (active_app or "").lower()
        for src in sources:
            if active_lower and src["process_name"].lower() == active_lower:
                is_dist, label = _classify_audio(src["process_name"])
                # PiP: browser ativo + som = vídeo mesmo sem title do YouTube
                pip_active = "picture in picture" in (window_title or "").lower()
                if pip_active:
                    is_dist = True
                return {"audio_source": src["process_name"], "is_distraction": is_dist}

        # App ativo não tem som — retorna o primeiro emitindo som
        dominant = max(sources, key=lambda s: s["peak"])
        is_dist, _ = _classify_audio(dominant["process_name"])
        return {"audio_source": dominant["process_name"], "is_distraction": is_dist}
