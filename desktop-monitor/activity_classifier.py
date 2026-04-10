"""
Activity Classifier — classifica apps/sites por categoria de produtividade.

Categorias:
  +2  Muito Produtivo   (IDE, terminal, localhost)
  +1  Produtivo         (GitHub, StackOverflow, Docs, Notion, Figma)
   0  Neutro            (não classificado, Spotify, Explorer)
  -1  Distracao         (portais de notícia)
  -2  Muita Distracao   (YouTube, redes sociais, streaming)
"""

import re

# ---------------------------------------------------------------------------
# Regras de classificação
# ---------------------------------------------------------------------------

# Cada regra: (category, name_label, [(field, regex), ...])
# field = "app" | "title" | "any"
# Match por OR entre campos da mesma regra.
# Ordem importa: mais específico primeiro.

_RULES: list[tuple[int, str, list[tuple[str, str]]]] = [
    # +2 — Muito Produtivo
    (2, "IDE / Editor",       [("app", r"^(code|code - insiders|idea64|pycharm64|webstorm64|rider64|devenv|cursor)\.exe$")]),
    (2, "Terminal",           [("app", r"^(windowsterminal|powershell|cmd|wt|alacritty|wezterm|mintty|git-bash)\.exe$")]),
    (2, "localhost / DevServer", [("title", r"localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{4,5}")]),
    (2, "Figma (design work)", [("app", r"^figma\.exe$")]),
    (2, "Database Tool",      [("app", r"^(dbeaver|datagrip64|tableplus|heidisql|pgadmin4|mongosh).*\.exe$")]),
    (2, "Docker Desktop",     [("app", r"^(docker desktop|docker)\.exe$")]),

    # +1 — Produtivo
    (1, "GitHub",             [("title", r"github\.com")]),
    (1, "GitLab",             [("title", r"gitlab\.com")]),
    (1, "StackOverflow",      [("title", r"stackoverflow\.com|stackexchange\.com")]),
    (1, "Documentação",       [("title", r"docs\.|documentation|readthedocs|devdocs\.io|mdn\s|developer\.mozilla")]),
    (1, "Google Docs/Sheets", [("title", r"docs\.google\.com|sheets\.google\.com|slides\.google\.com")]),
    (1, "Notion",             [("title", r"notion\.so"), ("app", r"^notion\.exe$")]),
    (1, "Linear / Jira",      [("title", r"linear\.app|atlassian\.net|jira\.")]),
    (1, "Slack / Teams",      [("app", r"^(slack|teams|msteams)\.exe$")]),
    (1, "Gmail / Email",      [("title", r"gmail\.com|mail\.google|outlook\.com")]),
    (1, "ChatGPT / Claude",   [("title", r"chat\.openai\.com|claude\.ai|chatgpt")]),
    (1, "NPM / PyPI / Pkg",   [("title", r"npmjs\.com|pypi\.org|packagist\.org|crates\.io|pkg\.go\.dev")]),

    # -1 — Distração
    (-1, "Notícias",          [("title", r"cnn\.com|bbc\.(com|co\.uk)|g1\.globo|uol\.com|folha\.|estadao\.|nytimes\.com|theguardian\.com|reuters\.com|terra\.com\.br")]),
    (-1, "WhatsApp Web",      [("title", r"web\.whatsapp\.com|WhatsApp")]),

    # -2 — Muita Distração
    (-2, "YouTube",           [("title", r"youtube\.com|youtu\.be")]),
    (-2, "Instagram",         [("title", r"instagram\.com")]),
    (-2, "TikTok",            [("title", r"tiktok\.com")]),
    (-2, "Twitter / X",       [("title", r"twitter\.com|x\.com")]),
    (-2, "Reddit",            [("title", r"reddit\.com")]),
    (-2, "Twitch",            [("title", r"twitch\.tv")]),
    (-2, "Netflix / Streaming", [("title", r"netflix\.com|primevideo|disneyplus|hbomax|globoplay|crunchyroll")]),
    (-2, "Facebook",          [("title", r"facebook\.com")]),
]

# Compilar para não recompilar a cada chamada
_COMPILED: list[tuple[int, str, list[tuple[str, re.Pattern]]]] = []
for _cat, _label, _conds in _RULES:
    _compiled_conds = [(field, re.compile(pattern, re.IGNORECASE)) for field, pattern in _conds]
    _COMPILED.append((_cat, _label, _compiled_conds))


def classify(app_name: str, window_title: str) -> dict:
    """
    Classifica o contexto atual.

    Returns:
        {"category": int (-2 a +2), "name": str}
    """
    app = (app_name or "").lower().strip()
    title = (window_title or "").lower().strip()

    for category, label, conditions in _COMPILED:
        for field, pattern in conditions:
            target = app if field == "app" else title if field == "title" else (app + " " + title)
            if pattern.search(target):
                return {"category": category, "name": label}

    return {"category": 0, "name": "Neutro"}


# ---------------------------------------------------------------------------
# Work Score
# ---------------------------------------------------------------------------

def calculate_work_score(
    category: int,
    whisper_active: bool,
    audio_distraction: bool,
    keystrokes_per_min: float,
    focus_stability: int,
) -> int:
    """
    Computa o Work Score (0-100) baseado em múltiplos sinais.

    Pesos:
      35% — categoria app/site (-2..+2 normalizado 0..100)
      30% — Whisper ativo (ditando = trabalhando)
      15% — sem distração de áudio
      10% — taxa de digitação (0..120 KPM normalizado)
      10% — focus_stability (FocusScorer 0-100)
    """
    # Normaliza categoria de [-2,+2] para [0,100]
    cat_score = int((category + 2) / 4 * 100)  # -2→0, 0→50, +2→100

    whisper_score = 100 if whisper_active else 0

    audio_score = 0 if audio_distraction else 100

    # KPM: 120+ = máximo
    kpm_score = min(100, int(keystrokes_per_min / 120 * 100))

    focus_score = max(0, min(100, focus_stability))

    total = (
        cat_score    * 0.35
        + whisper_score * 0.30
        + audio_score   * 0.15
        + kpm_score     * 0.10
        + focus_score   * 0.10
    )
    return int(round(total))


# ---------------------------------------------------------------------------
# Productivity Pulse (fórmula RescueTime)
# ---------------------------------------------------------------------------

def calculate_pulse(
    very_productive_sec: int,
    productive_sec: int,
    neutral_sec: int,
    distracting_sec: int,
    very_distracting_sec: int,
) -> float:
    """
    Productivity Pulse: P = ((W + 2T) / (4T)) × 100

    W = soma ponderada do tempo por categoria
    T = total de segundos ativos

    Retorna float 0-100.
    """
    w = (
        very_productive_sec * 2
        + productive_sec * 1
        + neutral_sec * 0
        + distracting_sec * (-1)
        + very_distracting_sec * (-2)
    )
    total = (
        very_productive_sec
        + productive_sec
        + neutral_sec
        + distracting_sec
        + very_distracting_sec
    )
    if total == 0:
        return 0.0
    pulse = ((w + 2 * total) / (4 * total)) * 100
    return round(max(0.0, min(100.0, pulse)), 1)
