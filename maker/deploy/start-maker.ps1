# Arranca el maker en Windows (PowerShell) con reinicio automático.
# Uso:  powershell -ExecutionPolicy Bypass -File deploy\start-maker.ps1 `
#         -EnvFile "$env:USERPROFILE\.xmrp2p\maker.env" -Config "$env:USERPROFILE\.xmrp2p\maker.toml"
# Requiere que monero-wallet-rpc ya esté corriendo (ver README).
param(
  [string]$EnvFile = "$env:USERPROFILE\.xmrp2p\maker.env",
  [string]$Config = "$env:USERPROFILE\.xmrp2p\maker.toml"
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path $EnvFile)) { throw "No existe $EnvFile (copia deploy\maker.env.example)" }
if (-not (Test-Path $Config)) { throw "No existe $Config (copia maker.example.toml)" }

# Cargar los secretos en el entorno de este proceso (no quedan en el sistema).
foreach ($line in Get-Content $EnvFile) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2] }
}

while ($true) {
  & .\.venv\Scripts\python.exe -m xmrp2p_maker --config $Config run
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') el maker terminó; reinicio en 15 s (Ctrl+C para salir)"
  Start-Sleep -Seconds 15
}
