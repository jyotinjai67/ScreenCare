Write-Host "=== Building ScreenCare Windows Desktop Application ===" -ForegroundColor Cyan
Set-Location "D:\ScreenCare\apps\desktop"

Write-Host "Compiling Frontend (Vite)..."
npm run build:vite

Write-Host "Compiling Electron Main & Preload (TypeScript)..."
npm run build:electron

Write-Host "Packaging Executables (electron-builder)..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win --x64

Set-Location "D:\ScreenCare"
Write-Host "Windows build complete. Deliverables in D:\ScreenCare\release\windows\" -ForegroundColor Green