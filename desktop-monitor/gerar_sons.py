"""
Gera amostras de sons WAV para o Anti-Procrastinacao.
Roda uma vez, cria os arquivos em sounds/, e abre a pasta.
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 44100
SOUNDS_DIR = os.path.join(os.path.dirname(__file__), "sounds")
os.makedirs(SOUNDS_DIR, exist_ok=True)


def save_wav(filename: str, samples: list[float], sample_rate: int = SAMPLE_RATE):
    """Salva lista de floats [-1, 1] como WAV 16-bit."""
    path = os.path.join(SOUNDS_DIR, filename)
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for s in samples:
            s = max(-1.0, min(1.0, s))
            f.writeframes(struct.pack("<h", int(s * 32767 * 0.7)))
    print(f"  Criado: {filename}")
    return path


def sine(freq: float, duration: float, volume: float = 1.0) -> list[float]:
    """Gera onda senoidal pura."""
    n = int(SAMPLE_RATE * duration)
    return [volume * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]


def sine_decay(freq: float, duration: float, decay: float = 3.0, volume: float = 1.0) -> list[float]:
    """Senoidal com decay exponencial (simula sino/chime)."""
    n = int(SAMPLE_RATE * duration)
    return [
        volume * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) * math.exp(-decay * i / n)
        for i in range(n)
    ]


def bell(freq: float, duration: float, volume: float = 1.0) -> list[float]:
    """Som de sino com harmonicos (mais rico que senoide pura)."""
    n = int(SAMPLE_RATE * duration)
    harmonics = [
        (1.0, freq, 2.5),      # fundamental
        (0.6, freq * 2.0, 3.0),  # 2a harmonica
        (0.3, freq * 3.0, 4.0),  # 3a harmonica
        (0.2, freq * 4.2, 5.0),  # inharmonica (soa metalico)
        (0.1, freq * 5.4, 6.0),  # inharmonica
    ]
    samples = [0.0] * n
    for amp, f, dec in harmonics:
        for i in range(n):
            samples[i] += amp * volume * math.sin(2 * math.pi * f * i / SAMPLE_RATE) * math.exp(-dec * i / n)
    # Normalizar
    peak = max(abs(s) for s in samples) or 1.0
    return [s / peak for s in samples]


def chime(freq: float, duration: float, volume: float = 1.0) -> list[float]:
    """Chime cristalino (harmonicos altos, decay rapido)."""
    n = int(SAMPLE_RATE * duration)
    harmonics = [
        (1.0, freq, 3.0),
        (0.8, freq * 2.01, 4.0),
        (0.5, freq * 3.03, 5.5),
        (0.3, freq * 5.0, 7.0),
    ]
    samples = [0.0] * n
    for amp, f, dec in harmonics:
        for i in range(n):
            samples[i] += amp * volume * math.sin(2 * math.pi * f * i / SAMPLE_RATE) * math.exp(-dec * i / n)
    peak = max(abs(s) for s in samples) or 1.0
    return [s / peak for s in samples]


def concat(*parts) -> list[float]:
    """Concatena listas de samples."""
    result = []
    for p in parts:
        result.extend(p)
    return result


def silence(duration: float) -> list[float]:
    return [0.0] * int(SAMPLE_RATE * duration)


def mix(a: list[float], b: list[float]) -> list[float]:
    """Mixa dois sons (overlay)."""
    length = max(len(a), len(b))
    result = [0.0] * length
    for i in range(len(a)):
        result[i] += a[i]
    for i in range(len(b)):
        result[i] += b[i]
    peak = max(abs(s) for s in result) or 1.0
    return [s / peak for s in result]


# ---------------------------------------------------------------------------
# NIVEL 1 - Nudge (gentil, "volta ao trabalho")
# ---------------------------------------------------------------------------

print("\n=== NIVEL 1 - Sons gentis ===")

# 1A - Sino tibetano grave
save_wav("1A_sino_tibetano.wav", bell(262, 2.5))

# 1B - Chime cristalino
save_wav("1B_chime_cristalino.wav", chime(523, 1.8))

# 1C - Quinta ascendente (C4 → G4) com decay
save_wav("1C_quinta_ascendente.wav", concat(
    sine_decay(262, 0.6, decay=2.0),
    silence(0.08),
    sine_decay(392, 1.0, decay=2.0),
))

# 1D - Gota d'agua (tom alto com decay rapido)
save_wav("1D_gota_agua.wav", concat(
    sine_decay(1200, 0.08, decay=15),
    silence(0.02),
    sine_decay(800, 0.15, decay=10),
))

# 1E - Sino de mesa (ding!)
save_wav("1E_sino_mesa.wav", bell(880, 1.5, volume=0.8))

# 1F - Bowl tibetano grave (bem relaxante)
save_wav("1F_bowl_grave.wav", bell(196, 3.0))


# ---------------------------------------------------------------------------
# NIVEL 2 - Warning (mais presente, "hey, acorda")
# ---------------------------------------------------------------------------

print("\n=== NIVEL 2 - Sons de aviso ===")

# 2A - Triade maior C-E-G
save_wav("2A_triade_maior.wav", concat(
    bell(262, 0.6),
    silence(0.05),
    bell(330, 0.6),
    silence(0.05),
    bell(392, 1.0),
))

# 2B - Dois sinos
save_wav("2B_dois_sinos.wav", concat(
    bell(440, 0.8),
    silence(0.15),
    bell(523, 1.2),
))

# 2C - Xilofone ascendente
save_wav("2C_xilofone.wav", concat(
    chime(523, 0.3),
    silence(0.05),
    chime(659, 0.3),
    silence(0.05),
    chime(784, 0.5),
))

# 2D - Nudge duplo (boing boing)
save_wav("2D_nudge_duplo.wav", concat(
    sine_decay(350, 0.25, decay=4),
    silence(0.1),
    sine_decay(440, 0.4, decay=3),
))

# 2E - Alerta melodico (ascendente rapido)
save_wav("2E_alerta_melodico.wav", concat(
    bell(330, 0.4),
    silence(0.03),
    bell(392, 0.4),
    silence(0.03),
    bell(494, 0.4),
    silence(0.03),
    bell(523, 0.8),
))


# ---------------------------------------------------------------------------
# NIVEL 3 - Urgente (insistente, "PARA de procrastinar!")
# ---------------------------------------------------------------------------

print("\n=== NIVEL 3 - Sons urgentes ===")

# 3A - Pulsos rapidos (A4)
save_wav("3A_pulsos_rapidos.wav", concat(
    sine_decay(440, 0.1, decay=8),
    silence(0.06),
    sine_decay(440, 0.1, decay=8),
    silence(0.06),
    sine_decay(440, 0.1, decay=8),
    silence(0.06),
    sine_decay(440, 0.2, decay=5),
))

# 3B - Alarme musical (nao estridente)
save_wav("3B_alarme_musical.wav", concat(
    bell(523, 0.2),
    silence(0.05),
    bell(440, 0.2),
    silence(0.05),
    bell(523, 0.2),
    silence(0.05),
    bell(440, 0.2),
    silence(0.05),
    bell(523, 0.3),
))

# 3C - Marimba insistente
save_wav("3C_marimba.wav", concat(
    chime(392, 0.15),
    silence(0.03),
    chime(392, 0.15),
    silence(0.03),
    chime(523, 0.15),
    silence(0.03),
    chime(392, 0.15),
    silence(0.03),
    chime(523, 0.15),
    silence(0.03),
    chime(659, 0.4),
))

# 3D - Toque de relogio (urgente mas classico)
save_wav("3D_relogio.wav", concat(
    bell(600, 0.3),
    silence(0.1),
    bell(600, 0.3),
    silence(0.1),
    bell(600, 0.3),
    silence(0.1),
    bell(800, 0.6),
))


print(f"\n{'='*50}")
print(f"Total: sons gerados em {SOUNDS_DIR}")
print(f"{'='*50}")

# Abrir a pasta
os.startfile(SOUNDS_DIR)
