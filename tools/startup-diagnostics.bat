@echo off
setlocal
chcp 65001 >nul
set "SCRIPT_DIR=%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%startup-diagnostics.ps1"
if errorlevel 1 (
  echo.
  echo 诊断工具执行失败，请把屏幕上的错误信息截图发给技术支持。
)

echo.
pause
