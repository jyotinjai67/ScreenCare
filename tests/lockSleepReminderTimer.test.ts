import { describe, test, expect } from 'vitest';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, UserSettings } from '../shared/types';

describe('ScreenCare Lock/Sleep-Aware Reminder Timer Verification', () => {
  const baseTime = 1719000000000;

  const createSettings = (overrides?: Partial<UserSettings>): UserSettings => ({
    ...DEFAULT_SETTINGS,
    devTestMode: false,
    eyeBreak: {
      enabled: true,
      intervalMinutes: 2, // 120s
      durationSeconds: 20,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    postureStretch: {
      enabled: true,
      intervalMinutes: 1, // 60s
      durationSeconds: 30,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    standMove: {
      enabled: true,
      intervalMinutes: 3, // 180s
      durationSeconds: 60,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    walking: {
      enabled: true,
      intervalMinutes: 4, // 240s
      durationSeconds: 120,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    ...overrides,
  });

  // Scenario 1: Lock with 40 seconds remaining; simulate 20 minutes locked; unlock; verify exactly 40 seconds remain.
  test('Scenario 1: Lock with 40 seconds remaining; simulate 20 minutes locked; unlock; verify exactly 40 seconds remain', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Eye Rest is configured for 2m (120s).
    // Tick forward 80 seconds so Eye Rest has exactly 40 seconds remaining (120s - 80s = 40s).
    for (let s = 1; s <= 80; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    const remAt80 = engine.getNextReminders(baseTime + 80000);
    const eyeAt80 = remAt80.find((r) => r.type === 'eye-break')!;
    expect(eyeAt80.secondsRemaining).toBe(40);

    // Lock screen at 80s
    const lockTime = baseTime + 80000;
    engine.setLocked(true, lockTime);

    // Simulate 20 minutes (1,200 seconds) locked
    const lockedDurationMs = 20 * 60 * 1000;
    const unlockTime = lockTime + lockedDurationMs;

    // Verify that during the lock period, countdown UI stays frozen at 40s
    const remDuringLock = engine.getNextReminders(lockTime + 10 * 60 * 1000);
    const eyeDuringLock = remDuringLock.find((r) => r.type === 'eye-break')!;
    expect(eyeDuringLock.secondsRemaining).toBe(40);

    // Unlock screen
    engine.setLocked(false, unlockTime);

    // Verify immediately upon unlock: exactly 40 seconds remain
    const remAfterUnlock = engine.getNextReminders(unlockTime);
    const eyeAfterUnlock = remAfterUnlock.find((r) => r.type === 'eye-break')!;
    expect(eyeAfterUnlock.secondsRemaining).toBe(40);
    expect(eyeAfterUnlock.nextDueTimestamp).toBe(unlockTime + 40000);

    // Tick for 39 seconds after unlock: no notification yet
    for (let s = 1; s <= 39; s++) {
      expect(engine.tick(0, unlockTime + s * 1000)).toBeNull();
    }
    expect(notifications.some((n) => n.type === 'eye-break')).toBe(false);

    // At exactly 40 seconds after unlock: Eye Rest fires!
    const ev40 = engine.tick(0, unlockTime + 40000);
    expect(ev40?.type).toBe('eye-break');
  });

  // Scenario 2: Verify that no notifications fire during lock or sleep.
  test('Scenario 2: Verify that no notifications fire during lock or sleep', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Put system to sleep after 10s of activity
    const sleepTime = baseTime + 10000;
    engine.setSuspended(true, sleepTime);

    // Tick repeatedly past when reminders would otherwise be due (e.g. 5 minutes, 30 minutes, 2 hours)
    for (let m = 1; m <= 120; m++) {
      const result = engine.tick(0, sleepTime + m * 60 * 1000);
      expect(result).toBeNull();
    }
    expect(notifications.length).toBe(0);

    // Also test locking
    const lockTime = sleepTime + 120 * 60 * 1000;
    engine.setSuspended(false, lockTime);
    engine.setLocked(true, lockTime);

    for (let m = 1; m <= 60; m++) {
      const result = engine.tick(0, lockTime + m * 60 * 1000);
      expect(result).toBeNull();
    }
    expect(notifications.length).toBe(0);
  });

  // Scenario 3: Verify active screen time does not increase while locked or asleep.
  test('Scenario 3: Verify active screen time does not increase while locked or asleep', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Accumulate 50 active screen seconds
    for (let s = 1; s <= 50; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(50);
    expect(engine.getStatus().currentContinuousSeconds).toBe(50);

    // Lock for 1 hour
    const lockTime = baseTime + 50000;
    engine.setLocked(true, lockTime);

    for (let s = 1; s <= 60; s++) {
      engine.tick(0, lockTime + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(50);
    expect(engine.getStatus().currentContinuousSeconds).toBe(50);

    // Sleep for 2 hours
    const sleepTime = lockTime + 3600 * 1000;
    engine.setSuspended(true, sleepTime);

    for (let s = 1; s <= 60; s++) {
      engine.tick(0, sleepTime + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(50);

    // Wake and unlock at 4 hours later
    const resumeTime = sleepTime + 7200 * 1000;
    engine.setSuspended(false, resumeTime);
    engine.setLocked(false, resumeTime);

    // Active screen time is still exactly 50
    expect(engine.getStatus().activeScreenSeconds).toBe(50);

    // First active tick after resume accumulates exactly 1 second
    engine.tick(0, resumeTime + 1000);
    expect(engine.getStatus().activeScreenSeconds).toBe(51);
    expect(engine.getStatus().currentContinuousSeconds).toBe(51);
  });

  // Scenario 4: Verify every reminder preserves its own remaining duration.
  test('Scenario 4: Verify every reminder preserves its own remaining duration', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Initial schedules: Posture: 60s, Eye: 120s, Stand: 180s, Walk: 240s
    // Advance 25 seconds of active work
    for (let s = 1; s <= 25; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    const remAt25 = engine.getNextReminders(baseTime + 25000);
    expect(remAt25.find((r) => r.type === 'posture-stretch')!.secondsRemaining).toBe(35); // 60 - 25 = 35
    expect(remAt25.find((r) => r.type === 'eye-break')!.secondsRemaining).toBe(95);      // 120 - 25 = 95
    expect(remAt25.find((r) => r.type === 'stand-move')!.secondsRemaining).toBe(155);    // 180 - 25 = 155
    expect(remAt25.find((r) => r.type === 'walking')!.secondsRemaining).toBe(215);       // 240 - 25 = 215

    // Lock for 45 minutes
    const lockTime = baseTime + 25000;
    engine.setLocked(true, lockTime);

    const unlockTime = lockTime + 45 * 60 * 1000;
    engine.setLocked(false, unlockTime);

    // Verify all 4 reminders retain their exact individual remaining times
    const remAfter = engine.getNextReminders(unlockTime);
    expect(remAfter.find((r) => r.type === 'posture-stretch')!.secondsRemaining).toBe(35);
    expect(remAfter.find((r) => r.type === 'eye-break')!.secondsRemaining).toBe(95);
    expect(remAfter.find((r) => r.type === 'stand-move')!.secondsRemaining).toBe(155);
    expect(remAfter.find((r) => r.type === 'walking')!.secondsRemaining).toBe(215);
  });

  // Scenario 5: Verify locking does not reset timers to their configured full intervals.
  test('Scenario 5: Verify locking does not reset timers to their configured full intervals', () => {
    const settings = createSettings({
      postureStretch: {
        enabled: true,
        intervalMinutes: 45, // 45m = 2700s
        durationSeconds: 45,
        snoozeMinutes: 10,
        soundEnabled: false,
      },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Let 30 minutes (1800s) elapse: remaining is 15 minutes (900s)
    const t30m = baseTime + 30 * 60 * 1000;
    for (let s = 1; s <= 1800; s += 60) {
      engine.tick(0, baseTime + s * 1000);
    }
    const remBefore = engine.getNextReminders(t30m).find((r) => r.type === 'posture-stretch')!;
    expect(remBefore.secondsRemaining).toBe(900); // 15 minutes left

    // Lock and stay locked for 1 hour
    engine.setLocked(true, t30m);
    const unlockTime = t30m + 60 * 60 * 1000;
    engine.setLocked(false, unlockTime);

    // Countdown MUST NOT reset to 45 minutes (2700s); it must remain 15 minutes (900s)
    const remAfter = engine.getNextReminders(unlockTime).find((r) => r.type === 'posture-stretch')!;
    expect(remAfter.secondsRemaining).toBe(900);
    expect(remAfter.secondsRemaining).not.toBe(2700);
  });

  // Scenario 6: Verify repeated lock/unlock and suspend/resume events do not double-adjust timers.
  test('Scenario 6: Verify repeated lock/unlock and suspend/resume events do not double-adjust timers', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Eye Rest has 120s remaining.
    // Advance 40 seconds -> 80s remaining.
    for (let s = 1; s <= 40; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    const t40 = baseTime + 40000;
    expect(engine.getNextReminders(t40).find((r) => r.type === 'eye-break')!.secondsRemaining).toBe(80);

    // Lock screen at t40
    engine.setLocked(true, t40);

    // Redundant lock events
    engine.setLocked(true, t40 + 5000);
    engine.setSuspended(true, t40 + 10000);
    engine.setSuspended(true, t40 + 15000);

    // Wake computer from sleep at t40 + 60000, but screen is still locked
    engine.setSuspended(false, t40 + 60000);
    expect(engine.isSystemLocked()).toBe(true);
    expect(engine.isSystemSuspended()).toBe(false);

    // Screen remains paused with 80s remaining
    expect(engine.getNextReminders(t40 + 70000).find((r) => r.type === 'eye-break')!.secondsRemaining).toBe(80);

    // Finally unlock screen at t40 + 120000
    const unlockTime = t40 + 120000;
    engine.setLocked(false, unlockTime);

    // Redundant unlock/resume events
    engine.setLocked(false, unlockTime + 1000);
    engine.setSuspended(false, unlockTime + 2000);

    // Remaining time must be smoothly counting down from 80s (at unlockTime + 2000, 78s remain)
    const rem = engine.getNextReminders(unlockTime + 2000).find((r) => r.type === 'eye-break')!;
    expect(rem.secondsRemaining).toBe(78);
  });

  // Scenario 7: Verify a reminder firing does not reset any other reminder.
  test('Scenario 7: Verify a reminder firing does not reset any other reminder', () => {
    const settings = createSettings({
      eyeBreak: {
        enabled: true,
        intervalMinutes: 1, // 1m = 60s
        durationSeconds: 20,
        snoozeMinutes: 5,
        soundEnabled: false,
      },
      postureStretch: {
        enabled: true,
        intervalMinutes: 45, // 45m = 2700s
        durationSeconds: 45,
        snoozeMinutes: 10,
        soundEnabled: false,
      },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Eye fires at 60s
    for (let s = 1; s <= 60; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('eye-break');

    // Posture countdown was 2700s - 60s = 2640s (44 minutes remaining).
    // It must NOT have reset to 2700s, 3 minutes, or any other value!
    const rem = engine.getNextReminders(baseTime + 60000).find((r) => r.type === 'posture-stretch')!;
    expect(rem.secondsRemaining).toBe(2640);
    expect(rem.nextDueTimestamp).toBe(baseTime + 2700 * 1000);

    // Eye fires again at 120s
    for (let s = 61; s <= 120; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(notifications.length).toBe(2);
    expect(notifications[1].type).toBe('eye-break');

    // Posture countdown is now 2700s - 120s = 2580s (43 minutes remaining)
    const rem2 = engine.getNextReminders(baseTime + 120000).find((r) => r.type === 'posture-stretch')!;
    expect(rem2.secondsRemaining).toBe(2580);
    expect(rem2.nextDueTimestamp).toBe(baseTime + 2700 * 1000);
  });

  // Scenario 8: Verify no duplicate notifications or wake-up bursts.
  test('Scenario 8: Verify no duplicate notifications or wake-up bursts', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Lock for 2 hours
    engine.setLocked(true, baseTime);
    const unlockTime = baseTime + 7200 * 1000;
    engine.setLocked(false, unlockTime);

    // 0 notifications immediately upon unlock
    const ev0 = engine.tick(0, unlockTime);
    expect(ev0).toBeNull();
    expect(notifications.length).toBe(0);

    // Next 59 ticks: 0 notifications
    for (let s = 1; s < 60; s++) {
      expect(engine.tick(0, unlockTime + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(0);

    // Posture fires at 60s
    const ev60 = engine.tick(0, unlockTime + 60000);
    expect(ev60?.type).toBe('posture-stretch');
    expect(notifications.length).toBe(1);

    // No duplicate delivery for the next 59 ticks
    for (let s = 1; s < 60; s++) {
      expect(engine.tick(0, unlockTime + 60000 + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(1);
  });

  // Scenario 9: Verify restarting the application and persisted scheduler state remain consistent.
  test('Scenario 9: Verify restarting the application and persisted scheduler state remain consistent', () => {
    const settings = createSettings();
    const engine1 = new ReminderEngine(settings, 0, baseTime);

    // Advance 30s
    for (let s = 1; s <= 30; s++) {
      engine1.tick(0, baseTime + s * 1000);
    }

    // Lock system at 30s
    const lockTime = baseTime + 30000;
    engine1.setLocked(true, lockTime);

    // Snapshot state (as saved to screencare-data.json)
    const savedCycles = engine1.getCycleInfo();
    const savedDelivered = engine1.getDeliveredCycleIds();
    const savedScreenSeconds = engine1.getStatus().activeScreenSeconds;

    // Verify savedCycles contains paused remaining times
    expect(savedCycles['posture-stretch'].pausedRemainingMs).toBe(30000); // 60s - 30s = 30s
    expect(savedCycles['eye-break'].pausedRemainingMs).toBe(90000);      // 120s - 30s = 90s

    // Simulate restart after being locked for 15 minutes (900s)
    const restartTime = lockTime + 900 * 1000;
    const engine2 = new ReminderEngine(settings, savedScreenSeconds, restartTime);
    engine2.setDeliveredCycleIds(savedDelivered);
    engine2.setCycleInfo(savedCycles, restartTime);

    // App restarts while unlocked: countdowns resume from exact preserved durations
    const rem = engine2.getNextReminders(restartTime);
    expect(rem.find((r) => r.type === 'posture-stretch')!.secondsRemaining).toBe(30);
    expect(rem.find((r) => r.type === 'eye-break')!.secondsRemaining).toBe(90);

    // At 30s after restart, Posture fires cleanly
    const notifs2: ReminderDueEvent[] = [];
    engine2.setOnReminderDue((e) => notifs2.push(e));

    for (let s = 1; s < 30; s++) {
      expect(engine2.tick(0, restartTime + s * 1000)).toBeNull();
    }
    expect(notifs2.length).toBe(0);

    const ev30 = engine2.tick(0, restartTime + 30000);
    expect(ev30?.type).toBe('posture-stretch');
    expect(notifs2.length).toBe(1);
  });
});
