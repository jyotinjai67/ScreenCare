import { describe, test, expect } from 'vitest';
import {
  ReminderEngine,
  ReminderDueEvent,
  normalizeSettings,
  minutesToMs,
  msToSeconds,
  getReminderIntervalMs,
  TRACKED_REMINDER_TYPES,
} from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, ReminderType, UserSettings } from '../shared/types';

/**
 * Regression suite for the "preferences save but timers don't update" defect and the full scheduling
 * audit. Every test uses explicit timestamps (fake clock) — no real timers, no timing luck.
 */

const T0 = 1_760_000_000_000; // fixed epoch for deterministic tests
const MIN = 60_000;

function fresh(): UserSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function remaining(engine: ReminderEngine, type: ReminderType, now: number): number {
  const r = engine.getNextReminders(now).find((x) => x.type === type);
  if (!r) throw new Error(`no countdown for ${type}`);
  return r.secondsRemaining;
}

function dueMap(engine: ReminderEngine, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of engine.getNextReminders(now)) out[r.type] = r.nextDueTimestamp;
  return out;
}

/** Simulates the renderer: settings arrive as a structured clone of the snapshot, get edited, are sent back. */
function rendererEdit(engine: ReminderEngine, edit: (s: UserSettings) => void): UserSettings {
  const s = JSON.parse(JSON.stringify(engine.getSettings()));
  edit(s);
  return s;
}

function runTicks(engine: ReminderEngine, from: number, seconds: number, idle = 0): ReminderDueEvent[] {
  const events: ReminderDueEvent[] = [];
  for (let i = 1; i <= seconds; i++) {
    const ev = engine.tick(idle, from + i * 1000);
    if (ev) events.push(ev);
  }
  return events;
}

describe('Preferences → running schedule (root-cause regression)', () => {
  test('1. Eye Rest 20 → 2 min: engine config, countdown and persisted cycle all update at save time', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    runTicks(engine, T0, 300); // 5 minutes of activity
    const saveAt = T0 + 300_000;
    expect(remaining(engine, 'eye-break', saveAt)).toBe(15 * 60);

    engine.updateSettings(rendererEdit(engine, (s) => (s.eyeBreak.intervalMinutes = 2)), saveAt);

    expect(engine.getSettings().eyeBreak.intervalMinutes).toBe(2);
    expect(remaining(engine, 'eye-break', saveAt)).toBe(120); // displayed countdown, immediately
    const persisted = engine.getCycleInfo()['eye-break'];
    expect(persisted.scheduledTime).toBe(saveAt + 2 * MIN);
    const rem = engine.getNextReminders(saveAt).find((r) => r.type === 'eye-break')!;
    expect(rem.intervalSeconds).toBe(120);
  });

  test('2. Neck/Posture 45 → 1 min: next notification fires exactly 1 min after the save (policy)', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const events: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => events.push(e));
    const saveAt = T0 + 10 * MIN;
    engine.updateSettings(rendererEdit(engine, (s) => (s.postureStretch.intervalMinutes = 1)), saveAt);

    for (let s = 1; s < 60; s++) expect(engine.tick(0, saveAt + s * 1000)).toBeNull();
    const ev = engine.tick(0, saveAt + 60_000);
    expect(ev?.type).toBe('posture-stretch');
    expect(events).toHaveLength(1);
    // And the next cycle follows the new interval as well
    expect(remaining(engine, 'posture-stretch', saveAt + 60_000)).toBe(60);
  });

  test('2b. Increasing an interval (20 → 60) also restarts from save time', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const saveAt = T0 + 5 * MIN;
    engine.updateSettings(rendererEdit(engine, (s) => (s.eyeBreak.intervalMinutes = 60)), saveAt);
    expect(remaining(engine, 'eye-break', saveAt)).toBe(3600);
  });

  test('2c. In-place edits of getSettings() cannot corrupt engine state (no shared references)', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const s = engine.getSettings();
    s.eyeBreak.intervalMinutes = 60; // mutate the returned copy only
    expect(engine.getSettings().eyeBreak.intervalMinutes).toBe(20);
    engine.updateSettings(s, T0 + 5 * MIN);
    expect(remaining(engine, 'eye-break', T0 + 5 * MIN)).toBe(3600);
    // DEFAULT_SETTINGS is never mutated by engines
    engine.pauseReminder('walking', T0 + 5 * MIN);
    expect(DEFAULT_SETTINGS.walking.paused).toBe(false);
  });

  test('3. Changing one interval leaves every other reminder due timestamp and cycle ID unchanged', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    runTicks(engine, T0, 120);
    const saveAt = T0 + 120_000;
    const before = dueMap(engine, saveAt);
    const idsBefore = engine.getCycleInfo();

    engine.updateSettings(rendererEdit(engine, (s) => (s.eyeBreak.intervalMinutes = 7)), saveAt);
    const after = dueMap(engine, saveAt);
    const idsAfter = engine.getCycleInfo();

    expect(after['eye-break']).toBe(saveAt + 7 * MIN);
    for (const t of ['posture-stretch', 'stand-move', 'walking'] as ReminderType[]) {
      expect(after[t]).toBe(before[t]);
      expect(idsAfter[t].cycleId).toBe(idsBefore[t].cycleId);
    }
  });

  test('3b. Saving unchanged preferences changes nothing', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const saveAt = T0 + 3 * MIN;
    const before = engine.getCycleInfo();
    engine.updateSettings(rendererEdit(engine, (s) => (s.theme = 'light')), saveAt);
    expect(engine.getCycleInfo()).toEqual(before);
  });

  test('4. Disabling / re-enabling one reminder does not reset unrelated timers', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const t1 = T0 + 4 * MIN;
    const before = dueMap(engine, t1);
    engine.updateSettings(rendererEdit(engine, (s) => (s.standMove.enabled = false)), t1);
    let after = dueMap(engine, t1);
    expect(after['stand-move']).toBeUndefined();
    for (const t of ['eye-break', 'posture-stretch', 'walking']) expect(after[t]).toBe(before[t]);

    const t2 = T0 + 9 * MIN;
    engine.updateSettings(rendererEdit(engine, (s) => (s.standMove.enabled = true)), t2);
    after = dueMap(engine, t2);
    expect(after['stand-move']).toBe(t2 + 60 * MIN);
    for (const t of ['eye-break', 'posture-stretch', 'walking']) expect(after[t]).toBe(before[t]);
  });

  test('4b. Individually pausing one reminder via settings freezes only that reminder', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const t1 = T0 + 5 * MIN;
    engine.updateSettings(rendererEdit(engine, (s) => (s.walking.paused = true)), t1);
    const t2 = t1 + 30 * MIN;
    expect(remaining(engine, 'walking', t2)).toBe(85 * 60);
    expect(remaining(engine, 'posture-stretch', t2)).toBe(10 * 60);
    engine.updateSettings(rendererEdit(engine, (s) => (s.walking.paused = false)), t2);
    expect(remaining(engine, 'walking', t2)).toBe(85 * 60);
  });

  test('5. A saved interval survives a full restart (persist → new engine → restore)', () => {
    const engine1 = new ReminderEngine(fresh(), 0, T0);
    const saveAt = T0 + 5 * MIN;
    engine1.updateSettings(rendererEdit(engine1, (s) => (s.eyeBreak.intervalMinutes = 2)), saveAt);
    const persistedAt = saveAt + 30_000;
    const stored = JSON.parse(
      JSON.stringify({
        settings: engine1.getSettings(),
        cycles: engine1.getCycleInfo(),
        deliveredCycleIds: engine1.getDeliveredCycleIds(),
        savedAt: persistedAt,
      })
    );

    // App is closed for 3 hours, then restarted
    const restartAt = persistedAt + 3 * 60 * MIN;
    const engine2 = new ReminderEngine(normalizeSettings(stored.settings), 0, restartAt);
    engine2.setDeliveredCycleIds(stored.deliveredCycleIds);
    engine2.setCycleInfo(stored.cycles, restartAt, stored.savedAt);

    expect(engine2.getSettings().eyeBreak.intervalMinutes).toBe(2);
    // Startup policy: app-off time is frozen → the 90 s that were left are restored
    expect(remaining(engine2, 'eye-break', restartAt)).toBe(90);
    expect(remaining(engine2, 'posture-stretch', restartAt)).toBe(45 * 60 - 5 * 60 - 30);
    // No burst on startup
    expect(runTicks(engine2, restartAt, 89)).toHaveLength(0);
    expect(engine2.tick(0, restartAt + 90_000)?.type).toBe('eye-break');
  });

  test('6. Minute / second / millisecond conversions are consistent', () => {
    expect(minutesToMs(1)).toBe(60_000);
    expect(minutesToMs(20)).toBe(1_200_000);
    expect(msToSeconds(1_200_000)).toBe(1200);
    expect(msToSeconds(-5)).toBe(0);
    const s = fresh();
    expect(getReminderIntervalMs(s, 'walking')).toBe(90 * 60_000);
    s.devTestMode = true;
    expect(getReminderIntervalMs(s, 'eye-break')).toBe(20_000);
    // Strings / garbage from the UI are validated, never interpreted as seconds or ms
    const n = normalizeSettings({ ...fresh(), eyeBreak: { ...fresh().eyeBreak, intervalMinutes: '2' } }, fresh());
    expect(n.eyeBreak.intervalMinutes).toBe(2);
    const bad = normalizeSettings({ ...fresh(), eyeBreak: { ...fresh().eyeBreak, intervalMinutes: 'abc' } }, fresh());
    expect(bad.eyeBreak.intervalMinutes).toBe(20); // falls back to the previous value
    const zero = normalizeSettings({ ...fresh(), eyeBreak: { ...fresh().eyeBreak, intervalMinutes: 0 } }, fresh());
    expect(zero.eyeBreak.intervalMinutes).toBe(1);
  });

  test('17. Snapshot only contains the four scheduled reminders (no phantom viewing-distance countdown)', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    // 40 minutes in: the legacy viewing-distance pseudo-cycle used to sit at "Due now" forever,
    // sort first, and be shown as the headline "next reminder" regardless of saved preferences.
    runTicks(engine, T0, 40 * 60, 9999); // idle so nothing fires
    const list = engine.getNextReminders(T0 + 40 * MIN);
    expect(list.map((r) => r.type).sort()).toEqual([...TRACKED_REMINDER_TYPES].sort());
    expect(list.some((r) => r.type === 'viewing-distance')).toBe(false);

    // Legacy persisted state containing an overdue viewing-distance cycle is ignored on restore
    const engine2 = new ReminderEngine(fresh(), 0, T0);
    engine2.setCycleInfo(
      { 'viewing-distance': { cycleId: 'vd-old', type: 'viewing-distance', scheduledTime: T0 - 60 * MIN, status: 'scheduled' } } as any,
      T0
    );
    expect(engine2.getNextReminders(T0).some((r) => r.type === 'viewing-distance')).toBe(false);
  });

  test('17b. getNextReminders is a pure read (no schedule mutation)', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    const before = engine.getCycleInfo();
    engine.getNextReminders(T0 + 1000);
    engine.getNextReminders(T0 + 999 * MIN);
    expect(engine.getCycleInfo()).toEqual(before);
  });
});

describe('Grouping, queue semantics and deduplication', () => {
  function allDueAt(types: ReminderType[], minutes: number): UserSettings {
    const s = fresh();
    const map: Record<string, keyof UserSettings> = {
      'eye-break': 'eyeBreak',
      'posture-stretch': 'postureStretch',
      'stand-move': 'standMove',
      walking: 'walking',
    };
    for (const t of TRACKED_REMINDER_TYPES) {
      (s[map[t]] as any).intervalMinutes = types.includes(t) ? minutes : 600;
    }
    return s;
  }

  test('7. Compatible simultaneous reminders are grouped; Eye Rest keeps its 20-20-20 instruction', () => {
    const engine = new ReminderEngine(allDueAt(['eye-break', 'walking'], 5), 0, T0);
    const ev = engine.tick(0, T0 + 5 * MIN)!;
    expect(ev.isGrouped).toBe(true);
    expect(ev.groupedTypes).toEqual(['eye-break', 'walking']);
    expect(ev.instruction).toMatch(/20 seconds/);
    expect(engine.getBreakLogs()).toHaveLength(0); // walking does not prove eye rest completion

    const e2 = new ReminderEngine(allDueAt(['stand-move', 'walking', 'posture-stretch'], 5), 0, T0);
    const ev2 = e2.tick(0, T0 + 5 * MIN)!;
    expect(ev2.isGrouped).toBe(true);
    expect(ev2.groupedTypes).toHaveLength(3);
  });

  test('8. Incompatible simultaneous reminders are delivered one at a time, nothing discarded', () => {
    const engine = new ReminderEngine(allDueAt(['eye-break', 'posture-stretch'], 5), 0, T0);
    const due = T0 + 5 * MIN;
    const first = engine.tick(0, due)!;
    const second = engine.tick(0, due + 1000)!;
    expect(first.isGrouped).toBeFalsy();
    expect([first.type, second.type]).toEqual(['eye-break', 'posture-stretch']);
    expect(engine.tick(0, due + 2000)).toBeNull();
  });

  test('9. A cycle is delivered at most once, including across restart with delivered IDs restored', () => {
    const engine = new ReminderEngine(allDueAt(['eye-break'], 2), 0, T0);
    const events = runTicks(engine, T0, 2 * 60 + 30);
    expect(events).toHaveLength(1);
    const ids = new Set(events.map((e) => e.cycleId));
    expect(ids.size).toBe(1);

    // Restart where a stale persisted cycle has the already-delivered ID
    const stale = engine.getCycleInfo();
    stale['eye-break'] = { ...stale['eye-break'], cycleId: events[0].cycleId, scheduledTime: T0 + 2 * MIN };
    const e2 = new ReminderEngine(allDueAt(['eye-break'], 2), 0, T0 + 3 * MIN);
    e2.setDeliveredCycleIds(engine.getDeliveredCycleIds());
    e2.setCycleInfo(stale, T0 + 3 * MIN);
    expect(e2.tick(0, T0 + 3 * MIN + 1000)).toBeNull();
  });

  test('10. Notifying / dismissing never records completion; preview never touches schedules', () => {
    const engine = new ReminderEngine(allDueAt(['eye-break', 'walking'], 1), 0, T0);
    runTicks(engine, T0, 5 * 60);
    const summary = engine.getDailySummary(undefined, T0 + 5 * MIN);
    expect(summary.eyeBreaksCompleted).toBe(0);
    expect(summary.movementBreaksCompleted).toBe(0);

    const before = engine.getCycleInfo();
    const delivered = engine.getDeliveredCycleIds();
    engine.previewReminder('eye-break', T0 + 5 * MIN);
    expect(engine.getCycleInfo()).toEqual(before);
    expect(engine.getDeliveredCycleIds()).toEqual(delivered);
  });
});

describe('Lock / sleep / user pause', () => {
  test('11. Lock with 40 s left, stay locked 20 min → exactly 40 s left after unlock', () => {
    const s = fresh();
    s.eyeBreak.intervalMinutes = 2;
    const engine = new ReminderEngine(s, 0, T0);
    const lockAt = T0 + 80_000; // 40 s left
    runTicks(engine, T0, 80);
    expect(remaining(engine, 'eye-break', lockAt)).toBe(40);
    engine.setLocked(true, lockAt);
    expect(remaining(engine, 'eye-break', lockAt + 20 * MIN)).toBe(40);
    const unlockAt = lockAt + 20 * MIN;
    engine.setLocked(false, unlockAt);
    expect(remaining(engine, 'eye-break', unlockAt)).toBe(40);
    expect(runTicks(engine, unlockAt, 39)).toHaveLength(0);
    expect(engine.tick(0, unlockAt + 40_000)?.type).toBe('eye-break');
  });

  test('12. No notifications and no active-time accumulation while locked or asleep', () => {
    const s = fresh();
    s.eyeBreak.intervalMinutes = 1;
    const engine = new ReminderEngine(s, 0, T0);
    const events: ReminderDueEvent[] = [];
    engine.setOnReminderDue((e) => events.push(e));
    engine.setLocked(true, T0);
    runTicks(engine, T0, 600);
    engine.setLocked(false, T0 + 600_000);
    engine.setSuspended(true, T0 + 600_000);
    runTicks(engine, T0 + 600_000, 600);
    expect(events).toHaveLength(0);
    expect(engine.getStatus().activeScreenSeconds).toBe(0);
  });

  test('13. Repeated / duplicated lock-unlock and suspend-resume events introduce no drift', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    let now = T0;
    for (let i = 0; i < 25; i++) {
      now += 7_000; // 7 s active
      engine.setLocked(true, now);
      engine.setLocked(true, now); // duplicate event
      engine.setSuspended(true, now + 1000);
      now += 10 * MIN; // away
      engine.setSuspended(false, now); // wakes to a still-locked session → stays frozen
      expect(engine.isSystemPaused()).toBe(true);
      engine.setLocked(false, now);
      engine.setLocked(false, now); // duplicate event
    }
    // 25 × 7 s of active time elapsed in total
    expect(remaining(engine, 'eye-break', now)).toBe(20 * 60 - 25 * 7);
    expect(remaining(engine, 'walking', now)).toBe(90 * 60 - 25 * 7);
  });

  test('13b. Saving an interval while locked holds the full new interval until unlock', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    engine.setLocked(true, T0 + MIN);
    engine.updateSettings(rendererEdit(engine, (s) => (s.eyeBreak.intervalMinutes = 3)), T0 + 2 * MIN);
    expect(remaining(engine, 'eye-break', T0 + 30 * MIN)).toBe(180);
    engine.setLocked(false, T0 + 30 * MIN);
    expect(remaining(engine, 'eye-break', T0 + 31 * MIN)).toBe(120);
  });

  test('13c. Individually paused reminder stays paused through lock/unlock', () => {
    const engine = new ReminderEngine(fresh(), 0, T0);
    engine.updateSettings(rendererEdit(engine, (s) => (s.eyeBreak.paused = true)), T0 + 5 * MIN);
    engine.setLocked(true, T0 + 6 * MIN);
    engine.setLocked(false, T0 + 7 * MIN);
    expect(remaining(engine, 'eye-break', T0 + 60 * MIN)).toBe(15 * 60);
    const evs = runTicks(engine, T0 + 60 * MIN, 30);
    expect(evs.some((e) => e.type === 'eye-break' || e.groupedTypes?.includes('eye-break'))).toBe(false);
  });

  test('13d. User "pause reminders" freezes countdowns and resumes without a burst', () => {
    const s = fresh();
    s.eyeBreak.intervalMinutes = 2;
    const engine = new ReminderEngine(s, 0, T0);
    engine.pause(60, T0 + 30_000);
    expect(remaining(engine, 'eye-break', T0 + 50 * MIN)).toBe(90);
    // Auto-resume when the pause window ends
    expect(runTicks(engine, T0 + 60 * MIN + 30_000, 1)).toHaveLength(0);
    expect(engine.getStatus().isPaused).toBe(false);
    expect(remaining(engine, 'eye-break', T0 + 60 * MIN + 31_000)).toBe(90);
  });

  test('14. Restart while locked keeps timers frozen until unlock; no stale replay', () => {
    const engine1 = new ReminderEngine(fresh(), 0, T0);
    engine1.setLocked(true, T0 + 5 * MIN);
    const stored = JSON.parse(JSON.stringify({ cycles: engine1.getCycleInfo(), savedAt: T0 + 6 * MIN }));

    const restartAt = T0 + 50 * MIN;
    const engine2 = new ReminderEngine(fresh(), 0, restartAt);
    engine2.setLocked(true, restartAt); // OS reports locked at startup
    engine2.setCycleInfo(stored.cycles, restartAt, stored.savedAt);
    expect(runTicks(engine2, restartAt, 600)).toHaveLength(0);
    engine2.setLocked(false, restartAt + 600_000);
    expect(remaining(engine2, 'eye-break', restartAt + 600_000)).toBe(15 * 60);
  });

  test('F. Active screen time does not reset reminder intervals and rolls over daily', () => {
    const engine = new ReminderEngine(fresh(), 3600, T0);
    runTicks(engine, T0, 10, 9999); // idle ticks
    expect(remaining(engine, 'eye-break', T0 + 10_000)).toBe(20 * 60 - 10);
    const nextDay = T0 + 24 * 60 * MIN;
    engine.tick(0, nextDay);
    expect(engine.getStatus().activeScreenSeconds).toBe(1);
  });
});

describe('Malformed persisted data', () => {
  test('16. Corrupt / partial settings and cycles never crash and never reset valid preferences', () => {
    const partial = { eyeBreak: { intervalMinutes: 7 }, walking: null, theme: 'neon', idleThresholdMinutes: 'x' };
    const n = normalizeSettings(partial, DEFAULT_SETTINGS);
    expect(n.eyeBreak.intervalMinutes).toBe(7);
    expect(n.eyeBreak.enabled).toBe(true);
    expect(n.walking).toEqual(DEFAULT_SETTINGS.walking);
    expect(n.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(n.idleThresholdMinutes).toBe(DEFAULT_SETTINGS.idleThresholdMinutes);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('garbage')).toEqual(DEFAULT_SETTINGS);

    const engine = new ReminderEngine(n, NaN as any, T0);
    expect(() =>
      engine.setCycleInfo(
        {
          'eye-break': { cycleId: 5, scheduledTime: 'soon' },
          'posture-stretch': null,
          'stand-move': { cycleId: 'stand-move-disabled', type: 'stand-move', scheduledTime: 0, status: 'completed' },
        } as any,
        T0
      )
    ).not.toThrow();
    // Enabled reminders with unusable persisted cycles get a fresh, correct cycle
    expect(remaining(engine, 'eye-break', T0)).toBe(7 * 60);
    expect(remaining(engine, 'posture-stretch', T0)).toBe(45 * 60);
    expect(remaining(engine, 'stand-move', T0)).toBe(60 * 60);
    expect(engine.getStatus().activeScreenSeconds).toBe(0);
    expect(() => engine.setCycleInfo(undefined as any, T0)).not.toThrow();
    expect(() => engine.setBreakLogs('nope' as any)).not.toThrow();
  });
});
