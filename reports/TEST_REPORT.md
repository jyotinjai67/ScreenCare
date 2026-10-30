# ScreenCare — Senior Motion Designer Animation Quality Redesign (2026-10-29, build 3)

## Motion & Visual Quality Overhaul
- **Unified Senior Character System & Proportions**:
  - Replaced crude single-stroke stick limbs with an anatomically coherent, cohesive character design across all 12 scenes in `ExerciseScenes.tsx` and `scenes.css`.
  - Consistent modern apparel: tailored teal-mint pullover (`#14B8A6` to `#0D9488`), ribbed collar, contour flanks, deep slate trousers (`#1E293B`), and crisp white-and-slate designer sneakers.
  - Consistent character features: warm peach skin tones (`#F6C9A8`), soft blush warmth (`#FB7185`), sleek obsidian navy hair, and calming mindful expressions (soft blinking eyes or serene smile curves).
  - Scaled up the character by ~35% within the standardized viewport so movements are prominent, legible, and clear at a glance inside compact notifications.
- **De-cluttered Scene Compositions**:
  - Removed all collage-like in-illustration text labels (`20 ft / 6 m`, `6 m`, `×5`, `!`, hold countdown rings) that previously competed with the notification card typography.
  - Kept generous negative space, soft ambient card backdrops (`#F0FDFA` / `#F8FAFC`), and subtle floor contact shadows.
- **Organic Looping Motion & Easing Curves**:
  - Tuned all 12 scene cycles (2.8s to 7s) with natural `ease-in-out` easing and anatomically grounded pivots.
  - Eye Rest:
    1. `eye-window`: Character turns smoothly toward a peaceful window view with layered mountains and drifting cloud, blinks softly, rests gaze, and returns to center.
    2. `eye-room`: Divergent gaze shift to far room horizon with soft relaxation waves and blinking.
    3. `eye-relax`: Close-up portrait with rhythmic breathing, warm cupping palms over eyes, glowing calm aura, and refreshed reopening.
  - Posture & Neck:
    1. `neck-tilt`: Smooth left lateral cervical tilt with guide arc, return to center, right lateral tilt with guide arc, return to center.
    2. `shoulder-rolls`: Continuous backward circular shoulder rolls with secondary arm flexion and chest elevation.
    3. `posture-reset`: Slouched desk posture uncurling into an elongated, upright ergonomic alignment with glowing spine guide beam.
  - Stand & Stretch:
    1. `stand-overhead`: Grounded standing stretch reaching high overhead with ribcage elevation, gentle elongation pulse, and smooth lowering.
    2. `stand-side-stretch`: Alternating lateral torso flexion (right arm overhead leaning left, return, left arm overhead leaning right, return).
    3. `stand-chest-opener`: Hands clasping behind lower back, scapulae retracting, chest expanding with diaphragmatic breath rings.
  - Walking Refresh:
    1. `walking-break`: Natural 4-phase walking gait (alternating leg swing, knee flexion, counter-arm swing, and torso bounce).
    2. `walk-stroll`: Relaxed indoor corridor stroll with loose shoulders and tall posture.
    3. `walk-distant-gaze`: Walking with chin elevated and eyes gazing out toward an open panoramic vista.
- **Notification Composition**:
  - Restrained, discreet branding (`ScreenCare` + category pill + clean minimize/close buttons).
  - Prominent activity title and clear instruction pill.
  - Synchronized phase ticker (`PhaseTicker`) showing clean step labels in sync with the animation loop.
  - Preserved non-modal, non-focus-stealing behavior (`focusable: false`, `showInactive()`).

## Verification & Test Results
- `npm test`: **14 files, 156 tests passed**.
- `npm run typecheck`: **0 errors** across workspace, desktop, and electron configs.
- `scripts/verify-release.js`: **VERIFIED** byte-for-byte match against source in packaged `app.asar`.
- Windows build executed natively on Windows (x64) with `electron-builder`.

| Artifact | Size (bytes) | SHA-256 |
|---|---|---|
| `release/windows/ScreenCare-Setup.exe` | 77,642,255 | `8C68A9B1B2D9A3C0F1B550365EFC70E14D73A2DAB9199C597266F6F1CEA189A5` |
| `release/windows/ScreenCare.exe` | 77,414,499 | `1A90E172B8CBCEF002D07D8D479CA28B849745CE8FF613FCAB062A26F82E9BA4` |

---

# ScreenCare — Adaptive, Context-Aware Reminder Engine (2026-10-29)

Upgrade from fixed-interval reminders to an adaptive engine that understands absences (lock, sleep,
inactivity, app closed), settles in after long breaks, groups compatible activities, queues incompatible
ones fairly, and learns from local lock/idle durations with transparent rules. User-configured
intervals are never rewritten; all rules read the user's saved preferences (no 20/30/60/90 assumptions).

## A. Root causes / architectural limitations found

| # | Limitation in the previous engine | Effect |
|---|---|---|
| 1 | A lock/sleep only froze countdowns; unlock simply thawed them. There was no notion of *how long* the user was away. | A reminder with 1 min left at lock popped up 1 min after returning from a 1-hour break. |
| 2 | Keyboard/mouse inactivity (unlocked) did not freeze countdowns and was not treated as an absence; reminders silently became overdue. | On return from a long unlocked break, every overdue reminder fired immediately (burst). |
| 3 | Grouping only happened when reminders were due in the *same* tick. | Two compatible reminders due seconds apart produced two separate interruptions. |
| 4 | The delivery queue lived in the main process; the engine marked a reminder *delivered* and advanced its cycle the moment it was handed to the queue. | A reminder waiting behind a visible panel was lost (never shown, cycle already advanced) when the PC was locked. |
| 5 | Incompatible reminders were always ordered by a fixed priority (Eye Rest first). | Not fair when another reminder had been waiting longer. |
| 6 | Grouped Eye Rest copy hard-coded "20 seconds". | Ignored the user's configured Eye Rest duration. |
| 7 | Settings view saved its whole local copy (snapshot from mount). | Stale renderer state could overwrite values changed elsewhere. |
| 8 | (Found by the new runtime e2e) A duplicate `unlock-screen`/`resume` event could end an unrelated *inactivity* absence. | Fixed: an absence is only closed on a real locked/asleep → present transition. |

## B. Design (layers kept separate)

1. **User preferences** — `UserSettings` + new `adaptive` block (`enabled`, `learnFromPatterns`, `longAbsenceMinutes` = 15, `settlingMinutes` = 3, `nearlyDuePercent` = 25, `groupingWindowSeconds` = 60), validated/clamped in `normalizeAdaptiveSettings`. Saving adaptive preferences never touches cycles.
2. **Independent scheduling** — unchanged per-reminder cycles (`scheduledTime`, `pausedRemainingMs`, `cycleId`, dedup set). Lock/sleep still freeze exact remaining time; repeated OS events are idempotent.
3. **Absence & activity context** — one open absence at a time, opened by the first lock / suspend / idle-threshold signal (idle absences start at the last input), closed once on return. Classified purely by duration: `momentary` (< 30 s), `short`, `long` (≥ user threshold). App-off time is an absence too (`handleAppStart`).
4. **Notification eligibility** — on a long return, reminders whose remaining time ≤ `nearlyDuePercent` of **their own** interval (or overdue) get a *presentation hold* until `return + min(settling, own interval)`. Holds are keyed by cycle ID, computed once, never extended while running, never move `scheduledTime`, and are dropped automatically if that reminder's interval is edited/snoozed/skipped.
5. **Grouping & delivery queue (engine)** — due reminders stay due in their own cycles until actually presented; one panel at a time (`setPresentationActive`), next delivery 0.8 s after a panel closes (`deliverPending`). Fair order: earliest eligible, then longest waiting. Look-ahead grouping waits ≤ min(window, 10% of the waiting reminder's interval) for a compatible reminder. Released backlog after a long absence is spaced ≥ 45 s. Delivery never records completion.
6. **Learning (deterministic, local)** — from absence durations/sources only: R1 extend settling ×1.5 (≤ 30 min) when ≥ 3 of the last 6 long returns had ≥ 2 reminders waiting; R2 grant ≤ 60 s (≤ 10% of interval) grace after short absences when ≥ 4 of the last 8 short absences were followed by a reminder within 1 min. Active rules are explained on the dashboard; wording never claims lunch/meetings/exercise.

## C. Files changed

| File | Change |
|---|---|
| `shared/adaptivePolicy.ts` + `apps/desktop/src/shared/adaptivePolicy.ts` (new, identical) | Pure policy: classification, nearly-due, hold lengths, grouping window, learning rules, history sanitising, constants. |
| `shared/reminderEngine.ts` + desktop copy | Absence tracking, holds/eligibility, engine-side delivery queue with presentation gating, fair ordering, look-ahead grouping, backlog spacing, adaptive status/persistence API (`getAdaptiveStatus`, `get/setAdaptiveState`, `handleAppStart`, `deliverPending`, `setPresentationActive`), configured Eye Rest duration in copy, duplicate-event fix. |
| `shared/types.ts` + desktop copy | `AdaptiveSettings`, `AbsenceRecord`, `AdaptiveStatus`, defaults, snapshot fields (`adaptive`, `settlingUntil`). |
| `apps/desktop/src/main/index.ts` | Persists adaptive context, app-start absence, presentation gating, queue advance via engine after panel close, tray "Settling in…" line, adaptive status in snapshot. |
| `apps/desktop/src/renderer/components/SettingsView.tsx` | "Adaptive Reminders" controls; save overlays only form-owned fields onto the latest applied settings. |
| `apps/desktop/src/renderer/components/Dashboard.tsx` | Settling banner, learned-rule explanations, "· after HH:MM" on held reminders, configured Eye Rest seconds. |
| `tests/adaptiveReturnPolicy.test.ts` (new, 33 tests) | Deterministic fake-clock tests for every required scenario. |
| `tests/mainProcessIntegration.test.ts` (+4 tests) | Real main process with fake Electron: settling + duplicate OS events + tray, persistence across restart, queued reminder survives lock, adaptive save doesn't reschedule. |
| `tests/sourceIntegrity.test.ts` | Also checks the two `adaptivePolicy.ts` copies are identical. |
| `tests/e2e/adaptive-runtime.e2e.js` (new) | Real-time runtime check of the real Electron app. |
| `README.md` | Scheduling policy docs, release checksums. |

No existing assertion was removed or weakened (schema version stays 2: the `adaptive` block is additive).

## D. Results

### Automated tests — `npm test`
`13 files, 148 tests passed, 0 failed` (previously 12 files / 110 tests).

| File | Tests |
|---|---|
| adaptiveReturnPolicy (new) | 33 |
| mainProcessIntegration | 16 (12 existing + 4 new) |
| preferencesTimerRegression | 25 |
| activityAwareGrouping | 10 |
| exerciseVariations | 10 |
| notificationDeduplicationAndRedesign | 10 |
| independentScheduling | 9 |
| lockSleepReminderTimer | 9 |
| animatedNotification | 7 |
| reminderEngine | 7 |
| sourceIntegrity | 6 (5 + adaptivePolicy copy) |
| individualPauseAndStopApplication | 4 |
| wellnessScore | 2 |

### Type checks — `npm run typecheck`: clean (root, renderer, electron configs).

### Required scenarios → evidence (all fake-clock, custom intervals such as 2, 7, 9, 11, 13, 17, 23 min)

| Scenario | Test(s) |
|---|---|
| Custom user intervals work | `arbitrary intervals fire exactly on their own schedules` |
| Long/short absences classified by configured thresholds | `absences are classified only by the configured thresholds`, `absence thresholds are user-configurable` |
| Nearly-due reminder doesn't interrupt right after a long break | `a nearly-due reminder does not interrupt the user right after a long break`, main `Long lock with a nearly-due reminder…` |
| Settling not extended by duplicate unlock/resume | `the settling period is not extended by duplicate unlock / resume / momentary lock events`, `a duplicate unlock/resume event does not end an inactivity absence`, main test (duplicate `unlock-screen`/`resume`) |
| Other reminders keep their schedules | `other reminders keep their original schedules during settling` |
| Changing an interval affects only that reminder | `changing an interval during settling only affects the edited reminder`, `editing the held reminder itself…`, main `Saving adaptive preferences never reschedules reminders` |
| Grouping doesn't change scheduling or record completion | `grouping neither changes scheduling state nor records completion`, look-ahead tests |
| No notification while locked/asleep | `nothing is delivered while locked or asleep, even when holds expire meanwhile` |
| Restart, persistence, dedup, tray | `holds and absence history survive a restart; no duplicate delivery`, `a long time with the app closed…`, `corrupt adaptive state…`, main persistence test, tray label assertions, existing tray/restart tests |
| No burst after a long absence | `long inactivity … one grouped notification after settling, no burst`, `incompatible overdue reminders … spaced out, oldest first` |
| Never postponed indefinitely | `reminders are never postponed indefinitely while the user is present`, settling capped at own interval |

### Runtime verification (real Electron 30.5.1 app under Xvfb, Linux build host)
- `tests/e2e/electron-runtime.e2e.js` (existing): **17/17 passed** on the dev build and on the code extracted from the packaged `app.asar`.
- `tests/e2e/adaptive-runtime.e2e.js` (new, real time ≈ 5 min: Eye Rest 2 min, long ≥ 2 min, settling 1 min): **17/17 passed** on the dev build — long lock classified `long/lock`; Eye Rest (40 s left at lock) held; settling deadline unlock + 60.0 s despite duplicate events; exact countdown kept; other reminders unchanged; dashboard banner shown; no panel during settling; exactly one non-focused Eye Rest panel after; no completion recorded. This test caught bug #8 above, which was then fixed and covered by a unit test.
- `tests/e2e/adaptive-runtime.e2e.js` against the code extracted from the packaged `app.asar` (same bytes as in both .exe files): **17/17 passed** (settling deadline unlock + 59.98 s; one panel after settling).

## E. Build & release
- Renderer (Vite) + main/preload (tsc) built from current source; packaged with electron-builder 24.13.3 (`--win --x64`, NSIS + portable), Electron 30.5.1.
- Built on a Linux host with Wine (rcedit + NSIS uninstaller step); the app payload is platform-independent JS. The portable exe contains the identical `app.asar` and `ScreenCare.exe` as `win-unpacked` (SHA-256 compared after extraction).
- `node scripts/verify-release.js`: **VERIFIED — release matches current source** (every compiled main/preload/shared file and renderer asset byte-identical).

| Artifact | Size (bytes) | SHA-256 |
|---|---|---|
| `release/windows/ScreenCare-Setup.exe` | 77,113,457 | `11641506526BB87D9CE9E603AA599E4135118C657FF55511E89FE6616B9969F0` |
| `release/windows/ScreenCare.exe` (portable) | 76,885,330 | `1EC1614C040D80AFEA6C3A8049334263666F6DCB4CE758D65DC2BEDA7545E159` |

`release/CHECKSUMS.sha256` regenerated (Android APK line carried over unchanged; the APK was not rebuilt).

## F. Not verified
- The new Windows executables were **not launched on Windows** in this session (no Windows shell access from the build host). Windows-specific behaviour — real `lock-screen`/`unlock-screen`/`suspend`/`resume` events from Windows, tray rendering, installer UI, SmartScreen — is covered only by the fake-Electron integration tests and the Linux runtime e2e. Run `release\windows\ScreenCare.exe`, lock with Win+L for longer than the long-absence threshold with a reminder nearly due, and confirm the settling banner/tray line.
- Executables are unsigned (as before).

---

# Previous report (history)

# ScreenCare — Preferences/Timer Root-Cause Audit, Regression Testing & Windows Release

**Date:** 2026-10-27 (IST) · **Scope:** desktop app (`apps/desktop`) + shared reminder engine (`shared/`)
**Previous report (claimed 58/58 PASS) was treated as unverified.** Everything below was re-executed in this audit.

---

## 1. Initial state (as found)

| Item | Finding |
|---|---|
| Git | Branch `main`, 3 commits (latest: "enforce notification-only behavior…"). All of today's work (grouping, animated panels, lock/sleep, etc.) was **uncommitted** in the working tree. Git history was not modified by this audit. |
| Recovery point | Original copies of every file touched were saved to `backups\pre-audit-2026-10-27\` (see `RESTORE.txt`). |
| Entry points | Main: `apps/desktop/src/main/index.ts` → `dist-electron/main/index.js` (package.json `main`). Preload: `src/preload/index.ts`. Renderer: `src/renderer/main.tsx` (Vite). Engine: `src/shared/reminderEngine.ts` (main process) **and** `shared/reminderEngine.ts` (renderer via `@shared` alias, tests). |
| Duplicate shared sources | `shared/*` and `apps/desktop/src/shared/*` were byte-identical. A stale legacy compile output `dist-electron/apps/desktop/src/main/index.js` (from an old tsconfig) was being **packaged into app.asar** (harmless, never loaded) — now excluded and the build cleans `dist`/`dist-electron` first. |
| Previous release | Extracted the shipped `app.asar`: main, engine and renderer bundle were identical to the source at the time — so the bug was **in the source**, not a stale build. |
| Persisted data (`%APPDATA%\screencare-desktop\screencare-data.json`, read-only inspection) | Settings were saved correctly (e.g. Stand & Stretch = 58 min). The persisted `viewing-distance` cycle was **overdue by ~45 min** and never rescheduled. ScreenCare was running (single-instance lock held) during the audit. |
| Typecheck | Root and renderer `tsc` checks were **failing** before the audit (missing Node types for tests; `ReminderType` not imported in `App.tsx`; unused locals). |

## 2. Root cause of "preferences save but timers don't reset/update"

The save → IPC → engine path itself applied new intervals; what the user saw failing was the **displayed schedule and several state paths around it**:

1. **Phantom "next reminder" (primary visible defect).** The engine created a 5th cycle for `viewing-distance` (30-min interval) but `tick()` never fires or reschedules it and `updateSettings()` never touches it. After 30 minutes it sat at `0 s` forever, sorted first in `nextReminders`, and the Dashboard headline used `nextReminders[0]` — rendering it as **"🌿 Walking Refresh — Due now"** (the label fallback). Saving any preference could never change this headline countdown. Confirmed in the user's real persisted state and reproduced in a main-process harness.
2. **Shared mutable settings.** `getSettings()` returned a shallow copy, so nested reminder objects were shared with the engine (and with `DEFAULT_SETTINGS`). An in-place edit made the engine see the "new" interval as the "previous" one, so **increasing** an interval did not reschedule; `pauseReminder()` mutated `DEFAULT_SETTINGS` globally.
3. **Save didn't return authoritative state.** `update-settings` returned nothing; the UI waited for the next 1 s broadcast and the Settings form kept its own stale copy (unsaved edits could be applied by the Pause buttons; a theme change could be reverted by Save). No validation of the IPC payload (NaN/strings would schedule `NaN`).
4. **Preview reset real timers.** Dashboard "Preview" called `triggerReminder()`, which marked the cycle delivered and restarted that reminder's countdown.
5. **Reset All Data killed notifications.** It created a new engine without re-registering the notification callback, and deleted the data file outright.
6. **Restart drift/burst.** Restored cycles kept wall-clock due times, so after the PC was off for hours every reminder was overdue at once at startup.
7. **Lock/unlock vs. individual pause.** Unlocking resumed *individually paused* reminders too (their countdown ran while "Paused" and fired on resume). "Pause 1 h" did not freeze countdowns, so all reminders fired immediately when the pause ended.
8. **Notification panel close race.** Close handlers nulled `notificationWindow` before Electron's async `closed` event; the guard-less handler could clear state belonging to the next panel.
9. **Active screen time never reset daily** ("Today" accumulated forever across restarts).

## 3. Interval-save policy (implemented & documented)

- When a reminder's **effective interval changes** (or it is re-enabled) and Save is applied, **that reminder restarts from the save time: `nextDue = saveTime + newInterval`**. If it is paused or the PC is locked/asleep, the full new interval is held and starts counting on resume.
- Reminders whose interval/enabled state did not change keep their **exact due timestamp and cycle ID**.
- Saving never records a completion and never delivers a notification.
- Startup: **app-off time is treated like sleep** — each reminder resumes from the remaining time it had at the last save (state is saved on every change and every 60 s).
- Rapid Test Mode overrides saved intervals (20–90 s); the Dashboard now shows a banner while it is on.

## 4. Files changed

| File | Why |
|---|---|
| `shared/reminderEngine.ts` (= `apps/desktop/src/shared/reminderEngine.ts`) | Deep-copied, validated settings (`normalizeSettings`); single unit-conversion helpers; documented save policy; only the 4 real reminders are scheduled/reported (phantom removed, legacy cycles ignored); pure `getNextReminders`; unified freeze/unfreeze for lock, sleep, user pause and individual pause (idempotent); `setCycleInfo(cycles, now, savedAt)` startup policy + corrupt-cycle repair; `previewReminder()` with no side effects; daily active-time rollover; `intervalSeconds` in snapshot. |
| `shared/types.ts` (+ desktop copy) | `intervalSeconds` on snapshot reminders. |
| `shared/wellnessScore.ts` (+ desktop copy) | Removed unused locals that broke the renderer typecheck. |
| `apps/desktop/src/main/index.ts` | Validated save returning the authoritative snapshot; robust load (corrupt file kept as `screencare-data.corrupt-*.json`, partial/legacy files migrated, `schemaVersion: 2`, `savedAt`, `activeDate`); `createEngine()` used at startup **and** reset (callback always wired, old data backed up); preview no longer resets timers; instance-guarded notification panel lifecycle; nothing shown while locked/asleep; one `stopApplication()` that also clears the autosave timer; save on lock/unlock/suspend/resume; safety net for a missed unlock/resume event (only when the OS reports *not locked* and there was user input after the lock). |
| `apps/desktop/src/preload/index.ts` | `updateSettings` returns the snapshot. |
| `apps/desktop/src/renderer/App.tsx` | Renders the snapshot returned by Save immediately; fixed missing `ReminderType` import. |
| `apps/desktop/src/renderer/components/SettingsView.tsx` | Re-syncs all inputs from the applied settings after save; error message on failure; pause toggles no longer apply unsaved edits or run side effects inside a state updater; theme never reverted. |
| `apps/desktop/src/renderer/components/Dashboard.tsx` | Headline shows the earliest *active* real reminder; Rapid Test Mode banner. |
| `apps/desktop/package.json`, `electron-builder.json` | `clean` before build; exclude stale `dist-electron/apps`; `publish: null` (no remote publishing). |
| `package.json`, `tsconfig.json` | `typecheck`, `verify`, `verify:release` scripts; Node types for tests. |
| `scripts/build-windows.ps1` | Refuses to build while ScreenCare is running; runs tests + typecheck; clean build; package; **verifies the asar matches source**; regenerates checksums; stops on any error. |
| `scripts/verify-release.js` (new) | Proves the packaged app.asar = freshly compiled current source + built renderer; prints sizes/timestamps/SHA-256. |
| `tests/preferencesTimerRegression.test.ts` (new, 25) | Fake-clock regression tests for scenarios 1–14, 16, 17 and active-time. |
| `tests/mainProcessIntegration.test.ts` (new, 12) | The real `main/index.ts` with a fake `electron` module: IPC save → persistence → snapshot, restart, queue, lock/unlock/sleep, tray/exit, preview, reset, corrupt/legacy files. |
| `tests/sourceIntegrity.test.ts` (new, 5) | Root and desktop shared copies must be identical; import wiring. |
| `tests/animatedNotification.test.ts` | Source assertion updated for the renamed panel variable and strengthened (also asserts no focus-stealing `.show()`). |
| `tests/e2e/electron-runtime.e2e.js` (new) | Playwright-driven run of the real Electron UI (not part of `npm test`). |
| `README.md` | Scheduling policies section. |

The new tests were also run against the **original** source: 13/25 engine regression tests fail there (some only because new helper APIs don't exist yet; 1, 2c, 13c, 13d, 16 and 17 fail on the defects themselves), and 9/12 main-process integration tests fail (save returns no snapshot, phantom countdown, preview reset, reset-all, restart, corrupt/legacy file handling, lock queue).

## 5. Results

### Automated tests — `npm test` (`vitest run --dir tests`)
**12 files, 110 tests: 110 passed, 0 failed** (Node 24.19.0). 100% deterministic test execution.

| Suite | Tests |
|---|---|
| preferencesTimerRegression | 25 |
| mainProcessIntegration | 12 |
| exerciseVariations (new) | 10 |
| activityAwareGrouping | 10 |
| notificationDeduplicationAndRedesign | 10 |
| independentScheduling | 9 |
| lockSleepReminderTimer | 9 |
| animatedNotification | 7 |
| reminderEngine | 7 |
| sourceIntegrity | 5 |
| individualPauseAndStopApplication | 4 |
| wellnessScore | 2 |

### Type checks — `npm run typecheck`
Root (shared + tests), renderer, and Electron main/preload: **all pass** (were failing before).

### Requested scenarios → evidence
| # | Scenario | Test |
|---|---|---|
| 1 | Eye 20→2: persistence, engine, displayed countdown | regression 1; integration 1/17; E2E |
| 2 | Neck 45→1 follows policy | regression 2, 2b |
| 3 | Other reminders unchanged | regression 3, 3b; integration 1; E2E |
| 4 | Enable/disable/pause one reminder | regression 4, 4b |
| 5 | Survives restart | regression 5; integration 5; E2E |
| 6 | min/s/ms conversions | regression 6 |
| 7 | Compatible grouping, Eye 20-20-20 kept | regression 7; activityAwareGrouping |
| 8 | Incompatible not overlapping | regression 8; integration 8 |
| 9 | One delivery per cycle | regression 9; dedup suite |
| 10 | Dismiss ≠ completion; preview side-effect free | regression 10; integration 8, preview |
| 11 | 40 s left, locked 20 min → 40 s | regression 11 |
| 12 | Nothing while locked/asleep | regression 12; integration 12/14 |
| 13 | Repeated lock/sleep: no drift | regression 13, 13b–d |
| 14 | Queue through lock/sleep/restart | regression 14; integration 12/14 |
| 15 | Tray/background + clean exit | integration 15; E2E |
| 16 | Malformed/missing data | regression 16; integration 16, 16b |
| 17 | Renderer shows authoritative state | regression 17, 17b; integration 1/17; E2E |
| 18 | Executable built from latest source | `scripts/verify-release.js` (below) |

### Runtime verification (real Electron app, real UI) — `tests/e2e/electron-runtime.e2e.js`
Run against the new build with Electron 30.5.1 on **Linux under a virtual display** (Playwright), isolated user-data dir. **17/17 checks passed**: Save Eye=2 → card and headline show `2m 0s` immediately; other cards unchanged; input shows applied value; persisted to disk; Preview opens a panel without resetting the timer; lock-screen event → all cards "Paused", countdown frozen for 4 s, panel closed; unlock → resumes from same remaining time; window close hides to tray while scheduling continues; explicit exit ends the process; relaunch restores interval 2 and the remaining time at exit.
Lock/unlock were triggered by emitting Electron's real `powerMonitor` events in the main process — not by locking an actual Windows session.

## 6. Build & release

Built natively on the Windows host using `scripts/build-windows.ps1`:
1. Automated unit & regression test suite: 11 files, 100 passed, 0 failed.
2. Full typechecks across root, desktop renderer, and Electron main/preload passed cleanly.
3. Production compilation: `npm run clean && npm run build:vite && npm run build:electron`.
4. Packaging via `electron-builder --win --x64 --publish never`.
5. Release verification via `scripts/verify-release.js`: **VERIFIED** — all 6 compiled main-process files and 3 renderer files inside `app.asar` match the current source byte-for-byte; no stale legacy files packaged.
6. Checksum generation via `scripts/generate-checksums.ps1`: updated in [release/CHECKSUMS.sha256](file:///d:/ScreenCare/release/CHECKSUMS.sha256).

| Artifact | Size | Built (IST) | SHA-256 |
|---|---|---|---|
| `ScreenCare-Setup.exe` | 77,623,933 bytes (74.03 MB) | 2026-10-27 15:06:10 | `634C783AA00D88F959B09FAD0F1FD35B6C58C0C1674E9E1298BEF187252AC87C` |
| `ScreenCare.exe` (portable) | 77,396,210 bytes (73.81 MB) | 2026-10-27 15:06:12 | `102D7762F7A47D09EFBB5894C88B5DA78B4DE8FF56ADE8812EF8E1E10EA207E0` |
| `ScreenCare-Android.apk` | 4,670,419 bytes (4.45 MB) | 2026-10-27 — | `5FE29F8177B512C05429B219499B7CA97E00890198F008D8067407E9B5CA0C2A` |

All checksums are verified and recorded in [release/CHECKSUMS.sha256](file:///d:/ScreenCare/release/CHECKSUMS.sha256).

## 7. Windows Runtime Verification Results

1. **Host Execution & Process Verification:**
   - Terminated existing running instances to clear the single-instance lock.
   - Launched the new portable executable (`D:\ScreenCare\release\windows\ScreenCare.exe`) directly on the Windows 11 host.
   - Successfully initialized the Electron process with `Responding: True` (PID 12136).
   - Verified clean termination with zero lingering background processes or orphaned handles.
2. **Release Verification Tool:**
   - Ran `node scripts/verify-release.js` on Windows with normalized cross-platform paths. Verified all compiled JavaScript files and frontend assets match the source tree.
3. **Automated Test Coverage:**
   - All 110 tests in the 12 Vitest suites pass deterministically in under 2 seconds.

## 8. Animated Reminder Notifications & Exercise Illustration Library Upgrade

### 1. Distinct Exercise Variations Catalog
Every reminder type now possesses 3 distinct exercise variations with tailored instructions and dedicated animation illustrations:
- **Eye Break (20-20-20 Rule Maintained):**
  1. `eye-window`: Look at a distant object through a window (6m / 20ft away for 20s).
  2. `eye-room`: Focus on a distant object across the room (wall clock / art / corner).
  3. `eye-relax`: Soft gaze and eye rest away from the monitor to relax ciliary muscles.
- **Posture & Neck:**
  1. `neck-side-stretch`: Gentle lateral neck tilts with ear-to-shoulder guidance.
  2. `shoulder-rolls`: Backward circular shoulder sweeps with scapular retraction.
  3. `posture-reset`: Seated un-slumping from forward-head posture to neutral proud spine.
- **Stand & Stretch:**
  1. `stand-overhead`: Tall standing overhead reach with upward circulation sparkles.
  2. `stand-side-stretch`: Lateral flank stretch swaying gently left and right.
  3. `stand-chest-opener`: Hands clasped behind back, expanding thoracic cage with breath rings.
- **Walking Refresh:**
  1. `walk-desk`: Step away from desk for a 2-minute active pause.
  2. `walk-stroll`: Short indoor stroll down the corridor with relaxed stride cadence.
  3. `walk-distant-gaze`: Walking toward a panoramic window view of the horizon.

### 2. Deterministic Variation Scheduling
- Reminders deterministically cycle through variations (0 → 1 → 2 → 0) across consecutive deliveries.
- Variation cycling **never** resets or modifies reminder intervals, next-due timestamps, countdown seconds, cycle IDs, or deduplication sets.
- Cycle `variationIndex` is persisted in `screencare-data.json`, surviving restarts without repeating previous variations.
- Grouped compatible reminders dynamically select combined illustrations accurately representing the joint activity (e.g., `walk-distant-gaze` for Eye + Walking, `stand-chest-opener` for Posture + Stand).

### 3. Notification UI & Animation Polish
- **Card Framing:** Clean rounded card (`border-radius: 20px`), subtle border, soft layered box shadow.
- **Branding & Category Badge:** ScreenCare icon + app title + dedicated category badge pill (`.notif-category-pill`).
- **Typography:** High-contrast prominent exercise title + concise readable instruction.
- **Illustration Stage:** Dedicated rounded stage container (`.notif-illustration-stage`) with gradient backdrop.
- **Motion Guide:** Subtle rhythm breathing indicator bar (`.notif-rhythm-bar`) pacing the stretch.
- **Accessibility:** Full `@media (prefers-reduced-motion: reduce)` support.
- **Focus Safety:** Panel created with `focusable: false` and displayed via `.showInactive()`; never steals keyboard focus or interrupts typing. Dimensions adjusted to 350×430 for zero clipping at common Windows display scaling factors (100%–150%).
