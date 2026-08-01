@echo off
setlocal
title 心理老师工作台
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo 未检测到 Node.js / npm，无法启动工作台。
  echo 请先安装 Node.js 的长期支持版，然后重新双击本文件。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo 正在准备首次运行所需的本地依赖...
  call npm install
  if errorlevel 1 (
    echo.
    echo 依赖安装未完成，请检查网络连接后重试。
    pause
    exit /b 1
  )
)

echo.
echo 正在启动心理老师工作台...
echo 关闭此窗口即可停止本地服务。
call npm run dev -- --host 127.0.0.1 --open

endlocal
