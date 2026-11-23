# Levanta MoodWave en Docker (Windows) y detecta la IP de esta computadora en la red local
# para que el certificado HTTPS sirva también desde el celular u otras computadoras.
# Uso (PowerShell, en la carpeta del proyecto):  .\start.ps1
# Si Windows bloquea el script:  powershell -ExecutionPolicy Bypass -File .\start.ps1
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$ip = $env:MOODWAVE_HOSTS
if (-not $ip) {
  $cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
  if ($cfg) { $ip = $cfg.IPv4Address[0].IPAddress }
}

# Se guarda en .env para que "docker compose up" lo recuerde la próxima vez.
$lines = @()
if (Test-Path .env) { $lines = Get-Content .env | Where-Object { $_ -notmatch '^MOODWAVE_HOSTS=' } }
if ($ip) { $lines += "MOODWAVE_HOSTS=$ip" }
Set-Content -Path .env -Value $lines -Encoding ascii

docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'docker compose falló. ¿Está abierto Docker Desktop?' }

Write-Host -NoNewline 'Esperando a que MoodWave esté listo'
for ($i = 0; $i -lt 60; $i++) {
  $state = docker inspect -f '{{.State.Health.Status}}' moodwave 2>$null
  if ($state -eq 'healthy') { break }
  Write-Host -NoNewline '.'; Start-Sleep -Seconds 2
}
Write-Host ''
$http = if ($env:MOODWAVE_PORT) { $env:MOODWAVE_PORT } else { 8080 }
$https = if ($env:MOODWAVE_HTTPS_PORT) { $env:MOODWAVE_HTTPS_PORT } else { 8443 }
Write-Host 'MoodWave está corriendo:'
Write-Host "  En esta computadora:   http://localhost:$http"
if ($ip) {
  Write-Host "  Desde la red (HTTPS):  https://${ip}:$https"
  Write-Host "  Certificado raíz para instalar en cada dispositivo: http://${ip}:$http/moodwave-ca.crt"
  Write-Host '  Si otro dispositivo no conecta, permite los puertos en el Firewall de Windows (ver README).'
} else {
  Write-Host '  No detecté tu IP de red; defínela con: $env:MOODWAVE_HOSTS="192.168.x.x"; .\start.ps1'
}
