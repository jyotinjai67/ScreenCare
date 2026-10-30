import { describe, test, expect } from 'vitest';
import { ReminderEngine, ReminderDueEvent, areActivitiesCompatible, getGroupedReminderContent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, UserSettings, ReminderType } from '../shared/types';

describe('Activity-Aware Reminder Intelligence & Grouping Verification', () => {
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
      intervalMinutes: 1, // 60s
      durationSeconds: 60,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    walking: {
      enabled: true,
      intervalMinutes: 1, // 60s
      durationSeconds: 120,
      snoozeMinutes: 5,
      soundEnabled: false,
    },
    ...overrides,
  });

  // 1. Two compatible reminders due together produce one combined notification
  test('1. Two compatible reminders due together produce one combined notification', () => {
    // Stand & Stretch (60s) + Walking Refresh (60s) are both due at baseTime + 60s
    const settings = createSettings({
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: false, intervalMinutes: 10, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 1, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });

    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const t60 = baseTime + 60000;
    const event = engine.tick(0, t60);

    expect(event).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Verified combined notification properties
    expect(event?.isGrouped).toBe(true);
    expect(event?.groupedTypes).toContain('stand-move');
    expect(event?.groupedTypes).toContain('walking');
    expect(event?.title).toBe('Active Movement Break');
    expect(event?.firstWord).toBe('Active');
    expect(event?.highlightWord).toBe('Movement');
    expect(event?.instruction).toBe('Stand up, walk away from your screen, and move for a moment.');
    expect(event?.type).toBe('walking');

    // Also verify Posture & Neck + Stand & Stretch combination
    const postureStandSettings = createSettings({
      eyeBreak: { enabled: false, intervalMinutes: 10, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: false, intervalMinutes: 10, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
      postureStretch: { enabled: true, intervalMinutes: 1, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
    });
    const postureStandEngine = new ReminderEngine(postureStandSettings, 0, baseTime);
    const postureStandEvent = postureStandEngine.tick(0, t60);

    expect(postureStandEvent).not.toBeNull();
    expect(postureStandEvent?.isGrouped).toBe(true);
    expect(postureStandEvent?.groupedTypes).toContain('posture-stretch');
    expect(postureStandEvent?.groupedTypes).toContain('stand-move');
    expect(postureStandEvent?.instruction).toBe('Stand tall, gently roll your shoulders, and stretch your neck.');

    // Also verify Eye Rest + Walking Refresh combination
    const eyeWalkSettings = createSettings({
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: false, intervalMinutes: 10, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: true, intervalMinutes: 1, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 1, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const eyeWalkEngine = new ReminderEngine(eyeWalkSettings, 0, baseTime);
    const eyeWalkEvent = eyeWalkEngine.tick(0, t60);

    expect(eyeWalkEvent).not.toBeNull();
    expect(eyeWalkEvent?.isGrouped).toBe(true);
    expect(eyeWalkEvent?.groupedTypes).toContain('eye-break');
    expect(eyeWalkEvent?.groupedTypes).toContain('walking');
    expect(eyeWalkEvent?.instruction).toBe('Take a walk away from your screen, and look at a distant object for 20 seconds.');
  });

  // 2. Every underlying reminder retains its own next-due timestamp
  test('2. Every underlying reminder retains its own next-due timestamp', () => {
    // Stand & Stretch interval 1m (60s), Walking Refresh interval 2m (120s)
    // Initially both start at baseTime, but let's schedule them so both fire together at t120
    const settings = createSettings({
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: false, intervalMinutes: 10, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 2, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);

    // At 60s, stand-move fires alone
    const ev60 = engine.tick(0, baseTime + 60000);
    expect(ev60?.type).toBe('stand-move');

    // At 120s, stand-move (cycle 2) and walking (cycle 1) are BOTH due at the exact same second!
    const t120 = baseTime + 120000;
    const ev120 = engine.tick(0, t120);

    expect(ev120?.isGrouped).toBe(true);
    expect(ev120?.groupedTypes).toEqual(['stand-move', 'walking']);

    // Inspect next-due timestamps immediately after grouped firing
    const reminders = engine.getNextReminders(t120);
    const standRem = reminders.find((r) => r.type === 'stand-move')!;
    const walkRem = reminders.find((r) => r.type === 'walking')!;

    // Stand & Stretch maintains its 1m (60s) schedule: t120 + 60s = 180s
    expect(standRem.nextDueTimestamp).toBe(t120 + 60000);
    expect(standRem.secondsRemaining).toBe(60);

    // Walking Refresh maintains its 2m (120s) schedule: t120 + 120s = 240s
    expect(walkRem.nextDueTimestamp).toBe(t120 + 120000);
    expect(walkRem.secondsRemaining).toBe(120);
  });

  // 3. Grouping never resets or shifts another reminder's countdown
  test('3. Grouping never resets or shifts another reminder\'s countdown', () => {
    // Posture (60s) and Stand & Stretch (60s) group at 60s.
    // Eye Break (120s) and Walking (240s) must NOT have their countdowns reset or shifted!
    const settings = createSettings({
      postureStretch: { enabled: true, intervalMinutes: 1, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: true, intervalMinutes: 2, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 4, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);

    const initialReminders = engine.getNextReminders(baseTime);
    const eyeInitialDue = initialReminders.find((r) => r.type === 'eye-break')!.nextDueTimestamp;
    const walkInitialDue = initialReminders.find((r) => r.type === 'walking')!.nextDueTimestamp;

    // At 60s: Posture & Stand group together
    const t60 = baseTime + 60000;
    const ev60 = engine.tick(0, t60);
    expect(ev60?.isGrouped).toBe(true);
    expect(ev60?.groupedTypes).toContain('posture-stretch');
    expect(ev60?.groupedTypes).toContain('stand-move');

    // Check Eye Break and Walking countdowns immediately after grouping
    const afterReminders = engine.getNextReminders(t60);
    const eyeAfter = afterReminders.find((r) => r.type === 'eye-break')!;
    const walkAfter = afterReminders.find((r) => r.type === 'walking')!;

    // Eye Break retained exact original due timestamp (baseTime + 120s) and remaining time (60s)
    expect(eyeAfter.nextDueTimestamp).toBe(eyeInitialDue);
    expect(eyeAfter.secondsRemaining).toBe(60);

    // Walking retained exact original due timestamp (baseTime + 240s) and remaining time (180s)
    expect(walkAfter.nextDueTimestamp).toBe(walkInitialDue);
    expect(walkAfter.secondsRemaining).toBe(180);
  });

  // 4. Eye Rest is not automatically marked complete merely because Walking Refresh occurred
  test('4. Eye Rest is not automatically marked complete merely because Walking Refresh occurred', () => {
    const settings = createSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Fire Walking Refresh and explicitly complete it
    engine.startBreak('walking', baseTime);
    engine.completeBreak('walking', 120, baseTime + 1000);

    const logs = engine.getBreakLogs();
    const eyeLogs = logs.filter((l) => l.type === 'eye-break');
    const walkingLogs = logs.filter((l) => l.type === 'walking');

    // Walking is logged as completed
    expect(walkingLogs.length).toBe(1);
    expect(walkingLogs[0].action).toBe('completed');

    // Eye Rest is NOT marked completed in break logs!
    expect(eyeLogs.length).toBe(0);

    // Eye Rest cycle status remains scheduled on its own timeline
    const cycles = engine.getCycleInfo();
    expect(cycles['eye-break'].status).toBe('scheduled');
    expect(cycles['eye-break'].completedAt).toBeUndefined();

    // Daily summary only shows walking/movement, 0 eye breaks completed
    const summary = engine.getDailySummary(undefined, baseTime + 2000);
    expect(summary.eyeBreaksCompleted).toBe(0);
    expect(summary.movementBreaksCompleted).toBe(1);
  });

  // 5. Incompatible reminders are delivered sequentially without overlapping notification windows
  test('5. Incompatible reminders are delivered sequentially without overlapping notification windows', () => {
    // Eye Break (60s) and Posture & Spine (60s) without any standing/walking are incompatible desk activities
    expect(areActivitiesCompatible(['eye-break', 'posture-stretch'])).toBe(false);

    const settings = createSettings({
      eyeBreak: { enabled: true, intervalMinutes: 1, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      postureStretch: { enabled: true, intervalMinutes: 1, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: false, intervalMinutes: 10, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: false, intervalMinutes: 10, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // At 60s: First incompatible reminder is delivered individually (NOT combined)
    const t60 = baseTime + 60000;
    const ev1 = engine.tick(0, t60);
    expect(ev1).not.toBeNull();
    expect(ev1?.isGrouped).toBeFalsy();
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('eye-break');

    // At 61s: Second incompatible reminder is delivered in the following tick
    const t61 = baseTime + 61000;
    const ev2 = engine.tick(0, t61);
    expect(ev2).not.toBeNull();
    expect(ev2?.isGrouped).toBeFalsy();
    expect(notifications.length).toBe(2);
    expect(notifications[1].type).toBe('posture-stretch');

    // Simulated Electron sequential queue behavior:
    // Window displays ev1; ev2 enters sequential queue; when ev1 closes, ev2 is displayed sequentially
    const sequentialDisplayLog: string[] = [];
    let activeWindow: ReminderDueEvent | null = null;
    const queue: ReminderDueEvent[] = [];

    const handleDisplay = (ev: ReminderDueEvent) => {
      if (activeWindow) {
        queue.push(ev);
      } else {
        activeWindow = ev;
        sequentialDisplayLog.push(`shown:${ev.type}`);
      }
    };

    const handleWindowClose = () => {
      if (activeWindow) {
        sequentialDisplayLog.push(`closed:${activeWindow.type}`);
        activeWindow = null;
        if (queue.length > 0) {
          const next = queue.shift()!;
          handleDisplay(next);
        }
      }
    };

    handleDisplay(notifications[0]); // Show eye-break
    handleDisplay(notifications[1]); // Enqueue posture-stretch
    expect(sequentialDisplayLog).toEqual(['shown:eye-break']);
    expect(queue.length).toBe(1);

    handleWindowClose(); // Close eye-break -> triggers posture-stretch
    expect(sequentialDisplayLog).toEqual(['shown:eye-break', 'closed:eye-break', 'shown:posture-stretch']);
    expect(queue.length).toBe(0);
  });

  // 6. No duplicate notifications are generated for the same cycle
  test('6. No duplicate notifications are generated for the same cycle', () => {
    const settings = createSettings({
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 1, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: false, intervalMinutes: 10, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Fire grouped cycle at 60s
    const t60 = baseTime + 60000;
    const ev = engine.tick(0, t60);
    expect(ev).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Ticks over the next 30 seconds must return null (no duplicate delivery)
    for (let s = 1; s <= 30; s++) {
      expect(engine.tick(0, t60 + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(1);
  });

  // 7. Ignoring or dismissing a notification does not falsely mark an activity complete
  test('7. Ignoring or dismissing a notification does not falsely mark an activity complete', () => {
    const settings = createSettings({
      eyeBreak: { enabled: true, intervalMinutes: 1, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      standMove: { enabled: false, intervalMinutes: 10, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: false, intervalMinutes: 10, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Fire reminder at 60s (notification delivered to user)
    const t60 = baseTime + 60000;
    const event = engine.tick(0, t60);
    expect(event?.type).toBe('eye-break');

    // Simulate notification being dismissed / ignored / timed out after 15s without explicit user completion
    const logs = engine.getBreakLogs();
    // Notification delivery does NOT push a completed log
    expect(logs.length).toBe(0);

    const summary = engine.getDailySummary(undefined, t60 + 15000);
    expect(summary.eyeBreaksCompleted).toBe(0);
    expect(summary.movementBreaksCompleted).toBe(0);
  });

  // 8. Lock/sleep pauses timers and unlock/wake resumes exact remaining durations
  test('8. Lock/sleep pauses timers and unlock/wake resumes exact remaining durations', () => {
    const settings = createSettings({
      eyeBreak: { enabled: true, intervalMinutes: 2, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false }, // 120s
      standMove: { enabled: true, intervalMinutes: 3, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false }, // 180s
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: false, intervalMinutes: 10, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
    });
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Advance 50 seconds: Eye has 70s remaining (120 - 50 = 70), Stand has 130s remaining (180 - 50 = 130)
    for (let s = 1; s <= 50; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    const remAt50 = engine.getNextReminders(baseTime + 50000);
    expect(remAt50.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(70);
    expect(remAt50.find((r) => r.type === 'stand-move')?.secondsRemaining).toBe(130);

    // Lock screen at 50s
    const lockTime = baseTime + 50000;
    engine.setLocked(true, lockTime);

    // During lock (e.g. 1 hour locked): tick returns null, countdowns frozen
    const lockedTick = engine.tick(0, lockTime + 1800000);
    expect(lockedTick).toBeNull();
    const remDuringLock = engine.getNextReminders(lockTime + 1800000);
    expect(remDuringLock.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(70);
    expect(remDuringLock.find((r) => r.type === 'stand-move')?.secondsRemaining).toBe(130);

    // Unlock at lockTime + 3600s
    const unlockTime = lockTime + 3600000;
    engine.setLocked(false, unlockTime);

    // Immediately upon unlock: exact remaining durations are preserved!
    const remAfterUnlock = engine.getNextReminders(unlockTime);
    expect(remAfterUnlock.find((r) => r.type === 'eye-break')?.secondsRemaining).toBe(70);
    expect(remAfterUnlock.find((r) => r.type === 'stand-move')?.secondsRemaining).toBe(130);

    // Tick 69s after unlock: still no notification
    for (let s = 1; s <= 69; s++) {
      expect(engine.tick(0, unlockTime + s * 1000)).toBeNull();
    }

    // At exactly 70s after unlock: Eye Break fires!
    const evEye = engine.tick(0, unlockTime + 70000);
    expect(evEye?.type).toBe('eye-break');
  });

  // 9. Application restart does not create duplicate or stale notification bursts
  test('9. Application restart does not create duplicate or stale notification bursts', () => {
    const settings = createSettings({
      standMove: { enabled: true, intervalMinutes: 1, durationSeconds: 60, snoozeMinutes: 5, soundEnabled: false },
      walking: { enabled: true, intervalMinutes: 1, durationSeconds: 120, snoozeMinutes: 5, soundEnabled: false },
      eyeBreak: { enabled: false, intervalMinutes: 10, durationSeconds: 20, snoozeMinutes: 5, soundEnabled: false },
      postureStretch: { enabled: false, intervalMinutes: 10, durationSeconds: 30, snoozeMinutes: 5, soundEnabled: false },
    });

    const engine1 = new ReminderEngine(settings, 0, baseTime);
    const notifications1: ReminderDueEvent[] = [];
    engine1.setOnReminderDue((e) => notifications1.push(e));

    // Fire grouped notification at 60s
    const t60 = baseTime + 60000;
    engine1.tick(0, t60);
    expect(notifications1.length).toBe(1);

    // Snapshot state for persistence
    const savedCycles = engine1.getCycleInfo();
    const savedDeliveredIds = engine1.getDeliveredCycleIds();
    const savedActiveSeconds = engine1.getStatus().activeScreenSeconds;

    // Simulate app restart 10 seconds later
    const restartTime = t60 + 10000;
    const engine2 = new ReminderEngine(settings, savedActiveSeconds, restartTime);
    engine2.setDeliveredCycleIds(savedDeliveredIds);
    engine2.setCycleInfo(savedCycles, restartTime);

    const notifications2: ReminderDueEvent[] = [];
    engine2.setOnReminderDue((e) => notifications2.push(e));

    // Immediately upon restart: NO stale notifications burst
    for (let s = 0; s <= 10; s++) {
      expect(engine2.tick(0, restartTime + s * 1000)).toBeNull();
    }
    expect(notifications2.length).toBe(0);
  });

  // 10. Multi-compatible combinations (3 and 4 reminders due together)
  test('10. Multi-compatible combinations (3 and 4 reminders due together)', () => {
    // 3 activities: Posture + Stand + Walking
    const content3 = getGroupedReminderContent(['posture-stretch', 'stand-move', 'walking']);
    expect(content3.title).toBe('Full Movement Break');
    expect(content3.firstWord).toBe('Full Body');
    expect(content3.highlightWord).toBe('Movement');
    expect(content3.instruction).toBe('Stand tall, gently roll your shoulders, and take a refreshing walk away from your screen.');
    expect(content3.displayType).toBe('walking');

    // 3 activities: Eye + Stand + Walking
    const contentEyeMove = getGroupedReminderContent(['eye-break', 'stand-move', 'walking']);
    expect(contentEyeMove.title).toBe('Active Movement & Eye Rest');
    expect(contentEyeMove.instruction).toBe('Stand up, take a short walk, and rest your eyes on a distant object for 20 seconds.');

    // 4 activities: All due together
    const contentAll4 = getGroupedReminderContent(['eye-break', 'posture-stretch', 'stand-move', 'walking']);
    expect(contentAll4.title).toBe('Mindful Wellness Break');
    expect(contentAll4.firstWord).toBe('Mindful');
    expect(contentAll4.highlightWord).toBe('Wellness');
    expect(contentAll4.instruction).toBe('Stand tall, gently roll your shoulders, take a short walk, and rest your eyes on a distant object for 20 seconds.');
    expect(contentAll4.displayType).toBe('walking');
  });
});
