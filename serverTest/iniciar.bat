@echo off
rem Arranca el servidor local y abre la web. Cierra esta ventana para parar el servidor.
cd /d "%~dp0"
set PUERTO=8080
rem Abre el navegador 2 segundos despues, cuando el servidor ya esta listo
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PUERTO%/web/index.html"

rem Comprueba que Python funciona de verdad (el atajo de la Microsoft Store existe pero no ejecuta nada)
python --version >nul 2>nul
if %errorlevel%==0 (
  python servidor.py %PUERTO%
  goto :fin
)
py --version >nul 2>nul
if %errorlevel%==0 (
  py servidor.py %PUERTO%
  goto :fin
)
rem Sin Python: PowerShell viene con Windows
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Puerto %PUERTO%
:fin
pause
