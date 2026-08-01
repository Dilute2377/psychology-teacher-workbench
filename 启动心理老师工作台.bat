@echo off
setlocal
title Psychology Teacher Workbench
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js / npm was not found.
  echo Install the Node.js LTS release, then open this launcher again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo Preparing local dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation did not finish. Check your network and try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting the Psychology Teacher Workbench...
echo Close this window to stop the local service.
call npm run dev -- --host 127.0.0.1 --open

endlocal
