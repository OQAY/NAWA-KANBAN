# Brainstorm: Arquitetura Profissional do Monitor de Produtividade
**Data:** 2026-04-09
**Participantes:** Claude (Opus 4.6) + Gemini 3 (Deep Research)
**Consenso:** 8/10

## Decisao Principal
Manter Python para o tracker (funciona, reescrever em Go/Rust leva semanas), mas mudar COMO ele roda:
- Compilar com PyInstaller como `tracker.exe` (nao pythonw.exe)
- Named Mutex via win32event (instancia unica kernel-level)
- NSSM como Windows Service (auto-restart)
- Separar UI do tracker (2 processos)
- SQLite WAL mode

## 4 Fases de Implementacao

### Fase 1: Estabilidade AGORA
1. Compilar com PyInstaller: `pyinstaller --noconsole --name "FocusTracker" monitor.py`
2. Named Mutex: `win32event.CreateMutex(None, False, "Global\\FocusTrackerMutex")`
3. Graceful shutdown: `threading.Event()` + signal handlers
4. NSSM: instalar tracker.exe como Windows Service com auto-restart
5. SQLite WAL: `PRAGMA journal_mode=WAL;`

### Fase 2: UI Moderna
1. Remover tkinter
2. Construir overlay com Tauri (Rust + React)
3. Tauri le SQLite do tracker (WAL permite leitura concorrente)
4. ~30MB RAM vs 200MB do tkinter

### Fase 3: Logica Inteligente
1. "Thrashing Detection": switches de janela por minuto (alto = distraido)
2. Pomodoro Strict Mode: alerta se app nao-produtivo durante foco
3. Pomodoro Flow Mode: auto-detecta foco se >5min no IDE
4. Focus Score baseado em: tempo em IDE + baixo switching + streaks

### Fase 4: Enterprise + Distribuicao
1. Dados: nunca enviar titulos de janela pro backend (privacidade)
2. Managers veem apenas scores agregados
3. Inno Setup: installer que instala tracker.exe + NSSM + auto-start
4. Gamificacao: heatmap GitHub-style, streaks, stats semanais

## Pontos Criticos
- NUNCA capturar keystrokes (antivirus flageia como keylogger)
- Capturar apenas VOLUME de teclas (eventos/segundo), descartar key codes
- Threads daemon=True pra nao virar zumbi
- os._exit(0) como fallback de shutdown
- Task Scheduler NAO recomendado (UAC, clunky) - usar NSSM
