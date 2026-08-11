@echo off
REM ============================================================
REM  Dock - run the app locally (Windows)
REM  Double-click this file to start the app at localhost:5173
REM ============================================================
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies for the first time. This can take a few minutes...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Dependency install failed. Fix the error above and try again.
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo  Starting Dock. Open http://localhost:5173 in your browser.
echo  Log in at http://localhost:5173/auth to reach the console.
echo  Press Ctrl+C in this window to stop the server.
echo ============================================================
echo.
call npx vite dev --config vite.local.config.ts --port 5173
pause
