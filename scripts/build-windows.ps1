$ErrorActionPreference = "Stop"
Write-Host "=== Building ScreenCare Windows Desktop Application ===" -ForegroundColor Cyan
$root = Split-Path -Parent $PSScriptRoot

# A running ScreenCare holds the single-instance lock (a newly launched build would just focus the old
# process) and can lock files in release\windows. Refuse to build/test while it is running.
$running = Get-Process -Name "ScreenCare" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "ScreenCare is running (PID $($running.Id -join ', ')). Exit it from the tray ('Stop Application & Exit') and re-run." -ForegroundColor Yellow
    exit 1
}

Set-Location $root
Write-Host "Running automated tests and type checks..."
npm test; if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
npm run typecheck; if ($LASTEXITCODE -ne 0) { throw "Type check failed" }

Set-Location "$root\apps\desktop"
Write-Host "Cleaning previous build output and compiling renderer (Vite) + Electron main/preload (TypeScript)..."
npm run build; if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "Packaging Executables (electron-builder)..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win --x64 --publish never; if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Set-Location $root
Write-Host "Verifying packaged app matches current source..."
node scripts/verify-release.js; if ($LASTEXITCODE -ne 0) { throw "Release verification failed" }

powershell -ExecutionPolicy Bypass -File "$root\scripts\generate-checksums.ps1" -ReleaseDir "$root\release"
Write-Host "Windows build complete. Deliverables in $root\release\windows\" -ForegroundColor Green
