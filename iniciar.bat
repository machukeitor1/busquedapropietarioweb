@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado. Descargalo desde https://nodejs.org
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm install
if errorlevel 1 (
  echo ERROR: fallo npm install
  pause
  exit /b 1
)

echo.
echo Levantando servidor en http://localhost:4000
echo (Ctrl+C para detener)
set PORT=4000
call npm start
pause
