# ============================================================
#  Dock - run the app locally (PowerShell)
#  Right-click > Run with PowerShell, or:  ./run-local.ps1
# ============================================================
Set-Location -Path $PSScriptRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies for the first time. This can take a few minutes..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Dependency install failed. Fix the error above and try again." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
  }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Starting Dock. Open http://localhost:5173 in your browser." -ForegroundColor Cyan
Write-Host " Log in at http://localhost:5173/auth to reach the console." -ForegroundColor Cyan
Write-Host " Press Ctrl+C to stop the server." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

npx vite dev --config vite.local.config.ts --port 5173
