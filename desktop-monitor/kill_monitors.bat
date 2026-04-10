@echo off
echo Matando monitores anti-procrastinacao...
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%monitor.py%%' and commandline like '%%KANBA%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /PID %%i /F >nul 2>&1
    echo   Killed PID %%i
)
echo Pronto.
pause
