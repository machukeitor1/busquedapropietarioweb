@echo off
title Búsqueda por Rol CL - Web
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado. Descargalo desde https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo ERROR: fallo npm install
    pause
    exit /b 1
  )
)

echo.
echo Levantando servidor...
echo.
start "" http://localhost:3000
call npm start

echo.
echo El servidor se detuvo.
pause
