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
| **Windows Installer** | Windows 10/11 | [`release/windows/ScreenCare-Setup.exe`](file:///D:/ScreenCare/release/windows/ScreenCare-Setup.exe) | `0D5763B9E3C5CD6C4FE6962E8EC19F22F16C3AF7F34817E2C8ADCE79A3A83039` |
| **Windows Standalone** | Windows 10/11 | [`release/windows/ScreenCare.exe`](file:///D:/ScreenCare/release/windows/ScreenCare.exe) | `8666ECF186248506B772A2229E502D4310F4246A2FF71137C9E204E61391BB49` |
| **Android Package** | Android 8.0+ | [`release/android/ScreenCare-Android.apk`](file:///D:/ScreenCare/release/android/ScreenCare-Android.apk) | `824F65B0BE5DE4593B911D0CAE5D9001AE7B52B6F7D96E4CFFB9B68DA5A2A492` |

*Cryptographic checksums are recorded in [`release/CHECKSUMS.sha256`](file:///D:/ScreenCare/release/CHECKSUMS.sha256).*

---

## 2. Notification Architecture & Deduplication

ScreenCare implements an authoritative **Cycle State Machine** in the Electron Main process:
1. **Single Notification per Cycle:** Each reminder cycle has a unique ID (e.g. `eye-break-1719001200000`). Once dispatched, its status atomically transitions to `notified`. Subsequent timer ticks cannot re-dispatch notifications for that cycle.
2. **Deep Linking to Break Experience:** Clicking the native notification restores and focuses the existing window, opening the pictorial break modal without creating secondary windows.
3. **Sleep/Wake Burst Suppression:** If the device was suspended, overdue reminders are rate-limited and staggered by 5–15 minutes, preventing burst alarms upon wake.
4. **State Persistence:** Cycle status is persisted in `screencare-data.json` to prevent duplicate popups across application restarts.

---

## 3. Pictorial & Visual Experience

The user interface features a visual-first design language:
- **Dedicated Eye Break Experience:** A visual scene featuring a window overlooking distant mountains and horizons, a luminous vector eye illustration, a 20-second circular countdown ring, and 3 illustrated step cards.
- **Rhythmic Breathing Guide:** Dynamic inhale/hold/exhale animation and progress indicator to calm ocular tension.
- **Illustrated Dashboard:** Dual health & continuous-session radial rings, large visual wellness tiles, daily screen time progress bar, and an upcoming reminder timeline.
- **Stretch Library with Vector Guidance:** Illustrated diagrams for neck, shoulder, spine, wrist, and movement breaks.

---

## 4. Security & Privacy Guarantees

ScreenCare enforces strict privacy and system integrity principles:
1. **Least Privilege Execution:** Runs under standard user rights (`asInvoker`). Never requests administrative elevation or Android root access.
2. **Zero Telemetry / Zero Cloud Backend:** 100% local-first. Content Security Policy enforces `connect-src 'none'`. No data ever leaves your device.
3. **Electron Sandboxing:** `contextIsolation: true`, `nodeIntegration: false`, and OS-level sandboxing enabled.
4. **Clean Android Permissions:** Zero invasive permissions (No SMS, No Contacts, No Location, No Microphone, No Accessibility Service abuse).
