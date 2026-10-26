# ScreenCare — Secure Cross-Platform Screen Health & Wellness Application

**ScreenCare** is an attractive, production-quality, local-first application designed to protect computer and mobile users from digital eye strain (asthenopia), musculoskeletal fatigue, and static posture stiffness.

Developed for **Windows 10/11** and **Android**, ScreenCare coordinates gentle, scientifically backed reminders:
- **20-20-20 Eye Break Rule:** Every 20 minutes of active screen time, look 20 feet (6m) away for 20 seconds.
- **Posture & Neck Stretch:** Every 45 minutes, guided shoulder rolls and cervical spine decompression.
- **Stand Up & Reset:** Every 60 minutes, stand up and reactivate leg and hip flexor circulation.
- **Walking Refresh:** Every 90 minutes, a 2–3 minute walking stroll away from screens.
- **Ergonomic Viewing Distance:** Sit back comfortably with screen at arm's length (50–70 cm).

---

## 1. Release Deliverables

All compiled release artifacts are organized in `D:\ScreenCare\release\`:

| Deliverable | Platform | File Path | SHA-256 Checksum |
|:---|:---:|:---|:---|
| **Windows Installer** | Windows 10/11 | [`release/windows/ScreenCare-Setup.exe`](file:///D:/ScreenCare/release/windows/ScreenCare-Setup.exe) | `C8AEB466459C40EF21F69A2658AF9644108F61A5421F58F4905CDBD019DD7F20` |
| **Windows Standalone** | Windows 10/11 | [`release/windows/ScreenCare.exe`](file:///D:/ScreenCare/release/windows/ScreenCare.exe) | `918003E02092F6CA6E1D31D9F5DC8D3CFC214F2A2E7BEE3485654AC1B7700703` |
| **Android Package** | Android 8.0+ | [`release/android/ScreenCare-Android.apk`](file:///D:/ScreenCare/release/android/ScreenCare-Android.apk) | `2E38F3AC8256778AE67226BC23F23F32CA3B0666321E78F90D5C34917A2E8CAE` |

*Cryptographic checksums are recorded in [`release/CHECKSUMS.sha256`](file:///D:/ScreenCare/release/CHECKSUMS.sha256).*

---

## 2. Project Directory Structure

```text
D:\ScreenCare\
├── apps\
│   ├── desktop\            # Electron + React + TypeScript desktop app
│   │   ├── src\main\       # Hardened Electron Main process (tray, idle monitor, IPC)
│   │   ├── src\preload\    # Context-isolated safe bridge
│   │   └── src\renderer\   # React modern wellness UI & break overlays
│   └── android\            # Android Native Application (Kotlin + Material 3)
│       └── app\src\main\   # Activities, BroadcastReceivers, UsageTracker
├── shared\                 # Unified reminder engine, algorithms, stretch library
├── assets\                 # App icons, vectors, and branding
├── tests\                  # Automated test suite (9 unit tests)
├── security\               # Security audit report (SECURITY_REPORT.md)
├── documentation\          # Prerequisites and architecture docs
├── reports\                # Test execution report (TEST_REPORT.md)
├── scripts\                # Build, test, checksum, and audit scripts
├── release\
│   ├── windows\            # ScreenCare-Setup.exe & ScreenCare.exe
│   └── android\            # ScreenCare-Android.apk
├── tools\                  # Provisioned local Android SDK 34 & Gradle 8.5
├── package.json            # Root workspace config
└── README.md
```

---

## 3. Security & Privacy Guarantees

ScreenCare enforces strict privacy and system integrity principles:
1. **Least Privilege Execution:** Runs under standard user rights (`asInvoker`). Never requests administrative elevation or Android root access.
2. **Zero Telemetry / Zero Cloud Backend:** 100% local-first. Content Security Policy enforces `connect-src 'none'`. No data ever leaves your device.
3. **Hardened Electron Isolation:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and navigation lockdown.
4. **No Spyware / No Keylogging:** ScreenCare tracks only duration of user activity and idle periods. It never records keystrokes, window titles, URLs, screen captures, or clipboard contents.
5. **Private Local Storage:** Data is stored in `%APPDATA%\ScreenCare\screencare-data.json`. Includes a one-click **"Delete All Data"** control in Settings.

---

## 4. How to Run the Applications

### Windows
- **Direct Run (Standalone):** Double-click `D:\ScreenCare\release\windows\ScreenCare.exe`.
- **Install (Setup Wizard):** Double-click `D:\ScreenCare\release\windows\ScreenCare-Setup.exe` to install to `%LOCALAPPDATA%\Programs\ScreenCare` with Start Menu shortcut and uninstaller.
- **System Tray:** When minimized or closed, ScreenCare remains active in your Windows system tray. Double-click the tray icon to restore the dashboard, or right-click to trigger breaks or pause reminders.

### Android
- **Installation via ADB:**
  ```powershell
  adb install D:\ScreenCare\release\android\ScreenCare-Android.apk
  ```
- **Direct Install:** Transfer `ScreenCare-Android.apk` to your Android device via USB/Storage and tap to install.

---

## 5. How to Rebuild the Entire Project

All build scripts are automated and self-contained:

### Rebuild Windows Desktop Application
```powershell
powershell -ExecutionPolicy Bypass -File D:\ScreenCare\scripts\build-windows.ps1
```

### Rebuild Android Application (APK)
```powershell
powershell -ExecutionPolicy Bypass -File D:\ScreenCare\scripts\build-android.ps1
```

### Run Automated Tests
```powershell
node D:\ScreenCare\scripts\run-tests.js
```
*(All 9 tests execute in ~16ms with 100% pass rate).*

### Run Security Audit
```powershell
powershell -ExecutionPolicy Bypass -File D:\ScreenCare\scripts\security-audit.ps1
```

### Recompute Release Checksums
```powershell
powershell -ExecutionPolicy Bypass -File D:\ScreenCare\scripts\generate-checksums.ps1
```