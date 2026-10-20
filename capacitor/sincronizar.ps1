# Copia la web (carpeta web/) a capacitor/www (la app Android es una copia de la web).
# Uso (desde cualquier carpeta):  powershell -File capacitor\sincronizar.ps1   y después:  npx cap sync android
# - Copia web/ entera (HTML, css/, js/, i18n/) a www/.
# - La colección inicial de la app sale de data/juegos.js -> www/data/semilla.js (la web va sin juegos).
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$www = Join-Path $PSScriptRoot "www"
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
Copy-Item (Join-Path $raiz "web") $www -Recurse
New-Item -ItemType Directory -Force (Join-Path $www "data") | Out-Null
Copy-Item (Join-Path $raiz "data\juegos.js") (Join-Path $www "data\semilla.js") -Force
Write-Host "capacitor\www actualizado desde web/."
