param(
    [string]$ReleaseDir = "D:\ScreenCare\release"
)

Write-Host "=== Generating SHA-256 Checksums for ScreenCare Release Artifacts ===" -ForegroundColor Cyan
$checksumFile = "$ReleaseDir\CHECKSUMS.sha256"
$checksumLines = @()

$artifacts = @(
    "$ReleaseDir\windows\ScreenCare-Setup.exe",
    "$ReleaseDir\windows\ScreenCare.exe",
    "$ReleaseDir\android\ScreenCare-Android.apk"
)

foreach ($art in $artifacts) {
    if (Test-Path $art) {
        $hash = (Get-FileHash -Path $art -Algorithm SHA256).Hash
        $sizeMB = [math]::Round((Get-Item $art).Length / 1MB, 2)
        $relName = [System.IO.Path]::GetFileName($art)
        $checksumLines += "$hash  $relName"
        Write-Host "Artifact: $relName" -ForegroundColor Green
        Write-Host "  Size:   $sizeMB MB"
        Write-Host "  SHA256: $hash"
    } else {
        Write-Host "Missing expected artifact: $art" -ForegroundColor Yellow
    }
}

if ($checksumLines.Count -gt 0) {
    [System.IO.File]::WriteAllLines($checksumFile, $checksumLines, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Saved checksums to $checksumFile" -ForegroundColor Cyan
}