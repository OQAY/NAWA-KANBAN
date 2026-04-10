"""Lanca monitor.py como processo independente. Mata apenas o monitor antigo (por PID file)."""
import subprocess, sys, os

app_dir = os.path.dirname(os.path.abspath(__file__))
script = os.path.join(app_dir, "monitor.py")
pid_file = os.path.join(app_dir, "data", "monitor.pid")

# Matar APENAS o monitor antigo (pelo PID file), nao outros processos
if os.path.exists(pid_file):
    try:
        with open(pid_file) as f:
            old_pid = int(f.read().strip())
        os.kill(old_pid, 9)
        print(f"Monitor antigo (PID {old_pid}) finalizado")
    except (ValueError, ProcessLookupError, PermissionError, OSError):
        pass

# Lancar novo
proc = subprocess.Popen(
    f'start "" /min "{sys.executable}" "{script}"',
    shell=True,
    cwd=app_dir,
)
print(f"Monitor lancado")
