import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, UserSettings } from '../shared/types';

describe('ScreenCare Individual Reminder Pause & Stop Application Verification', () => {
  const baseTime = 1720000000000;

  const createTestSettings = (overrides?: Partial<UserSettings>): UserSettings => ({
    ...DEFAULT_SETTINGS,
    devTestMode: false,
    eyeBreak: {
      enabled: true,
      intervalMinutes: 2, // 120s
      durationSeconds: 20,
      snoozeMinutes: 5,
      soundEnabled: false,
      paused: false,
    },
    postureStretch: {
      enabled: true,
      intervalMinutes: 3, // 180s
      durationSeconds: 30,
      snoozeMinutes: 5,
      soundEnabled: false,
      paused: false,
    },
    standMove: {
      enabled: true,
      intervalMinutes: 4, // 240s
      durationSeconds: 60,
      snoozeMinutes: 5,
      soundEnabled: false,
      paused: false,
    },
    walking: {
      enabled: true,
      intervalMinutes: 5, // 300s
      durationSeconds: 120,
      snoozeMinutes: 5,
      soundEnabled: false,
      paused: false,
    },
    ...overrides,
  });

  test('1. Eye Break can be paused individually without affecting other reminders', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Advance 60 seconds (Eye has 60s left, Posture 120s, Stand 180s, Walk 240s)
    for (let s = 1; s <= 60; s++) {
      engine.tick(0, baseTime + s * 1000);
    }

    const mid = engine.getNextReminders(baseTime + 60 * 1000);
    const eyeMid = mid.find((r) => r.type === 'eye-break')!;
    expect(eyeMid.secondsRemaining).toBe(60);

    // Pause Eye Rest individually via settings update
    const pausedSettings = {
      ...settings,
      eyeBreak: { ...settings.eyeBreak, paused: true },
    };
    engine.updateSettings(pausedSettings, baseTime + 60 * 1000);

    // Advance another 80 seconds past when Eye was originally scheduled (t = 140s)
    for (let s = 61; s <= 140; s++) {
      engine.tick(0, baseTime + s * 1000);
    }

    // Eye Break must NOT have triggered because it was paused
    expect(notifications.some((n) => n.type === 'eye-break')).toBe(false);

    // Eye countdown remains frozen at 60s
    const frozen = engine.getNextReminders(baseTime + 140 * 1000);
    const eyeFrozen = frozen.find((r) => r.type === 'eye-break')!;
    expect(eyeFrozen.secondsRemaining).toBe(60);
    expect(eyeFrozen.isPaused).toBe(true);

    // Meanwhile other reminders continued ticking: Posture has 40s remaining (180s - 140s)
    const postureAt140 = frozen.find((r) => r.type === 'posture-stretch')!;
    expect(postureAt140.secondsRemaining).toBe(40);

    // Resume Eye Break at t = 140s
    const resumedSettings = {
      ...settings,
      eyeBreak: { ...settings.eyeBreak, paused: false },
    };
    engine.updateSettings(resumedSettings, baseTime + 140 * 1000);

    // Eye Break should now be due in exactly 60 seconds (at t = 200s)
    const afterResume = engine.getNextReminders(baseTime + 140 * 1000);
    const eyeResumed = afterResume.find((r) => r.type === 'eye-break')!;
    expect(eyeResumed.secondsRemaining).toBe(60);
    expect(eyeResumed.nextDueTimestamp).toBe(baseTime + 200 * 1000);

    // Tick to 200s -> Eye fires properly
    for (let s = 141; s <= 200; s++) {
      engine.tick(0, baseTime + s * 1000);
    }
    expect(notifications.some((n) => n.type === 'eye-break')).toBe(true);
  });

  test('2. Walking reminder can be paused individually and resumed seamlessly', () => {
    const settings = createTestSettings();
    const engine = new ReminderEngine(settings, 0, baseTime);
    const notifications: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => notifications.push(e));

    // Pause Walking at t = 100s (remaining time was 200s out of 300s)
    for (let s = 1; s <= 100; s++) {
      engine.tick(0, baseTime + s * 1000);
    }

    engine.pauseReminder('walking', baseTime + 100 * 1000);

    const paused = engine.getNextReminders(baseTime + 100 * 1000);
    const walkPaused = paused.find((r) => r.type === 'walking')!;
    expect(walkPaused.secondsRemaining).toBe(200);
    expect(walkPaused.isPaused).toBe(true);

    // Advance 300 more seconds (to t = 400s)
    for (let s = 101; s <= 400; s++) {
      engine.tick(0, baseTime + s * 1000);
    }

    // Walking did NOT fire
    expect(notifications.some((n) => n.type === 'walking')).toBe(false);

    // Resume Walking at t = 400s
    engine.resumeReminder('walking', baseTime + 400 * 1000);
    const resumed = engine.getNextReminders(baseTime + 400 * 1000);
    const walkResumed = resumed.find((r) => r.type === 'walking')!;
    expect(walkResumed.secondsRemaining).toBe(200);
    expect(walkResumed.nextDueTimestamp).toBe(baseTime + 600 * 1000);
  });

  test('3. Settings tab exclusively provides individual pause controls for all 4 reminders', () => {
    const settingsViewPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/SettingsView.tsx');
    const dashboardPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/Dashboard.tsx');

    const settingsContent = fs.readFileSync(settingsViewPath, 'utf8');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    // Settings tab has individual pause controls for all four reminders
    expect(settingsContent).toContain('eyeBreak.paused');
    expect(settingsContent).toContain('postureStretch.paused');
    expect(settingsContent).toContain('standMove.paused');
    expect(settingsContent).toContain('walking.paused');
    expect(settingsContent).toContain('handlePauseToggle');

    // Dashboard does not have per-card pause buttons (only settings tab)
    expect(dashboardContent).not.toContain("handlePauseToggle('eyeBreak");
    expect(dashboardContent).not.toContain("handlePauseToggle('walking");
  });

  test('4. Stop Application is implemented with process exit and UI button', () => {
    const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
    const preloadPath = path.resolve(__dirname, '../apps/desktop/src/preload/index.ts');
    const settingsViewPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/SettingsView.tsx');

    const mainContent = fs.readFileSync(mainIndexPath, 'utf8');
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    const settingsContent = fs.readFileSync(settingsViewPath, 'utf8');

    // Main process handles screencare:stop-application and terminates with app.exit(0)
    expect(mainContent).toContain('screencare:stop-application');
    expect(mainContent).toContain('app.exit(0)');

    // Preload exposes stopApplication
    expect(preloadContent).toContain('stopApplication: () => ipcRenderer.invoke');

    // SettingsView provides Stop Application button
    expect(settingsContent).toContain('Stop Application');
    expect(settingsContent).toContain('handleStopApplication');
    expect(settingsContent).toContain('stopApplication');
  });
});
