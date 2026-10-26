const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { ReminderEngine } = require('../dist-test/shared/reminderEngine.js');
const { DEFAULT_SETTINGS } = require('../dist-test/shared/types.js');
const { calculateWellnessScore } = require('../dist-test/shared/wellnessScore.js');

describe('ReminderEngine Tests', () => {
  let engine;
  beforeEach(() => { engine = new ReminderEngine(DEFAULT_SETTINGS); });

  test('increments active session when user is active', () => {
    engine.tick(0, 100000);
    const status = engine.getStatus();
    assert.equal(status.activeScreenSeconds, 1);
    assert.equal(status.currentContinuousSeconds, 1);
    assert.equal(status.isIdle, false);
  });

  test('does not increment active session when user is idle past threshold', () => {
    engine.tick(200, 100000);
    const status = engine.getStatus();
    assert.equal(status.activeScreenSeconds, 0);
    assert.equal(status.isIdle, true);
    assert.equal(status.idleSeconds, 1);
  });

  test('resets continuous session after 10 minutes of inactivity', () => {
    for (let i = 0; i < 500; i++) engine.tick(0, 100000 + i * 1000);
    assert.equal(engine.getStatus().currentContinuousSeconds, 500);
    engine.tick(600, 700000);
    assert.equal(engine.getStatus().currentContinuousSeconds, 0);
  });

  test('triggers 20-20-20 eye break when due timestamp is reached', () => {
    const baseTime = 1700000000000;
    const devEngine = new ReminderEngine({ ...DEFAULT_SETTINGS, devTestMode: true }, 0, baseTime);
    let event = devEngine.tick(0, baseTime + 10000);
    assert.equal(event, null);
    event = devEngine.tick(0, baseTime + 21000);
    assert.notEqual(event, null);
    assert.equal(event.type, 'eye-break');
    assert.ok(event.title.includes('20-20-20'));
  });

  test('respects quiet hours and suppresses reminders', () => {
    const engineWithQuiet = new ReminderEngine({
      ...DEFAULT_SETTINGS,
      devTestMode: true,
      quietHours: { enabled: true, start: '22:00', end: '07:00' },
    });
    const lateNightDate = new Date('2026-10-26T23:30:00');
    assert.equal(engineWithQuiet.isQuietHours(lateNightDate.getTime()), true);
    const event = engineWithQuiet.tick(0, lateNightDate.getTime() + 100000);
    assert.equal(event, null);
  });

  test('snooze delays reminder by configured snooze period', () => {
    const now = 1700000000000;
    engine.snoozeBreak('eye-break', now);
    const logs = engine.getBreakLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'snoozed');
    const nextList = engine.getNextReminders(now);
    const eyeReminder = nextList.find(r => r.type === 'eye-break');
    assert.ok(eyeReminder !== undefined);
    assert.ok(eyeReminder.secondsRemaining >= 295);
  });

  test('complete break records positive log and recalculates schedule', () => {
    const now = 1700000000000;
    engine.startBreak('posture-stretch');
    engine.completeBreak('posture-stretch', 45, now);
    const logs = engine.getBreakLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'completed');
    assert.equal(logs[0].durationSeconds, 45);
    const summary = engine.getDailySummary(new Date(now).toISOString().split('T')[0]);
    assert.equal(summary.movementBreaksCompleted, 1);
  });
});

describe('calculateWellnessScore Tests', () => {
  test('returns high score for regular breaks and moderate screen time', () => {
    const logs = [
      { id: '1', type: 'eye-break', timestamp: 1, action: 'completed', durationSeconds: 20 },
      { id: '2', type: 'eye-break', timestamp: 2, action: 'completed', durationSeconds: 20 },
      { id: '3', type: 'eye-break', timestamp: 3, action: 'completed', durationSeconds: 20 },
      { id: '4', type: 'posture-stretch', timestamp: 4, action: 'completed', durationSeconds: 45 },
      { id: '5', type: 'stand-move', timestamp: 5, action: 'completed', durationSeconds: 60 },
    ];
    const result = calculateWellnessScore(7200, 6, logs);
    assert.ok(result.score >= 80);
    assert.equal(result.rating, 'Exceptional');
    assert.equal(result.breakAdherencePct, 100);
    assert.equal(result.screenTimeStatus, 'Optimal');
  });

  test('penalizes skipped breaks and excessive screen time', () => {
    const logs = [
      { id: '1', type: 'eye-break', timestamp: 1, action: 'skipped', durationSeconds: 0 },
      { id: '2', type: 'stand-move', timestamp: 2, action: 'skipped', durationSeconds: 0 },
      { id: '3', type: 'walking', timestamp: 3, action: 'skipped', durationSeconds: 0 },
    ];
    const result = calculateWellnessScore(36000, 6, logs);
    assert.ok(result.score <= 45);
    assert.equal(result.breakAdherencePct, 0);
    assert.equal(result.screenTimeStatus, 'Excessive');
    assert.equal(result.rating, 'Needs Attention');
  });
});
