@echo off
setlocal enabledelayedexpansion
echo ====================================
echo  SCANNER INTELIGENTE DE PROCESSOS
echo ====================================

echo.
echo [ESCANEANDO] Verificando processos ativos...

:: Função para verificar se processo existe e matar
set "killed=0"

:: Verificar Node.js (excluindo Claude Code)
for /f "tokens=1,2" %%a in ('tasklist /fi "imagename eq node.exe" /fo table /nh 2^>nul') do (
    if "%%a" == "node.exe" (
        for /f "tokens=*" %%c in ('wmic process where "ProcessId=%%b" get CommandLine /value 2^>nul ^| find "="') do (
            echo %%c | find /i "claude" >nul
            if !errorlevel! neq 0 (
                echo [MATANDO] Node.js processo encontrado ^(PID: %%b^)
                taskkill /f /pid %%b >nul 2>&1
                set /a killed+=1
            ) else (
                echo [PROTEGIDO] Claude Code detectado ^(PID: %%b^) - nao sera morto
            )
        )
    )
)

:: Verificar npm
tasklist /fi "imagename eq npm.exe" 2>nul | find /i "npm.exe" >nul
if !errorlevel! == 0 (
    echo [MATANDO] npm processos encontrados
    taskkill /f /im npm.exe >nul 2>&1
    set /a killed+=1
)

:: Verificar Python
tasklist /fi "imagename eq python.exe" 2>nul | find /i "python.exe" >nul
if !errorlevel! == 0 (
    echo [MATANDO] Python processos encontrados
    taskkill /f /im python.exe >nul 2>&1
    set /a killed+=1
)

tasklist /fi "imagename eq pythonw.exe" 2>nul | find /i "pythonw.exe" >nul
if !errorlevel! == 0 (
    echo [MATANDO] Python (background) encontrado
    taskkill /f /im pythonw.exe >nul 2>&1
    set /a killed+=1
)

:: Verificar VSCode
tasklist /fi "imagename eq Code.exe" 2>nul | find /i "Code.exe" >nul
if !errorlevel! == 0 (
    echo [MATANDO] VSCode processos encontrados
    taskkill /f /im Code.exe >nul 2>&1
    set /a killed+=1
)

echo.
echo [ESCANEANDO] Verificando portas ocupadas...

:: Lista de portas comuns para desenvolvimento
set "ports=3000 3001 4200 4201 8000 8080 5000 5432 27017"
set "ports_killed=0"

for %%p in (!ports!) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        if "%%a" neq "" (
            echo [MATANDO] Porta %%p ocupada ^(PID: %%a^)
            taskkill /f /pid %%a >nul 2>&1
            set /a ports_killed+=1
        )
    )
)

:: Verificar processos específicos do desenvolvimento
set "dev_processes=ng.exe webpack.exe live-server.exe nodemon.exe ts-node.exe"
for %%proc in (!dev_processes!) do (
    tasklist /fi "imagename eq %%proc" 2>nul | find /i "%%proc" >nul
    if !errorlevel! == 0 (
        echo [MATANDO] %%proc encontrado
        taskkill /f /im %%proc >nul 2>&1
        set /a killed+=1
    )
)

echo.
echo ====================================
if !killed! == 0 (
    if !ports_killed! == 0 (
        echo  NENHUM PROCESSO ENCONTRADO
        echo  Ambiente ja esta limpo!
    ) else (
        echo  !ports_killed! PORTAS LIBERADAS
    )
) else (
    echo  !killed! PROCESSOS FINALIZADOS
    if !ports_killed! gtr 0 echo  !ports_killed! PORTAS LIBERADAS
)
echo ====================================

echo.
echo ====================================
echo  RELATORIO COMPLETO DE EXECUCAO
echo ====================================
if !killed! == 0 (
    if !ports_killed! == 0 (
        echo Status: AMBIENTE JA ESTAVA LIMPO
        echo Nenhum processo de desenvolvimento ativo
        echo Nenhuma porta ocupada encontrada
    ) else (
        echo Status: APENAS PORTAS LIBERADAS  
        echo Processos: 0 finalizados
        echo Portas: !ports_killed! liberadas
    )
) else (
    echo Status: LIMPEZA REALIZADA COM SUCESSO
    echo Processos finalizados: !killed!
    echo Portas liberadas: !ports_killed!
    set /a total=!killed!+!ports_killed!
    echo Total de operacoes: !total!
)
echo ====================================
echo.
echo Ambiente pronto para desenvolvimento!
echo Terminal permanece aberto para analise do relatorio.
echo.
echo Pressione qualquer tecla quando quiser fechar...
pause