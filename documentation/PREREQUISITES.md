# ScreenCare Environment Prerequisites & Assessment

**Date:** 2026-10-26  
**Project Root:** D:\ScreenCare  
**Host OS:** Windows 10/11 x64  

---

## 1. System Environment Status

| Component | Status | Detected Version / Details | Notes |
|:---|:---:|:---|:---|
| **Windows D: Drive** | Available | 197+ GB free capacity | Confirmed readable and writable |
| **Node.js** | Available | v24.19.0 | Supported LTS/current runtime |
| **npm** | Available | 11.17.0 | Package manager ready |
| **Git** | Available | 2.55.0.windows.3 | Version control available |
| **Java JDK** | Available | 17.0.8 LTS (Oracle) | JAVA_HOME: C:\Program Files\Java\jdk-17 |
| **Javac** | Available | 17.0.8 | Java compiler verified |
| **Android SDK** | Local Setup | Provisioned in D:\ScreenCare\tools\android-sdk | User-space setup without admin rights |
| **Gradle** | Project Tool | Managed via Gradle Wrapper (gradlew.bat) | Standard reproducible build mechanism |

---

## 2. Platform Architecture

### Windows Application (apps/desktop)
- **Runtime:** Electron (Secure configuration: contextIsolation: true, nodeIntegration: false, sandbox, strict CSP)
- **Frontend:** React + TypeScript + Modern CSS
- **Packaging:** electron-builder producing both NSIS installer (ScreenCare-Setup.exe) and portable standalone executable (ScreenCare.exe)
- **Native Integrations:**
  - System idle detection via Electron powerMonitor and native input queries
  - Native Windows notifications with action handlers
  - System tray with status, pause/resume, and quick-break triggers
  - Windows startup registration (disabled by default, user-configurable)
  - Local database storage with atomic persistence

### Android Application (apps/android)
- **Architecture:** Android Native app with modern UI and native background services
- **APIs:**
  - UsageStatsManager for foreground app usage metrics (opt-in onboarding)
  - Android Notification Channels (screen_health_reminders, eye_care_breaks, posture_alerts)
  - AlarmManager / WorkManager for reliable background scheduling
  - Camera2 API for local-only eye/viewing distance estimation (opt-in, local processing, 0 network, immediate release)
- **Packaging:** Gradle APK build output to D:\ScreenCare\release\android\ScreenCare-Android.apk

### Shared Logic (shared/)
- Unified Reminder Engine (rules, schedules, quiet hours, cooldowns)
- Data Models & Settings schemas (TypeScript)
- Break Routine definitions (20-20-20 eye break, 45m posture/stretch, 60m stand/move, 90m walk)
- Wellness metrics & scoring algorithms (consistency score, daily totals)

