"""
Window Tracker - Captura janela ativa (app + titulo) via Windows API.
Sem dependencias externas, usa apenas ctypes.
"""

import ctypes
import ctypes.wintypes
import os
import re

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010


def get_active_window() -> dict:
    """Retorna info da janela ativa: app_name, window_title, project."""
    try:
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return {"app_name": "desktop", "window_title": "", "project": ""}

        # Window title
        length = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        title = buf.value

        # Process ID -> exe path
        pid = ctypes.wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

        app_name = "unknown"
        handle = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid.value)
        if handle:
            exe_buf = ctypes.create_unicode_buffer(260)
            psapi.GetModuleFileNameExW(handle, 0, exe_buf, 260)
            app_name = os.path.basename(exe_buf.value) if exe_buf.value else "unknown"
            kernel32.CloseHandle(handle)

        # Extrair projeto do titulo
        project = extract_project(app_name, title)

        return {
            "app_name": app_name,
            "window_title": sanitize_title(title),
            "project": project,
        }
    except Exception:
        return {"app_name": "unknown", "window_title": "", "project": ""}


def extract_project(app_name: str, title: str) -> str:
    """Extrai nome do projeto do titulo da janela."""
    app = app_name.lower()

    # VS Code: "filename - project_name - Visual Studio Code"
    if app in ("code.exe", "code - insiders.exe"):
        parts = title.split(" - ")
        if len(parts) >= 3:
            return parts[-2].strip()
        elif len(parts) == 2:
            return parts[0].strip()

    # JetBrains IDEs: "project_name – filename"
    if any(ide in app for ide in ("idea", "pycharm", "webstorm", "phpstorm", "rider")):
        parts = title.split(" \u2013 ")  # em dash
        if parts:
            return parts[0].strip()

    # Terminal/PowerShell: extrair do path se tiver
    if app in ("windowsterminal.exe", "powershell.exe", "cmd.exe"):
        # Tenta extrair diretorio do titulo
        match = re.search(r'([A-Z]:\\[^\s]+)', title)
        if match:
            path = match.group(1)
            return os.path.basename(path)

    # Browser: retorna dominio principal
    if app in ("vivaldi.exe", "chrome.exe", "firefox.exe", "msedge.exe", "brave.exe"):
        return "browser"

    return ""


def sanitize_title(title: str) -> str:
    """Remove informacoes sensiveis do titulo (senhas, tokens, etc)."""
    # Truncar titulos muito longos
    if len(title) > 200:
        title = title[:200]

    # Remover padrao de senha/token visivel
    title = re.sub(r'(password|token|secret|key)\s*[:=]\s*\S+', r'\1=***', title, flags=re.IGNORECASE)

    return title
