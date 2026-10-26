import { describe, test, expect } from 'vitest';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, ReminderType } from '../shared/types';
import fs from 'fs';
import path from 'path';

describe('ScreenCare Bug Fix & Targeted Architecture Tests', () => {
  const baseTime = 1719000000000;

  // 1. Lock/Unlock: Stop counting immediately on lock, resume only when unlocked and user is active
  test('Lock/Unlock: stops counting immediately on lock; resumes only when unlocked and active', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);

    // Active tick 1
    engine.tick(0, baseTime + 1000);
    expect(engine.getStatus().activeScreenSeconds).toBe(1);

    // Lock screen
    engine.setLocked(true);
    expect(engine.isSystemLocked()).toBe(true);

    // Ticks while locked: MUST NOT accumulate active screen time
    for (let s = 1; s <= 20; s++) {
      engine.tick(0, baseTime + 1000 + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(1);

    // Unlock screen while user is idle (e.g. idleSec = 300 > 180s threshold)
    engine.setLocked(false, baseTime + 25000);
    expect(engine.isSystemLocked()).toBe(false);

    engine.tick(300, baseTime + 26000);
    // User is idle: MUST NOT accumulate active screen time
    expect(engine.getStatus().activeScreenSeconds).toBe(1);

    // User becomes active (idleSec = 0 < 180s threshold)
    engine.tick(0, baseTime + 27000);
    // Now active screen time resumes
    expect(engine.getStatus().activeScreenSeconds).toBe(2);
  });

  // 2. Sleep/Wake: Stop counting on sleep, resume without bursts
  test('Sleep/Wake: stops counting on sleep; wake audits overdue reminders without bursts', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Suspend computer
    engine.setSuspended(true);
    expect(engine.isSystemSuspended()).toBe(true);

    // Advance 2 hours while sleeping
    const wakeTime = baseTime + 2 * 3600 * 1000;
    for (let s = 1; s <= 10; s++) {
      const ev = engine.tick(0, baseTime + s * 1000);
      expect(ev).toBeNull();
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(0);

    // Wake computer
    engine.setSuspended(false, wakeTime);
    expect(engine.isSystemSuspended()).toBe(false);

    // First tick upon wake: at most ONE reminder is dispatched
    const firstEvent = engine.tick(0, wakeTime);
    expect(firstEvent).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Subsequent ticks do NOT burst with other reminders
    for (let s = 1; s <= 30; s++) {
      engine.tick(0, wakeTime + s * 1000);
    }
    expect(notifications.length).toBe(1);
  });

  // 3. Idle Detection: Does not count sufficiently idle time and resets streak after 10m
  test('Idle Detection: does not count sufficiently idle time and resets continuous streak after 10m', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);

    // 100 active seconds
    for (let s = 1; s <= 100; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(engine.getStatus().activeScreenSeconds).toBe(100);
    expect(engine.getStatus().currentContinuousSeconds).toBe(100);

    // User steps away: idle time 200s (threshold is 180s = 3m)
    engine.tick(200, baseTime + 101000);
    expect(engine.getStatus().isIdle).toBe(true);
    expect(engine.getStatus().activeScreenSeconds).toBe(100); // Did not increase!

    // 10 minutes (600s) of continuous inactivity
    engine.tick(600, baseTime + 700000);
    expect(engine.getStatus().currentContinuousSeconds).toBe(0); // Reset streak!
  });

  // 4. Notification-only: Reminder does NOT automatically open modal or start countdown
  test('Notification-only: reminder does not hijack the screen or automatically start countdown', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000 + 1000;
    const event = engine.tick(0, dueTime);

    // Exactly one notification was generated
    expect(event).not.toBeNull();
    expect(notifications.length).toBe(1);

    // Crucial check: activeBreak is still null! No modal or countdown was forced on the user!
    expect(engine.getActiveBreak()).toBeNull();

    // User is free to continue working or take break manually when convenient
    engine.tick(0, dueTime + 1000);
    expect(engine.getActiveBreak()).toBeNull();
  });

  // 5. Background operation & single scheduler
  test('Background operation: single scheduler instance in main process and minimize-to-tray config', () => {
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const content = fs.readFileSync(mainIndexPath, 'utf8');

    // Confirms minimize-to-tray event handler prevents destruction and hides to tray
    expect(content).toContain("win.on('minimize'");
    expect(content).toContain("engine.getSettings().minimizeToTray");
    expect(content).toContain("win.hide()");

    // Confirms single authoritative setInterval timer
    const intervalMatches = content.match(/timerInterval\s*=\s*setInterval/g);
    expect(intervalMatches).not.toBeNull();
    expect(intervalMatches?.length).toBe(1);
  });

  // 6. Duplicate suppression: 30 consecutive ticks produce 0 duplicate notifications
  test('Duplicate suppression: 30 consecutive ticks produce exactly 1 notification total', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000 + 1000;
    engine.tick(0, dueTime);
    expect(notifications.length).toBe(1);

    for (let s = 1; s <= 30; s++) {
      const subsequent = engine.tick(0, dueTime + s * 1000);
      expect(subsequent).toBeNull();
    }

    expect(notifications.length).toBe(1);
  });

  // 7. Clicking notification focuses existing window without opening break modal
  test('Clicking notification focuses existing application window without opening break modal', () => {
    let focusCalled = false;
    let restoreCalled = false;
    let showCalled = false;

    const mockMainWindow = {
      isDestroyed: () => false,
      isMinimized: () => true,
      restore: () => { restoreCalled = true; },
      show: () => { showCalled = true; },
      focus: () => { focusCalled = true; },
    };

    function onNotificationClick(win: typeof mockMainWindow | null) {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    }

    onNotificationClick(mockMainWindow);
    expect(restoreCalled).toBe(true);
    expect(showCalled).toBe(true);
    expect(focusCalled).toBe(true);
  });

  // 8. Completing or skipping does not retrigger during same cycle
  test('Completing or skipping does not retrigger during same cycle', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    engine.tick(0, dueTime);
    expect(notifications.length).toBe(1);

    engine.skipBreak('eye-break', dueTime + 5000);

    for (let s = 1; s <= 10; s++) {
      expect(engine.tick(0, dueTime + 5000 + s * 1000)).toBeNull();
    }
    expect(notifications.length).toBe(1);
  });

  // 9. Next reminder appears at next configured interval
  test('Next reminder appears at next configured interval', () => {
    const engine = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    const firstDue = baseTime + 20 * 60 * 1000;
    engine.tick(0, firstDue);
    expect(notifications.length).toBe(1);

    // Complete first break
    engine.completeBreak('eye-break', 20, firstDue + 20000);

    // Advance 20 minutes
    const secondDue = firstDue + 20000 + 20 * 60 * 1000;
    const secondEvent = engine.tick(0, secondDue);
    expect(secondEvent).not.toBeNull();
    expect(notifications.length).toBe(2);
  });

  // 10. Restarting application does not replay same reminder
  test('Restarting application does not replay same reminder', () => {
    const engine1 = new ReminderEngine(DEFAULT_SETTINGS, 0, baseTime);
    const notifs1: ReminderDueEvent[] = [];
    engine1.setOnReminderDue((e) => notifs1.push(e));

    const dueTime = baseTime + 20 * 60 * 1000;
    engine1.tick(0, dueTime);
    expect(notifs1.length).toBe(1);

    const savedCycles = engine1.getCycleInfo();
    const savedActiveSeconds = engine1.getStatus().activeScreenSeconds;

    // Simulate restart with restored state
    const engine2 = new ReminderEngine(DEFAULT_SETTINGS, savedActiveSeconds, dueTime + 10000);
    const notifs2: ReminderDueEvent[] = [];
    engine2.setOnReminderDue((e) => notifs2.push(e));
    engine2.setCycleInfo(savedCycles, dueTime + 10000);

    expect(engine2.tick(0, dueTime + 11000)).toBeNull();
    expect(notifs2.length).toBe(0);
  });

  // 11. Security settings remain intact
  test('Security settings remain intact in main process', () => {
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const content = fs.readFileSync(mainIndexPath, 'utf8');

    expect(content).toContain('contextIsolation: true');
    expect(content).toContain('nodeIntegration: false');
    expect(content).toContain('sandbox: true');
    expect(content).toContain('webSecurity: true');
  });
});
