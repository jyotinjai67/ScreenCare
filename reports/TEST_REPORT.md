# ScreenCare Automated Test Report

**Execution Date:** 2026-10-26  
**Test Suite:** Unit & Integration Suite (`scripts/run-tests.js`)  
**Environment:** Node.js v24.19.0 LTS on Windows 11 x64  
**Status:** PASS (9 of 9 passed, 0 failed, duration ~16ms)

---

## Test Execution Summary

| Test Suite | Test Case | Status | Duration |
|:---|:---|:---:|:---|
| **ReminderEngine Tests** | Increments active session when user is active | PASS | 2.5 ms |
| **ReminderEngine Tests** | Does not increment active session when user is idle past threshold (3 min) | PASS | 0.3 ms |
| **ReminderEngine Tests** | Resets continuous session after 10 minutes of inactivity | PASS | 0.7 ms |
| **ReminderEngine Tests** | Triggers 20-20-20 eye break when due timestamp is reached | PASS | 0.6 ms |
| **ReminderEngine Tests** | Respects quiet hours and suppresses reminders during DND period | PASS | 1.5 ms |
| **ReminderEngine Tests** | Snooze delays reminder by configured snooze period (5 min default) | PASS | 0.6 ms |
| **ReminderEngine Tests** | Complete break records positive log and recalculates schedule | PASS | 0.9 ms |
| **calculateWellnessScore**| Returns high score (>=80, Exceptional) for regular breaks and moderate screen time | PASS | 0.3 ms |
| **calculateWellnessScore**| Penalizes skipped breaks and excessive screen time (<=45, Needs Attention) | PASS | 0.2 ms |

---

## Detailed Verifications

### 1. 20-20-20 Eye Break Timing
- Verified that active screen usage ticks properly advance toward the 20-minute threshold.
- Verified that at the trigger point, an eye break event is raised with correct guidance:
  *"Look at something 20 feet (6m) away for 20 seconds to relax your eyes."*

### 2. Inactivity and Idle Handling
- Inactivity above `idleThresholdMinutes` (default 3 mins) flags system state as idle and halts screen session accrual.
- 10 minutes of continuous idle resets the active work streak to 0, matching ergonomic recommendations.

### 3. Quiet Hours Scheduling
- Supports standard and overnight spans (e.g. 22:00 to 07:00).
- Confirmed that notifications are suppressed when timestamps fall inside quiet intervals.

### 4. Wellness Score Algorithmic Soundness
- Tested against diverse workday profiles:
  - High compliance (optimal breaks, moderate hours): **Score 80–100 (Exceptional)**
  - Low compliance (zero breaks, 10+ hours screen time): **Score 10–45 (Needs Attention)**
