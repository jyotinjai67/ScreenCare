import { describe, test, expect, beforeEach } from 'vitest';
import { ReminderEngine } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS } from '../shared/types';

describe('ReminderEngine', () => {
  let engine: ReminderEngine;

  beforeEach(() => {
    engine = new ReminderEngine(DEFAULT_SETTINGS);
  });

  test('increments active session when user is active', () => {
    engine.tick(0, 100000);
    const status = engine.getStatus();
    expect(status.activeScreenSeconds).toBe(1);
    expect(status.currentContinuousSeconds).toBe(1);
    expect(status.isIdle).toBe(false);
  });

  test('does not increment active session when user is idle past threshold', () => {
    // 3 minutes threshold = 180 seconds
    engine.tick(200, 100000);
    const status = engine.getStatus();
    expect(status.activeScreenSeconds).toBe(0);
    expect(status.isIdle).toBe(true);
    expect(status.idleSeconds).toBe(1);
  });

  test('resets continuous session after 10 minutes of inactivity', () => {
    // Accumulate 500 active seconds
    for (let i = 0; i < 500; i++) {
      engine.tick(0, 100000 + i * 1000);
    }
    expect(engine.getStatus().currentContinuousSeconds).toBe(500);

    // Idle for 10 minutes (600s)
    engine.tick(600, 700000);
    expect(engine.getStatus().currentContinuousSeconds).toBe(0);
  });

  test('triggers 20-20-20 eye break when due timestamp is reached', () => {
    const baseTime = 1700000000000;
    const testSettings = {
      ...DEFAULT_SETTINGS,
      devTestMode: true, // 20 seconds eye break interval in dev mode
    };
    const devEngine = new ReminderEngine(testSettings);

    // Tick before 20s
    let event = devEngine.tick(0, baseTime + 10000);
    expect(event).toBeNull();

    // Tick after 20s
    event = devEngine.tick(0, baseTime + 21000);
    expect(event).not.toBeNull();
    expect(event?.type).toBe('eye-break');
    expect(event?.title).toContain('20-20-20');
  });

  test('respects quiet hours and suppresses reminders', () => {
    const quietSettings = {
      ...DEFAULT_SETTINGS,
      devTestMode: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00',
      },
    };
    const engineWithQuiet = new ReminderEngine(quietSettings);

    // 23:30 is in quiet hours
    const lateNightDate = new Date('2026-10-26T23:30:00');
    expect(engineWithQuiet.isQuietHours(lateNightDate.getTime())).toBe(true);

    const event = engineWithQuiet.tick(0, lateNightDate.getTime() + 100000);
    expect(event).toBeNull();
  });

  test('snooze delays reminder by configured snooze period', () => {
    engine.snoozeBreak('eye-break');
    const logs = engine.getBreakLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('snoozed');
    expect(logs[0].type).toBe('eye-break');

    const nextList = engine.getNextReminders(Date.now());
    const eyeReminder = nextList.find((r) => r.type === 'eye-break');
    expect(eyeReminder).toBeDefined();
    expect(eyeReminder!.secondsRemaining).toBeGreaterThanOrEqual(295);
  });

  test('complete break records positive log and recalculates schedule', () => {
    engine.startBreak('posture-stretch');
    engine.completeBreak('posture-stretch', 45);

    const logs = engine.getBreakLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('completed');
    expect(logs[0].durationSeconds).toBe(45);

    const summary = engine.getDailySummary();
    expect(summary.movementBreaksCompleted).toBe(1);
  });
});
