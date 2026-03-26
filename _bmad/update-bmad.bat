@echo off
echo ================================
echo   BMad Method - Auto Update
echo ================================
echo.

cd /d "%USERPROFILE%\bmad-master"

echo Atualizando BMad Method...
call npx bmad-method@alpha install

echo.
echo ================================
echo   Atualizacao concluida!
echo ================================
echo.
echo Todos os projetos com symlink para bmad-master
echo agora estao atualizados automaticamente.
echo.
pause
