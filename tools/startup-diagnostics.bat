@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0startup-diagnostics.ps1"
if errorlevel 1 echo Diagnostic failed. Please send the screen to support.

pause
