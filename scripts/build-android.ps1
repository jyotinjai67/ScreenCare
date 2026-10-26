Write-Host "=== Building ScreenCare Android Package (APK) ===" -ForegroundColor Cyan
$env:ANDROID_HOME = 'D:\ScreenCare\tools\android-sdk'
$env:ANDROID_SDK_ROOT = 'D:\ScreenCare\tools\android-sdk'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'

Set-Location "D:\ScreenCare\apps\android"
& "D:\ScreenCare\tools\gradle-8.5\bin\gradle.bat" assembleRelease

$outApk = "D:\ScreenCare\apps\android\app\build\outputs\apk\release\app-release.apk"
$destApk = "D:\ScreenCare\release\android\ScreenCare-Android.apk"

if (Test-Path $outApk) {
    Copy-Item $outApk $destApk -Force
    Write-Host "Android build complete. APK saved to $destApk" -ForegroundColor Green
} else {
    Write-Host "APK build artifact not found at $outApk" -ForegroundColor Red
}
Set-Location "D:\ScreenCare"