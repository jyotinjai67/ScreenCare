import { describe, test, expect } from 'vitest';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, UserSettings } from '../shared/types';

describe('ScreenCare Independent Reminder Scheduling & Countdown Verification', () => {
  const baseTime = 1719000000000;

  const createTestSettings = (overrides?: Partial<UserSettings>): UserSettings => ({
    ...DEFAULT_SETTINGS,
    devTestMode: false, // Use exact minute-based configurations
    eyeBreak: {
      enabled: true,
      intervalMinutes: 2, // 2 minutes = 120s
      durationSeconds: 20,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    postureStretch: {
      enabled: true,
      intervalMinutes: 1, // 1 minute = 60s
      durationSeconds: 30,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    standMove: {
      enabled: true,
      intervalMinutes: 3, // 3 minutes = 180s
      durationSeconds: 60,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    walking: {
      enabled: true,
      intervalMinutes: 4, // 4 minutes = 240s
      durationSeconds: 120,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    ...overrides,
  });

  // 1. When one reminder fires, all other reminders retain their original next-due timestamps
  test('1. When one reminder fires, all other reminders retain their original next-due timestamps', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const initialReminders = engine.getNextReminders(baseTime);
    const eyeInitial = initialReminders.find((r) => r.type === 'eye-break')!;
    const postureInitial = initialReminders.find((r) => r.type === 'posture-stretch')!;
    const standInitial = initialReminders.find((r) => r.type === 'stand-move')!;
    const walkInitial = initialReminders.find((r) => r.type === 'walking')!;

    expect(postureInitial.nextDueTimestamp).toBe(baseTime + 60 * 1000);
    expect(eyeInitial.nextDueTimestamp).toBe(baseTime + 120 * 1000);
    expect(standInitial.nextDueTimestamp).toBe(baseTime + 180 * 1000);
    expect(walkInitial.nextDueTimestamp).toBe(baseTime + 240 * 1000);

    // Advance clock to 60s (Posture due)
    const t60 = baseTime + 60 * 1000;
    const event = engine.tick(0, t60);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('posture-stretch');
    expect(notifications.length).toBe(1);

    // Check schedules immediately after Posture fires
    const afterReminders = engine.getNextReminders(t60);
    const eyeAfter = afterReminders.find((r) => r.type === 'eye-break')!;
    const postureAfter = afterReminders.find((r) => r.type === 'posture-stretch')!;
    const standAfter = afterReminders.find((r) => r.type === 'stand-move')!;
    const walkAfter = afterReminders.find((r) => r.type === 'walking')!;

    // Posture is updated to its own next cycle (t60 + 60s = baseTime + 120s)
    expect(postureAfter.nextDueTimestamp).toBe(baseTime + 120 * 1000);
    expect(postureAfter.secondsRemaining).toBe(60);

    // Eye Break, Stand & Stretch, and Walking MUST retain their exact original timestamps!
    expect(eyeAfter.nextDueTimestamp).toBe(eyeInitial.nextDueTimestamp);
    expect(eyeAfter.secondsRemaining).toBe(60); // 120s - 60s = 60s (NOT 180s, NOT 2m 52s)

    expect(standAfter.nextDueTimestamp).toBe(standInitial.nextDueTimestamp);
    expect(standAfter.secondsRemaining).toBe(120); // 180s - 60s = 120s

    expect(walkAfter.nextDueTimestamp).toBe(walkInitial.nextDueTimestamp);
    expect(walkAfter.secondsRemaining).toBe(180); // 240s - 60s = 180s
  });

  // 2. A 1-minute reminder firing does not reset a 2-minute reminder
  test('2. A 1-minute reminder firing does not reset a 2-minute reminder', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // At 10 seconds:
    const rem10 = engine.getNextReminders(baseTime + 10000);
    expect(rem10.find((r) => r.type === 'posture-stretch')?.secondsRemaining).toBe(50);
    expect(rem10.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(110);

    // At 59 seconds:
    const rem59 = engine.getNextReminders(baseTime + 59000);
    expect(rem59.find((r) => r.type === 'posture-stretch')?.secondsRemaining).toBe(1);
    expect(rem59.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(61);

    // At 60 seconds (Posture fires):
    const ev60 = engine.tick(0, baseTime + 60000);
    expect(ev60?.type).toBe('posture-stretch');
    expect(notifications.length).toBe(1);

    // At 61 seconds (Post-firing tick):
    const rem61 = engine.getNextReminders(baseTime + 61000);
    // Posture countdown reset to its new cycle: 60s - 1s = 59s
    expect(rem61.find((r) => r.type === 'posture-stretch')?.secondsRemaining).toBe(59);
    // Eye Break countdown CONTINUES smoothly: 60s - 1s = 59s (NOT reset to 120s!)
    expect(rem61.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(59);

    // At 120 seconds (Eye Break due):
    const ev120 = engine.tick(0, baseTime + 120000);
    expect(ev120?.type).toBe('eye-break');
    expect(notifications.length).toBe(2);

    // Eye Break's new schedule is scheduled at 120s + 2m = 240s
    const rem120 = engine.getNextReminders(baseTime + 120000);
    expect(rem120.find((r) => r.type === 'eye-break')?.nextDueTimestamp).toBe(baseTime + 240000);
  });

  // 3. Displayed countdown never exceeds the configured interval
  test('3. Displayed countdown never exceeds the configured interval', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    // For a 2-minute interval (120s), countdown right after initialization must be <= 120
    const remInit = engine.getNextReminders(baseTime);
    const eyeInit = remInit.find((r) => r.type === 'eye-break')!;
    expect(eyeInit.secondsRemaining).toBe(120);
    expect(eyeInit.secondsRemaining).toBeLessThanOrEqual(settings.eyeBreak.intervalMinutes * 60);

    // Tick forward 30 seconds
    const rem30 = engine.getNextReminders(baseTime + 30000);
    const eye30 = rem30.find((r) => r.type === 'eye-break')!;
    expect(eye30.secondsRemaining).toBe(90);

    // Trigger another reminder (e.g., posture-stretch or manual trigger)
    engine.triggerReminder('posture-stretch', baseTime + 45000);

    // Eye Break countdown must NOT jump or exceed 120s
    const remAfterTrigger = engine.getNextReminders(baseTime + 45000);
    const eyeAfterTrigger = remAfterTrigger.find((r) => r.type === 'eye-break')!;
    expect(eyeAfterTrigger.secondsRemaining).toBe(75); // 120s - 45s = 75s
    expect(eyeAfterTrigger.secondsRemaining).toBeLessThanOrEqual(settings.eyeBreak.intervalMinutes * 60);
  });

  // 4. Changing one reminder interval updates only that reminder
  test('4. Changing one reminder interval updates only that reminder', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    const initialReminders = engine.getNextReminders(baseTime);
    const eyeInitialDue = initialReminders.find((r) => r.type === 'eye-break')!.nextDueTimestamp;
    const standInitialDue = initialReminders.find((r) => r.type === 'stand-move')!.nextDueTimestamp;
    const walkInitialDue = initialReminders.find((r) => r.type === 'walking')!.nextDueTimestamp;

    // Change only postureStretch from 1 minute to 5 minutes at baseTime + 20s
    const t20 = baseTime + 20000;
    const updatedSettings: UserSettings = {
      ...settings,
      postureStretch: {
        ...settings.postureStretch,
        intervalMinutes: 5, // Changed to 5m
      },
    };
    engine.updateSettings(updatedSettings, t20);

    const afterUpdate = engine.getNextReminders(t20);
    const postureUpdated = afterUpdate.find((r) => r.type === 'posture-stretch')!;
    const eyeUpdated = afterUpdate.find((r) => r.type === 'eye-break')!;
    const standUpdated = afterUpdate.find((r) => r.type === 'stand-move')!;
    const walkUpdated = afterUpdate.find((r) => r.type === 'walking')!;

    // Posture schedule updated to t20 + 5m (300s)
    expect(postureUpdated.nextDueTimestamp).toBe(t20 + 5 * 60 * 1000);
    expect(postureUpdated.secondsRemaining).toBe(300);

    // All other reminders retain their exact original due timestamps
    expect(eyeUpdated.nextDueTimestamp).toBe(eyeInitialDue);
    expect(standUpdated.nextDueTimestamp).toBe(standInitialDue);
    expect(walkUpdated.nextDueTimestamp).toBe(walkInitialDue);
  });

  // 5. Multiple reminders becoming due independently fire sequentially without bursts
  test('5. Multiple reminders becoming due independently fire sequentially without bursts', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Posture (interval 1m) and Eye Break (interval 2m) both become due at 120s
    // Tick at 60s fires Posture cycle 1
    engine.tick(0, baseTime + 60000);
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('posture-stretch');

    // Advance to 120s: both Eye Break cycle 1 and Posture cycle 2 are due
    const ev120 = engine.tick(0, baseTime + 120000);
    expect(ev120).not.toBeNull();
    expect(notifications.length).toBe(2);

    // Next tick at 121s delivers the other due reminder
    const ev121 = engine.tick(0, baseTime + 121000);
    expect(ev121).not.toBeNull();
    expect(notifications.length).toBe(3);

    // Verify both types were delivered
    const deliveredTypes = notifications.map((n) => n.type);
    expect(deliveredTypes).toContain('eye-break');
    expect(deliveredTypes).toContain('posture-stretch');

    // Subsequent ticks do NOT repeat
    for (let s = 2; s <= 30; s++) {
      expect(engine.tick(0, baseTime + 120000 + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(3);
  });

  // 6. Lock, sleep, and wake recover reminders independently using their own intervals
  test('6. Lock, sleep, and wake recover reminders independently using their own intervals', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Put system to sleep for 2 hours (7200 seconds)
    engine.setSuspended(true, baseTime);
    const wakeTime = baseTime + 7200 * 1000;

    // Wake from sleep
    engine.setSuspended(false, wakeTime);

    // Each reminder's countdown is strictly preserved to its remaining duration
    const remindersAfterWake = engine.getNextReminders(wakeTime);
    const postureNext = remindersAfterWake.find((r) => r.type === 'posture-stretch')!;
    const eyeNext = remindersAfterWake.find((r) => r.type === 'eye-break')!;
    const standNext = remindersAfterWake.find((r) => r.type === 'stand-move')!;
    const walkNext = remindersAfterWake.find((r) => r.type === 'walking')!;

    // Preserved exact remaining times
    expect(postureNext.secondsRemaining).toBe(60);
    expect(eyeNext.secondsRemaining).toBe(120);
    expect(standNext.secondsRemaining).toBe(180);
    expect(walkNext.secondsRemaining).toBe(240);

    // First tick upon wake does not emit premature notifications because 60s remain
    const firstEvent = engine.tick(0, wakeTime);
    expect(firstEvent).toBeNull();
    expect(notifications.length).toBe(0);

    // No bursts during subsequent ticks before 60s
    for (let s = 1; s < 60; s++) {
      expect(engine.tick(0, wakeTime + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(0);

    // At 60s after wake, Posture fires cleanly
    const postureEvent = engine.tick(0, wakeTime + 60000);
    expect(postureEvent).not.toBeNull();
    expect(postureEvent?.type).toBe('posture-stretch');
    expect(notifications.length).toBe(1);
  });

  // 7. Restart recovery preserves independent schedules and prevents duplicate replay
  test('7. Restart recovery preserves independent schedules and prevents duplicate replay', () => {
    const settings = createTestSettings();
    const engine1 = new ReminderEngine(settings, 0, baseTime);
    const notifs1: ReminderDueEvent[] = [];
    engine1.setOnReminderDue((e) => notifs1.push(e));

    // Fire posture at 60s
    engine1.tick(0, baseTime + 60000);
    expect(notifs1.length).toBe(1);

    // Snapshot state at 75s
    const snapshotTime = baseTime + 75000;
    const savedCycles = engine1.getCycleInfo();
    const savedDelivered = engine1.getDeliveredCycleIds();
    const savedScreenSeconds = engine1.getStatus().activeScreenSeconds;

    // Simulate app restart at 80s
    const restartTime = baseTime + 80000;
    const engine2 = new ReminderEngine(settings, savedScreenSeconds, restartTime);
    const notifs2: ReminderDueEvent[] = [];
    engine2.setOnReminderDue((e) => notifs2.push(e));
    engine2.setDeliveredCycleIds(savedDelivered);
    engine2.setCycleInfo(savedCycles, restartTime);

    // Check that Eye Break still has its independent due timestamp (baseTime + 120s)
    const rem = engine2.getNextReminders(restartTime);
    const eyeRem = rem.find((r) => r.type === 'eye-break')!;
    expect(eyeRem.nextDueTimestamp).toBe(baseTime + 120000);
    expect(eyeRem.secondsRemaining).toBe(40); // 120s - 80s = 40s

    // Tick forward 30 seconds: 0 duplicate notifications replayed
    for (let s = 1; s <= 30; s++) {
      expect(engine2.tick(0, restartTime + s * 1000)).toBeNull();
    }
    expect(notifs2.length).toBe(0);

    // At 120s, Eye Break fires cleanly
    const evEye = engine2.tick(0, baseTime + 120000);
    expect(evEye?.type).toBe('eye-break');
    expect(notifs2.length).toBe(1);
  });

  // 8. Eye Care at 1 minute and Stretch at 45 minutes fire independently without Stretch being reset
  test('8. Eye Care at 1 minute and Stretch at 45 minutes fire independently without Stretch being reset', () => {
    const settings = createTestSettings({
      eyeBreak: {
        enabled: true,
        intervalMinutes: 1, // 1 minute = 60s
        durationSeconds: 20,
        snoozeMinutes: 5,
        soundEnabled: false,
      },
      postureStretch: {
        enabled: true,
        intervalMinutes: 45, // 45 minutes = 2700s
        durationSeconds: 45,
        snoozeMinutes: 10,
        soundEnabled: false,
      },
    });

    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Initially: Eye is 60s, Stretch is 2700s (45m)
    const initRem = engine.getNextReminders(baseTime);
    expect(initRem.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(60);
    expect(initRem.find((r) => r.type === 'posture-stretch')?.secondsRemaining).toBe(2700);

    // After 1 minute (60s): Eye Care fires!
    const ev1 = engine.tick(0, baseTime + 60000);
    expect(ev1?.type).toBe('eye-break');
    expect(notifications.length).toBe(1);

    // After Eye Care fires, Stretch MUST NOT be reset or delayed!
    const rem60 = engine.getNextReminders(baseTime + 60000);
    const eye60 = rem60.find((r) => r.type === 'eye-break')!;
    const stretch60 = rem60.find((r) => r.type === 'posture-stretch')!;

    // Eye Care reset to its own 1-minute cycle (60s remaining)
    expect(eye60.secondsRemaining).toBe(60);
    // Stretch countdown CONTINUED smoothly: 2700s - 60s = 2640s (44 minutes remaining, NOT reset!)
    expect(stretch60.secondsRemaining).toBe(2640);
    expect(stretch60.nextDueTimestamp).toBe(baseTime + 45 * 60 * 1000);
  });

  // 9. Stale persisted cycles exceeding interval are clamped so countdown never exceeds limit
  test('9. Stale persisted cycles exceeding interval are clamped so countdown never exceeds limit', () => {
    const settings = createTestSettings({
      postureStretch: {
        enabled: true,
        intervalMinutes: 2, // 2 minutes = 120s limit
        durationSeconds: 45,
        snoozeMinutes: 10,
        soundEnabled: false,
      },
    });

    const engine = new ReminderEngine(settings, 0, baseTime);

    // Simulate bad persisted cycle with scheduledTime 3 minutes into future (180s)
    const badCycles = {
      'posture-stretch': {
        cycleId: 'posture-corrupted',
        type: 'posture-stretch' as const,
        scheduledTime: baseTime + 180000, // 3 minutes > 2 minute interval!
        status: 'scheduled' as const,
      },
    };

    engine.setCycleInfo(badCycles, baseTime);

    // Clamping must correct scheduledTime to <= baseTime + 120000 (2 minutes)
    const rem = engine.getNextReminders(baseTime);
    const postureRem = rem.find((r) => r.type === 'posture-stretch')!;
    expect(postureRem.secondsRemaining).toBeLessThanOrEqual(120);
    expect(postureRem.nextDueTimestamp).toBeLessThanOrEqual(baseTime + 120000);
  });
});
