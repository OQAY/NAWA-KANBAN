# Instalar FocusTracker como Windows Service via NSSM
# Executar como Administrador!

$exePath = "C:\Users\Oqay\Documents\GITHUB\OQAY\aa-PRO\IA - KANBA\desktop-monitor\FocusTracker.exe"
$appDir = "C:\Users\Oqay\Documents\GITHUB\OQAY\aa-PRO\IA - KANBA\desktop-monitor"
$serviceName = "FocusTracker"

# Remover servico antigo se existir
nssm stop $serviceName 2>$null
nssm remove $serviceName confirm 2>$null

# Instalar
nssm install $serviceName $exePath
nssm set $serviceName AppDirectory $appDir
nssm set $serviceName DisplayName "FocusTracker - Productivity Monitor"
nssm set $serviceName Description "Monitors desktop activity for productivity tracking"
nssm set $serviceName Start SERVICE_AUTO_START
nssm set $serviceName ObjectName LocalSystem
nssm set $serviceName Type SERVICE_INTERACTIVE_PROCESS

# Configurar auto-restart
nssm set $serviceName AppExit Default Restart
nssm set $serviceName AppRestartDelay 3000

# Stdout/stderr logs
nssm set $serviceName AppStdout "$appDir\data\service_stdout.log"
nssm set $serviceName AppStderr "$appDir\data\service_stderr.log"
nssm set $serviceName AppStdoutCreationDisposition 4
nssm set $serviceName AppStderrCreationDisposition 4
nssm set $serviceName AppRotateFiles 1
nssm set $serviceName AppRotateBytes 1048576

# Iniciar
nssm start $serviceName

Write-Host ""
Write-Host "FocusTracker Service instalado e iniciado!" -ForegroundColor Green
Write-Host "  Auto-restart: SIM (3s delay)"
Write-Host "  Auto-start: SIM (com Windows)"
Write-Host ""
Get-Service $serviceName | Format-List Status, StartType, DisplayName
