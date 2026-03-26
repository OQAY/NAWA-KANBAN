@echo off
:: Configura atualização automática diária do BMad
:: Cria tarefa no Task Scheduler do Windows

echo ================================
echo   BMad - Configurar Auto-Update
echo ================================
echo.

set SCRIPT_PATH=%USERPROFILE%\bmad-master\auto-update-github.py

echo Configurando tarefa agendada...
echo.
echo A tarefa vai:
echo   - Rodar todo dia as 9:00 AM
echo   - Checar atualizacoes no GitHub
echo   - Baixar e instalar automaticamente
echo   - Re-indexar no cache
echo.

:: Criar tarefa agendada
schtasks /create ^
  /tn "BMad Auto-Update" ^
  /tr "python \"%SCRIPT_PATH%\" --auto" ^
  /sc daily ^
  /st 09:00 ^
  /f

if %errorlevel% == 0 (
    echo.
    echo ✅ Auto-update configurado!
    echo.
    echo A tarefa "BMad Auto-Update" foi criada.
    echo Roda todo dia as 9:00 AM automaticamente.
    echo.
    echo Para testar agora:
    echo   python %SCRIPT_PATH% --auto
    echo.
    echo Para desabilitar:
    echo   schtasks /delete /tn "BMad Auto-Update" /f
    echo.
) else (
    echo.
    echo ❌ Erro ao criar tarefa agendada.
    echo    Execute como administrador.
    echo.
)

pause
