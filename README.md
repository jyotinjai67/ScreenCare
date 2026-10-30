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
| **Windows Installer** | Windows 10/11 | [`release/windows/ScreenCare-Setup.exe`](file:///D:/ScreenCare/release/windows/ScreenCare-Setup.exe) | `4F02DD2B4D4B0741A795C051FF6A1F8C02C710986568FBBADDBCA6DC46008C2C` |
| **Windows Standalone** | Windows 10/11 | [`release/windows/ScreenCare.exe`](file:///D:/ScreenCare/release/windows/ScreenCare.exe) | `1D86CCEFB62BA3D1CF50C0C8B1FB55C8168570F5582C72D0F7DCEB8FD5C41EB8` |
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

**Animated reminder notifications (desktop):** every activity has three distinct looping scenes drawn with one consistent, jointed character (SVG + CSS, no image files), and consecutive reminders of the same activity rotate through them:

| Activity | Scene 1 | Scene 2 | Scene 3 |
|:---|:---|:---|:---|
| Eye Rest | Window view, 20-second ring | Focus across the room (6 m) | Close eyes, palming, reopen |
| Posture | Neck tilt left / right | Shoulder rolls | Slouch → upright alignment |
| Stand & Stretch | Overhead reach | Side stretch both sides | Chest opener (side view) |
| Walking | Walk away from the desk | Park stroll | Walk + gaze at the horizon |

A step ticker under each scene ("1 Tilt left — hold → 2 … → 3 …") runs in sync with the motion. Combined breaks rotate between suitable scenes (groups that include Eye Rest always keep a distant-gaze scene). *Preview* on the dashboard shows the next scene each click without touching any schedule. Background motion stops when Windows "reduce motion" is on.

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

---

## 5. Reminder Scheduling Policies (desktop)

- **Independent timers:** Eye Rest, Posture & Neck, Stand & Stretch and Walking each own an interval, due timestamp, cycle ID and pause state. Nothing one reminder does moves another reminder's schedule.
- **Saving an interval:** when a reminder's interval changes (or it is re-enabled) and you press *Save Preferences*, that reminder restarts from the save time (`next due = save time + new interval`). Reminders you did not change keep their exact countdowns. Saving never records a completed break.
- **Lock / sleep / "Pause 1h":** all countdowns freeze and resume from the exact remaining time. Nothing is shown while locked or asleep. A visible panel is closed on lock/sleep; a reminder that was still waiting behind it stays due in its own cycle and is shown after you return (subject to the return policy below), so it is neither lost nor replayed twice.
- **Restart:** time while ScreenCare is not running is treated like sleep — each reminder resumes from the time it had left when state was last saved (saved on every change and once a minute).
- **Adaptive return-from-break (Settings → Adaptive Reminders):** ScreenCare tracks *absences* only from signals it can actually observe — Windows lock/unlock, sleep/resume, keyboard/mouse inactivity beyond the idle threshold, and time the app was closed. It never claims to know what you were doing.
  - An absence shorter than **Long absence after** (default 15 min) keeps the exact remaining countdown with no delay.
  - After a long absence, reminders that are **nearly due** (remaining ≤ *N*% of *their own* interval, default 25%) or overdue wait for the **settling period** (default 3 min, never longer than that reminder's interval) before being shown. The countdown itself is not changed; the hold is computed once per return, so repeated unlock/resume events cannot extend it.
  - Reminders released together are combined when compatible; incompatible ones (e.g. Eye Rest + seated Posture) are shown one at a time, oldest first, at least 45 s apart — never as a burst.
- **Activity-aware grouping:** when reminders become due close together, a due reminder may wait up to the **combine window** (default 60 s, and at most 10% of its own interval) for a compatible one, so you get one useful break. Eye Rest always keeps its distant-focus instruction (with your configured duration). Showing, dismissing or grouping a notification never records a break as completed.
- **One panel at a time:** while a panel is visible, further reminders stay due in their own cycles and follow ~0.8 s after it closes.
- **Learning (optional, local, deterministic):** from lock/idle durations only — no keystrokes, screenshots or app content. If reminders repeatedly appear right after short interruptions, nearly-due reminders get up to 1 min grace after short absences; if several reminders repeatedly pile up after long absences, settling is extended ×1.5 (max 30 min). Active rules are explained on the dashboard.
- **Rapid Test Mode:** overrides your intervals with 20–90 s test intervals; the dashboard shows a banner while it is on.
- **Viewing distance tip:** not a timed reminder and never shown as a countdown.

Build & verify: `npm test`, `npm run typecheck`, then `scripts/build-windows.ps1` (tests → clean build → package → `node scripts/verify-release.js` → checksums).
