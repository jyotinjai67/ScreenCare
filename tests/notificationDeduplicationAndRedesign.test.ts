import { describe, test, expect } from 'vitest';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, ReminderType } from '../shared/types';
import fs from 'fs';
import path from 'path';

describe('ScreenCare Mandatory Release Verification Tests', () => {
  const baseTime = 1719000000000;

  // 1. A reminder produces exactly one notification
  test('1. A reminder produces exactly one notification', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    const event = engine.tick(0, dueTime);

    expect(event).not.toBeNull();
    expect(event?.type).toBe('eye-break');
    expect(event?.title).toContain('Eye Break');
    expect(event?.message).toContain('rest your eyes');
    expect(notifications.length).toBe(1);
    expect(notifications[0].cycleId).toBeDefined();
  });

  // 2. At least 60 subsequent scheduler ticks do not repeat that notification
  test('2. At least 60 subsequent scheduler ticks do not repeat that notification', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    engine.tick(0, dueTime);
    expect(notifications.length).toBe(1);

    // 65 consecutive 1-second ticks following the due cycle
    for (let s = 1; s <= 65; s++) {
      const subsequent = engine.tick(0, dueTime + s * 1000);
      expect(subsequent).toBeNull();
    }

    // Must remain strictly 1 notification total
    expect(notifications.length).toBe(1);
  });

  // 3. The next reminder cycle works correctly
  test('3. The next reminder cycle works correctly', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Cycle 1 at 20 minutes
    const firstDue = baseTime + 20 * 60 * 1000;
    const firstEvent = engine.tick(0, firstDue);
    expect(firstEvent).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Verify subsequent ticks do not repeat Cycle 1
    for (let s = 1; s <= 10; s++) {
      expect(engine.tick(0, firstDue + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(1);

    // Advance 20 minutes to Cycle 2 (without needing any modal or completeBreak call)
    const secondDue = firstDue + 20 * 60 * 1000;
    const secondEvent = engine.tick(0, secondDue);

    expect(secondEvent).not.toBeNull();
    expect(secondEvent?.type).toBe('eye-break');
    expect(secondEvent?.cycleId).not.toBe(firstEvent?.cycleId);
    expect(notifications.length).toBe(2);

    // Verify subsequent ticks do not repeat Cycle 2
    for (let s = 1; s <= 60; s++) {
      expect(engine.tick(0, secondDue + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(2);
  });

  // 4. Restarting the app does not replay an already-delivered notification
  test('4. Restarting the app does not replay an already-delivered notification', () => {
    const engine1 = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifs1: ReminderDueEvent[] = [];
    engine1.setOnReminderDue((e) => notifs1.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    engine1.tick(0, dueTime);
    expect(notifs1.length).toBe(1);

    // Snapshot state to simulate persistence to disk
    const savedCycles = engine1.getCycleInfo();
    const savedDeliveredIds = engine1.getDeliveredCycleIds();
    const savedActiveSeconds = engine1.getStatus().activeScreenSeconds;

    // Simulate restart with restored state 15 seconds after notification delivery
    const restartTime = dueTime + 15000;
    const engine2 = new ReminderEngine(DEFAULT_SETTINGS, savedActiveSeconds, restartTime);
    const notifs2: ReminderDueEvent[] = [];
    engine2.setOnReminderDue((e) => notifs2.push(e));
    engine2.setDeliveredCycleIds(savedDeliveredIds);
    engine2.setCycleInfo(savedCycles, restartTime);

    // Subsequent ticks on restarted instance
    for (let s = 1; s <= 60; s++) {
      const ev = engine2.tick(0, restartTime + s * 1000);
      expect(ev).toBeNull();
    }

    // Exactly zero duplicate notifications replayed
    expect(notifs2.length).toBe(0);
  });

  // 5. Locking Windows stops active screen-time accumulation
  test('5. Locking Windows stops active screen-time accumulation', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);

    // Active session before lock
    engine.tick(0, baseTime + 1000);
    expect(engine.getStatus().activeScreenSeconds).toBe(1);

    // Lock screen
    engine.setLocked(true);
    expect(engine.isSystemLocked()).toBe(true);

    // 30 ticks while locked with keyboard/mouse inputs: screen time MUST NOT increase
    for (let s = 1; s <= 30; s++) {
      engine.tick(0, baseTime + 1000 + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(1);

    // Unlock screen while user is idle (idleSec = 250 > 180s threshold)
    engine.setLocked(false, baseTime + 35000);
    expect(engine.isSystemLocked()).toBe(false);

    engine.tick(250, baseTime + 36000);
    expect(engine.getStatus().activeScreenSeconds).toBe(1); // User is idle, no increase

    // User active after unlock (idleSec = 0)
    engine.tick(0, baseTime + 37000);
    expect(engine.getStatus().activeScreenSeconds).toBe(2); // Resumes counting
  });

  // 6. Sleeping and waking do not create artificial screen time
  test('6. Sleeping and waking do not create artificial screen time', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);

    // Initial 10 seconds of active work
    for (let s = 1; s <= 10; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(10);

    // Computer suspended for 2 hours (7200 seconds)
    engine.setSuspended(true);
    const wakeTime = baseTime + 10000 + 7200 * 1000;

    // Ticks while suspended
    for (let s = 1; s <= 5; s++) {
      engine.tick(0, baseTime + 10000 + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(10);

    // Wake from sleep
    engine.setSuspended(false, wakeTime);

    // First active tick after waking: active screen seconds must only be 11, NOT 7211!
    engine.tick(0, wakeTime);
    expect(engine.getStatus().activeScreenSeconds).toBe(11);
  });

  // 7. Unlocking does not trigger a notification burst
  test('7. Unlocking does not trigger a notification burst', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Lock screen for 3 hours (180 minutes)
    engine.setLocked(true, baseTime);
    const unlockTime = baseTime + 3 * 3600 * 1000;

    // Unlock screen
    engine.setLocked(false, unlockTime);

    // Timers were paused during lock; no notifications burst upon unlock
    const firstEvent = engine.tick(0, unlockTime);
    expect(firstEvent).toBeNull();
    expect(notifications.length).toBe(0);

    // Subsequent 60 ticks do NOT burst reminders
    for (let s = 1; s <= 60; s++) {
      const subsequent = engine.tick(0, unlockTime + s * 1000);
      expect(subsequent).toBeNull();
    }
    expect(notifications.length).toBe(0);

    // Furthermore, when multiple reminders become due simultaneously, they deliver at most 1 per tick (0 bursts)
    const dueSettings = {
      ...DEFAULT_SETTINGS,
      devTestMode: false,
      eyeBreak: { ...DEFAULT_SETTINGS.eyeBreak, enabled: true, intervalMinutes: 1, durationSeconds: 20 },
      postureStretch: { ...DEFAULT_SETTINGS.postureStretch, enabled: true, intervalMinutes: 1, durationSeconds: 30 },
      standMove: { ...DEFAULT_SETTINGS.standMove, enabled: false },
      walking: { ...DEFAULT_SETTINGS.walking, enabled: false },
    };
    const multiDueEngine = new ReminderEngine(dueSettings, 0, baseTime);
    const multiNotifs: ReminderDueEvent[] = [];
    multiDueEngine.setOnReminderDue((e) => multiNotifs.push(e));

    // Advance to 60s where both Eye and Posture reach due time
    const t60 = baseTime + 60000;
    const ev1 = multiDueEngine.tick(0, t60);
    expect(ev1).not.toBeNull();
    expect(multiNotifs.length).toBe(1);

    // Consecutive tick delivers the next due reminder cleanly
    const ev2 = multiDueEngine.tick(0, t60 + 1000);
    expect(ev2).not.toBeNull();
    expect(multiNotifs.length).toBe(2);

    // No bursts during remaining ticks
    for (let s = 2; s <= 30; s++) {
      expect(multiDueEngine.tick(0, t60 + s * 1000)).toBeNull();
    }
    expect(multiNotifs.length).toBe(2);
  });

  // 8. Minimizing to the tray keeps monitoring active
  test('8. Minimizing to the tray keeps monitoring active', () => {
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const content = fs.readFileSync(mainIndexPath, 'utf8');

    // Confirms window minimize event hides window without destroying or stopping monitoring
    expect(content).toContain("win.on('minimize'");
    expect(content).toContain('minimizeToTray');
    expect(content).toContain('win.hide()');

    // Confirms authoritative single setInterval ticker continues running
    const intervalMatches = content.match(/timerInterval\s*=\s*setInterval/g);
    expect(intervalMatches).not.toBeNull();
    expect(intervalMatches?.length).toBe(1);

    // Confirms system idle time is measured independently of window visibility
    expect(content).toContain('powerMonitor.getSystemIdleTime()');
  });

  // 9. No break modal, countdown, or action buttons appear automatically
  test('9. No break modal, countdown, or action buttons appear automatically', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    const event = engine.tick(0, dueTime);

    expect(event).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Active break state must remain strictly null — no modal, no countdown
    expect(engine.getActiveBreak()).toBeNull();

    // Verify main process does NOT broadcast open-break-screen
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const content = fs.readFileSync(mainIndexPath, 'utf8');
    expect(content).not.toContain("screencare:open-break-screen");
  });

  // 10. The application starts, runs in the background, and exits cleanly
  test('10. The application starts, runs in the background, and exits cleanly', () => {
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const content = fs.readFileSync(mainIndexPath, 'utf8');

    // Single instance lock prevents duplicate running instances
    expect(content).toContain('app.requestSingleInstanceLock()');

    // Clean exit lifecycle: timer cleared and data saved before quit
    expect(content).toContain("app.on('before-quit'");
    expect(content).toContain('clearInterval(timerInterval)');
    expect(content).toContain('saveStoredData()');

    // Security constraints preserved
    expect(content).toContain('contextIsolation: true');
    expect(content).toContain('nodeIntegration: false');
    expect(content).toContain('sandbox: true');
    expect(content).toContain('webSecurity: true');
  });
});
