import { describe, test, expect } from 'vitest';
import {
  ReminderEngine,
  ReminderDueEvent,
  areActivitiesCompatible,
  getGroupedReminderContent,
  normalizeSettings,
} from '../shared/reminderEngine';
import {
  classifyAbsence,
  isNearlyDue,
  groupingWindowMs,
  deriveAdaptiveAdjustments,
  RETURN_BACKLOG_SPACING_MS,
  PRESENTATION_GAP_MS,
} from '../shared/adaptivePolicy';
import { DEFAULT_SETTINGS, UserSettings, AdaptiveSettings, ReminderType } from '../shared/types';

/**
 * Adaptive, context-aware reminder engine — deterministic fake-clock tests.
 *
 * Every test drives the engine with explicit timestamps (no real timers). Intervals are deliberately
 * unusual custom values (7, 9, 11, 13, 17, 23 … minutes) so nothing can pass by relying on a hardcoded
 * 20/30/60/90 schedule.
 */

const T0 = Date.UTC(2026, 9, 28, 9, 0, 0);
const SEC = 1000;
const MIN = 60 * SEC;

type Intervals = Partial<Record<'eye' | 'posture' | 'stand' | 'walk', number | null>>;

function makeSettings(iv: Intervals, adaptive: Partial<AdaptiveSettings> = {}, extra: Partial<UserSettings> = {}): UserSettings {
  const cfg = (minutes: number | null | undefined, fallback: number, durationSeconds: number) => ({
    enabled: minutes !== null,
    intervalMinutes: minutes ?? fallback,
    durationSeconds,
    snoozeMinutes: 5,
    soundEnabled: false,
    paused: false,
  });
  return normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...extra,
    eyeBreak: cfg(iv.eye, 41, 20),
    postureStretch: cfg(iv.posture, 43, 30),
    standMove: cfg(iv.stand, 47, 60),
    walking: cfg(iv.walk, 53, 120),
    adaptive: { ...DEFAULT_SETTINGS.adaptive, ...adaptive },
  });
}

function collect(engine: ReminderEngine): ReminderDueEvent[] {
  const events: ReminderDueEvent[] = [];
  engine.setOnReminderDue((e) => events.push(e));
  return events;
}

/** Ticks once per second over (from, to], with an optional idle-seconds function. */
function run(engine: ReminderEngine, from: number, to: number, idle: (t: number) => number = () => 0) {
  for (let t = from + SEC; t <= to; t += SEC) engine.tick(idle(t), t);
}

const due = (e: ReminderEngine, type: ReminderType, now: number) => e.getNextReminders(now).find((r) => r.type === type)!;

describe('Absence classification and nearly-due rules (pure policy)', () => {
  test('absences are classified only by the configured thresholds', () => {
    const a = makeSettings({}, { longAbsenceMinutes: 8 }).adaptive;
    expect(classifyAbsence(10 * SEC, a)).toBe('momentary');
    expect(classifyAbsence(7 * MIN + 59 * SEC, a)).toBe('short');
    expect(classifyAbsence(8 * MIN, a)).toBe('long');
    const b = makeSettings({}, { longAbsenceMinutes: 45 }).adaptive;
    expect(classifyAbsence(30 * MIN, b)).toBe('short');
    expect(classifyAbsence(45 * MIN, b)).toBe('long');
  });

  test('nearly due is relative to each reminder’s own configured interval', () => {
    const a = makeSettings({}, { nearlyDuePercent: 25 }).adaptive;
    // 60 s left is nearly due for a 7-minute reminder (14%) but not for a 3-minute one (33%)
    expect(isNearlyDue(60 * SEC, 7 * MIN, a)).toBe(true);
    expect(isNearlyDue(60 * SEC, 3 * MIN, a)).toBe(false);
    expect(isNearlyDue(0, 3 * MIN, a)).toBe(true); // overdue
    expect(isNearlyDue(-5 * MIN, 3 * MIN, a)).toBe(true);
  });

  test('grouping window is bounded by the configured window and 10% of the reminder’s interval', () => {
    const a = makeSettings({}, { groupingWindowSeconds: 90 }).adaptive;
    expect(groupingWindowMs(11 * MIN, a)).toBe(66 * SEC);
    expect(groupingWindowMs(37 * MIN, a)).toBe(90 * SEC);
    expect(groupingWindowMs(37 * MIN, { ...a, enabled: false })).toBe(0);
  });

  test('adaptive preferences are validated and clamped', () => {
    const s = normalizeSettings({
      ...DEFAULT_SETTINGS,
      adaptive: { enabled: 'yes', longAbsenceMinutes: 0, settlingMinutes: 999, nearlyDuePercent: 'abc', groupingWindowSeconds: -3 },
    });
    expect(s.adaptive.enabled).toBe(true);
    expect(s.adaptive.longAbsenceMinutes).toBe(2);
    expect(s.adaptive.settlingMinutes).toBe(30);
    expect(s.adaptive.nearlyDuePercent).toBe(DEFAULT_SETTINGS.adaptive.nearlyDuePercent);
    expect(s.adaptive.groupingWindowSeconds).toBe(0);
    // legacy settings without an adaptive block get the defaults
    const legacy: any = { ...DEFAULT_SETTINGS };
    delete legacy.adaptive;
    expect(normalizeSettings(legacy).adaptive).toEqual(DEFAULT_SETTINGS.adaptive);
  });
});

describe('Custom user-configured intervals', () => {
  test('arbitrary intervals fire exactly on their own schedules', () => {
    const e = new ReminderEngine(makeSettings({ eye: 7, posture: 13, stand: 29, walk: null }, { groupingWindowSeconds: 0 }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 30 * MIN);
    const times = (type: ReminderType) =>
      events.filter((ev) => ev.type === type || ev.groupedTypes?.includes(type)).map((ev) => (ev.dueTimestamp - T0) / MIN);
    expect(times('eye-break')).toEqual([7, 14, 21, 28]);
    expect(times('posture-stretch')).toEqual([13, 26]);
    expect(times('stand-move')).toEqual([29]);
  });
});

describe('Smart return-from-break', () => {
  // Eye Rest 17 min; lock with 1 minute left; away 40 minutes (long, default threshold 15 min)
  function lockWithOneMinuteLeft(adaptive: Partial<AdaptiveSettings> = {}) {
    const e = new ReminderEngine(makeSettings({ eye: 17, posture: 53, stand: 71, walk: 97 }, adaptive), 0, T0);
    const events = collect(e);
    const lockAt = T0 + 16 * MIN;
    run(e, T0, lockAt);
    expect(due(e, 'eye-break', lockAt).secondsRemaining).toBe(60);
    e.setLocked(true, lockAt);
    const unlockAt = lockAt + 40 * MIN;
    run(e, lockAt, unlockAt); // ticks while locked do nothing
    e.setLocked(false, unlockAt);
    return { e, events, lockAt, unlockAt };
  }

  test('a nearly-due reminder does not interrupt the user right after a long break', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft();
    // Exact countdown preserved — the policy never rewrites the schedule
    expect(due(e, 'eye-break', unlockAt).secondsRemaining).toBe(60);
    expect(due(e, 'eye-break', unlockAt).nextDueTimestamp).toBe(unlockAt + 60 * SEC);
    expect(due(e, 'eye-break', unlockAt).settlingUntil).toBe(unlockAt + 3 * MIN);
    expect(e.getAbsenceHistory().slice(-1)[0]).toMatchObject({ kind: 'long', source: 'lock', durationMs: 40 * MIN, heldCount: 1 });
    expect(e.getAdaptiveStatus(unlockAt + 1 * SEC).phase).toBe('settling');

    run(e, unlockAt, unlockAt + 3 * MIN - SEC);
    expect(events).toHaveLength(0); // not after 1 minute, not anywhere inside the settling period
    e.tick(0, unlockAt + 3 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('eye-break');
    // Next Eye Rest cycle uses the configured interval from delivery
    expect(due(e, 'eye-break', unlockAt + 3 * MIN).nextDueTimestamp).toBe(unlockAt + 3 * MIN + 17 * MIN);
    expect(e.getAdaptiveStatus(unlockAt + 3 * MIN).phase).toBe('active');
  });

  test('other reminders keep their original schedules during settling', () => {
    const { e, events, lockAt, unlockAt } = lockWithOneMinuteLeft();
    const before = e.getNextReminders(unlockAt).filter((r) => r.type !== 'eye-break');
    expect(before.map((r) => r.nextDueTimestamp)).toEqual(
      before.map((r) => unlockAt + (r.intervalSeconds! * SEC - (lockAt - T0)))
    );
    run(e, unlockAt, unlockAt + 4 * MIN);
    expect(events).toHaveLength(1);
    const after = e.getNextReminders(unlockAt + 4 * MIN).filter((r) => r.type !== 'eye-break');
    for (const r of before) {
      const a = after.find((x) => x.type === r.type)!;
      expect(a.nextDueTimestamp).toBe(r.nextDueTimestamp);
      expect(a.cycleId).toBe(r.cycleId);
      expect(a.settlingUntil).toBeUndefined();
    }
  });

  test('the settling period is not extended by duplicate unlock / resume / momentary lock events', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft();
    run(e, unlockAt, unlockAt + 60 * SEC);
    e.setLocked(false, unlockAt + 60 * SEC); // duplicate unlock
    e.setSuspended(false, unlockAt + 90 * SEC); // spurious resume
    e.handleWakeOrResume(unlockAt + 95 * SEC);
    run(e, unlockAt + 60 * SEC, unlockAt + 100 * SEC);
    e.setLocked(true, unlockAt + 100 * SEC); // a quick Win+L …
    e.setLocked(false, unlockAt + 110 * SEC); // … 10 s later (momentary absence)
    run(e, unlockAt + 110 * SEC, unlockAt + 3 * MIN - SEC);
    expect(events).toHaveLength(0);
    e.tick(0, unlockAt + 3 * MIN);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
    expect(e.getAbsenceHistory().map((h) => h.kind)).toEqual(['long', 'momentary']);
  });

  test('a duplicate unlock/resume event does not end an inactivity absence (regression found in runtime e2e)', () => {
    const e = new ReminderEngine(makeSettings({ eye: 13, posture: null, stand: null, walk: null }), 0, T0);
    const lastInput = T0 + 2 * MIN;
    const idle = (t: number) => Math.max(0, Math.floor((t - lastInput) / SEC));
    run(e, T0, T0 + 6 * MIN, idle); // idle threshold (3 min) passed at T0+5m
    expect(e.getAdaptiveStatus(T0 + 6 * MIN)).toMatchObject({ phase: 'away', awaySince: lastInput, awaySource: 'idle' });
    e.setLocked(false, T0 + 6 * MIN); // spurious: the session was never locked
    e.setSuspended(false, T0 + 6 * MIN);
    expect(e.getAdaptiveStatus(T0 + 6 * MIN).phase).toBe('away');
    expect(e.getAbsenceHistory()).toHaveLength(0);
    e.tick(0, T0 + 30 * MIN); // real input again
    expect(e.getAbsenceHistory()[0]).toMatchObject({ source: 'idle', kind: 'long', durationMs: 28 * MIN });
  });

  test('short absences preserve the exact remaining countdown with no delay', () => {
    const e = new ReminderEngine(makeSettings({ eye: 9, posture: 53, stand: 71, walk: 97 }), 0, T0);
    const events = collect(e);
    const lockAt = T0 + 9 * MIN - 30 * SEC; // 30 s left (nearly due)
    run(e, T0, lockAt);
    e.setLocked(true, lockAt);
    const unlockAt = lockAt + 4 * MIN; // short
    e.setLocked(false, unlockAt);
    expect(e.getAbsenceHistory()[0].kind).toBe('short');
    run(e, unlockAt, unlockAt + 29 * SEC);
    expect(events).toHaveLength(0);
    e.tick(0, unlockAt + 30 * SEC);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
  });

  test('absence thresholds are user-configurable', () => {
    for (const [threshold, expectDelay] of [
      [45, false],
      [10, true],
    ] as const) {
      const e = new ReminderEngine(makeSettings({ eye: 13, posture: 61, stand: 73, walk: 89 }, { longAbsenceMinutes: threshold }), 0, T0);
      const events = collect(e);
      const lockAt = T0 + 12 * MIN;
      run(e, T0, lockAt);
      e.setLocked(true, lockAt);
      e.setLocked(false, lockAt + 20 * MIN);
      run(e, lockAt + 20 * MIN, lockAt + 21 * MIN);
      expect(events.length).toBe(expectDelay ? 0 : 1);
    }
  });

  test('settling duration is configurable and capped at the reminder’s own interval', () => {
    // settling 7 min, but this reminder's interval is only 2 min → held at most 2 min
    const e = new ReminderEngine(makeSettings({ eye: 2, posture: null, stand: null, walk: null }, { settlingMinutes: 7 }), 0, T0);
    const events = collect(e);
    const lockAt = T0 + 2 * MIN - 10 * SEC;
    run(e, T0, lockAt);
    e.setLocked(true, lockAt);
    const unlockAt = lockAt + 30 * MIN;
    e.setLocked(false, unlockAt);
    run(e, unlockAt, unlockAt + 2 * MIN - SEC);
    expect(events).toHaveLength(0);
    e.tick(0, unlockAt + 2 * MIN);
    expect(events).toHaveLength(1);
  });

  test('a reminder that is NOT nearly due fires exactly on time after a long absence', () => {
    const e = new ReminderEngine(makeSettings({ eye: 17, posture: null, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    const lockAt = T0 + 5 * MIN; // 12 of 17 minutes left
    run(e, T0, lockAt);
    e.setLocked(true, lockAt);
    const unlockAt = lockAt + 2 * 3600 * SEC;
    e.setLocked(false, unlockAt);
    expect(e.getAbsenceHistory()[0]).toMatchObject({ kind: 'long', heldCount: 0 });
    run(e, unlockAt, unlockAt + 12 * MIN - SEC);
    expect(events).toHaveLength(0);
    e.tick(0, unlockAt + 12 * MIN);
    expect(events).toHaveLength(1);
  });

  test('adaptive mode off restores the plain exact-countdown behaviour', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft({ enabled: false });
    run(e, unlockAt, unlockAt + 59 * SEC);
    expect(events).toHaveLength(0);
    e.tick(0, unlockAt + 60 * SEC);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
  });

  test('reminders are never postponed indefinitely while the user is present', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft({ settlingMinutes: 5 });
    // The user keeps working; the hold is a fixed point in time computed once at return.
    run(e, unlockAt, unlockAt + 5 * MIN);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
    expect(events[0].dueTimestamp).toBe(unlockAt + 5 * MIN);
  });

  test('changing an interval during settling only affects the edited reminder', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft();
    const t = unlockAt + 30 * SEC;
    run(e, unlockAt, t);
    const before = e.getNextReminders(t);
    const s = e.getSettings();
    s.standMove.intervalMinutes = 19;
    e.updateSettings(s, t);
    const after = e.getNextReminders(t);
    expect(after.find((r) => r.type === 'stand-move')!.nextDueTimestamp).toBe(t + 19 * MIN);
    for (const type of ['eye-break', 'posture-stretch', 'walking'] as ReminderType[]) {
      const b = before.find((r) => r.type === type)!;
      const a = after.find((r) => r.type === type)!;
      expect(a.nextDueTimestamp).toBe(b.nextDueTimestamp);
      expect(a.cycleId).toBe(b.cycleId);
      expect(a.settlingUntil).toBe(b.settlingUntil);
    }
    run(e, t, unlockAt + 3 * MIN);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
    expect(events[0].dueTimestamp).toBe(unlockAt + 3 * MIN);
  });

  test('editing the held reminder itself starts its new cycle normally (hold dropped, interval respected)', () => {
    const { e, events, unlockAt } = lockWithOneMinuteLeft();
    const s = e.getSettings();
    s.eyeBreak.intervalMinutes = 4;
    e.updateSettings(s, unlockAt + 10 * SEC);
    expect(due(e, 'eye-break', unlockAt + 10 * SEC).settlingUntil).toBeUndefined();
    run(e, unlockAt, unlockAt + 10 * SEC + 4 * MIN);
    expect(events.map((x) => x.dueTimestamp)).toEqual([unlockAt + 10 * SEC + 4 * MIN]);
  });
});

describe('No notifications while locked or asleep, no burst on return', () => {
  test('nothing is delivered while locked or asleep, even when holds expire meanwhile', () => {
    const e = new ReminderEngine(makeSettings({ eye: 11, posture: 13, stand: 23, walk: 31 }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 10 * MIN);
    e.setLocked(true, T0 + 10 * MIN);
    e.setLocked(false, T0 + 40 * MIN); // long → eye/posture held until +3 min
    e.setSuspended(true, T0 + 40 * MIN + 30 * SEC);
    run(e, T0 + 40 * MIN + 30 * SEC, T0 + 5 * 3600 * SEC, () => 0);
    expect(events).toHaveLength(0);
    expect(e.deliverPending(T0 + 5 * 3600 * SEC)).toBeNull();
  });

  test('long inactivity (unlocked) with every reminder overdue: one grouped notification after settling, no burst', () => {
    const e = new ReminderEngine(makeSettings({ eye: 9, posture: 14, stand: 23, walk: 31 }), 0, T0);
    const events = collect(e);
    const lastInput = T0 + 5 * MIN;
    const back = lastInput + 60 * MIN;
    const idle = (t: number) => (t > lastInput && t < back ? Math.floor((t - lastInput) / SEC) : 0);
    run(e, T0, back - SEC, idle);
    expect(events).toHaveLength(0); // idle: nothing presented while nobody is there
    e.tick(0, back);
    const rec = e.getAbsenceHistory()[0];
    expect(rec).toMatchObject({ source: 'idle', kind: 'long', startedAt: lastInput, endedAt: back, dueWhileAway: 4 });
    expect(rec.heldCount).toBe(4);
    run(e, back, back + 3 * MIN - SEC);
    expect(events).toHaveLength(0);
    e.tick(0, back + 3 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0].isGrouped).toBe(true);
    expect([...events[0].groupedTypes!].sort()).toEqual(['eye-break', 'posture-stretch', 'stand-move', 'walking']);
    expect(events[0].instruction).toMatch(/distant object for 20 seconds/);
    run(e, back + 3 * MIN, back + 8 * MIN);
    expect(events).toHaveLength(1); // nothing else until the next configured eye interval
  });

  test('incompatible overdue reminders after a long absence are spaced out, oldest first', () => {
    const e = new ReminderEngine(makeSettings({ eye: 9, posture: 7, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    const lastInput = T0 + 2 * MIN;
    const back = lastInput + 50 * MIN;
    const idle = (t: number) => (t > lastInput && t < back ? Math.floor((t - lastInput) / SEC) : 0);
    run(e, T0, back, idle);
    run(e, back, back + 3 * MIN + RETURN_BACKLOG_SPACING_MS - SEC);
    expect(events.map((x) => x.type)).toEqual(['posture-stretch']); // posture became due first (7 < 9 min)
    expect(events[0].dueTimestamp).toBe(back + 3 * MIN);
    e.tick(0, back + 3 * MIN + RETURN_BACKLOG_SPACING_MS);
    expect(events.map((x) => x.type)).toEqual(['posture-stretch', 'eye-break']);
    expect(events.every((x) => !x.isGrouped)).toBe(true);
  });
});

describe('Delivery queue and presentation', () => {
  test('while a panel is showing, other due reminders wait in their own cycles (not consumed)', () => {
    const e = new ReminderEngine(makeSettings({ eye: 5, posture: 5, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 5 * MIN);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
    e.setPresentationActive(true, T0 + 5 * MIN);
    const postureCycle = e.getCycleInfo()['posture-stretch'];
    run(e, T0 + 5 * MIN, T0 + 5 * MIN + 15 * SEC);
    expect(events).toHaveLength(1);
    expect(e.getCycleInfo()['posture-stretch']).toEqual(postureCycle); // still due, not marked notified
    const closedAt = T0 + 5 * MIN + 15 * SEC + 300;
    e.setPresentationActive(false, closedAt);
    expect(e.deliverPending(closedAt + PRESENTATION_GAP_MS - 1)).toBeNull();
    expect(e.deliverPending(closedAt + PRESENTATION_GAP_MS)?.type).toBe('posture-stretch');
  });

  test('a reminder queued behind a panel is not lost when the PC is locked', () => {
    const e = new ReminderEngine(makeSettings({ eye: 5, posture: 5, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 5 * MIN);
    e.setPresentationActive(true, T0 + 5 * MIN);
    run(e, T0 + 5 * MIN, T0 + 5 * MIN + 5 * SEC);
    e.setLocked(true, T0 + 5 * MIN + 5 * SEC); // panel dropped; posture never shown
    const unlockAt = T0 + 5 * MIN + 2 * MIN + 5 * SEC; // short absence
    e.setLocked(false, unlockAt);
    expect(e.isPresentationActive()).toBe(false);
    e.tick(0, unlockAt + SEC);
    expect(events.map((x) => x.type)).toEqual(['eye-break', 'posture-stretch']);
  });
});

describe('Activity-aware grouping', () => {
  test('a due reminder briefly waits for a compatible one about to become due (bounded window)', () => {
    // Stand due at 10 min, Walking at 11 min; Stand's window = min(60 s, 10% of 10 min) = 60 s
    const e = new ReminderEngine(makeSettings({ eye: null, posture: null, stand: 10, walk: 11 }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 11 * MIN - SEC);
    expect(events).toHaveLength(0);
    e.tick(0, T0 + 11 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0].groupedTypes).toEqual(['stand-move', 'walking']);
    // each keeps its own configured interval from delivery
    const at = T0 + 11 * MIN;
    expect(due(e, 'stand-move', at).nextDueTimestamp).toBe(at + 10 * MIN);
    expect(due(e, 'walking', at).nextDueTimestamp).toBe(at + 11 * MIN);
  });

  test('outside the window (or with look-ahead disabled) reminders are delivered separately on time', () => {
    for (const adaptive of [{ groupingWindowSeconds: 0 }, { groupingWindowSeconds: 20 }]) {
      const e = new ReminderEngine(makeSettings({ eye: null, posture: null, stand: 10, walk: 11 }, adaptive), 0, T0);
      const events = collect(e);
      run(e, T0, T0 + 11 * MIN);
      expect(events.map((x) => [x.type, (x.dueTimestamp - T0) / SEC])).toEqual([
        ['stand-move', 600],
        ['walking', 660],
      ]);
    }
  });

  test('eye rest + posture (incompatible) do not wait for each other', () => {
    const e = new ReminderEngine(makeSettings({ eye: 10, posture: 11, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 11 * MIN);
    expect(events.map((x) => (x.dueTimestamp - T0) / SEC)).toEqual([600, 660]);
  });

  test('eye rest keeps its distant-focus instruction with the configured duration', () => {
    const c = getGroupedReminderContent(['eye-break', 'stand-move'], { eyeSeconds: 35 });
    expect(c.instruction).toMatch(/distant object for 35 seconds/);
    for (const combo of [
      ['eye-break', 'walking'],
      ['eye-break', 'stand-move', 'walking'],
      ['eye-break', 'posture-stretch', 'stand-move'],
      ['eye-break', 'posture-stretch', 'stand-move', 'walking'],
    ] as ReminderType[][]) {
      expect(getGroupedReminderContent(combo).instruction).toMatch(/distant object/);
    }
    expect(areActivitiesCompatible(['eye-break', 'posture-stretch'])).toBe(false);
  });

  test('grouping neither changes scheduling state nor records completion', () => {
    const e = new ReminderEngine(makeSettings({ eye: 6, posture: null, stand: 6, walk: 6 }), 0, T0);
    const events = collect(e);
    run(e, T0, T0 + 3 * MIN);
    const snapshot = JSON.stringify(e.getCycleInfo());
    getGroupedReminderContent(['eye-break', 'stand-move', 'walking']);
    areActivitiesCompatible(['eye-break', 'stand-move', 'walking']);
    expect(JSON.stringify(e.getCycleInfo())).toBe(snapshot); // pure

    run(e, T0 + 3 * MIN, T0 + 6 * MIN);
    expect(events).toHaveLength(1);
    expect(events[0].groupedTypes).toEqual(['eye-break', 'stand-move', 'walking']);
    expect(e.getBreakLogs()).toHaveLength(0);
    const summary = e.getDailySummary(undefined, T0 + 6 * MIN);
    expect(summary.eyeBreaksCompleted + summary.movementBreaksCompleted).toBe(0);
    for (const r of e.getNextReminders(T0 + 6 * MIN)) {
      expect(r.status).toBe('scheduled');
      expect(r.secondsRemaining).toBe(6 * 60);
    }
    // the grouped cycles are deduplicated: replaying the same timestamp delivers nothing new
    e.tick(0, T0 + 6 * MIN);
    expect(events).toHaveLength(1);
  });
});

describe('Learning from observed behaviour (deterministic rules)', () => {
  function shortBreakRightBeforeReminder(e: ReminderEngine, start: number, intervalMs: number) {
    // work until 20 s are left, lock for 5 minutes, come back
    const lockAt = start + intervalMs - 20 * SEC;
    run(e, start, lockAt);
    e.setLocked(true, lockAt);
    const unlockAt = lockAt + 5 * MIN;
    e.setLocked(false, unlockAt);
    return unlockAt;
  }

  test('repeated reminders right after short interruptions earn a small, bounded grace', () => {
    const e = new ReminderEngine(makeSettings({ eye: 10, posture: null, stand: null, walk: null }), 0, T0);
    const events = collect(e);
    let t = T0;
    for (let i = 0; i < 4; i++) {
      const unlockAt = shortBreakRightBeforeReminder(e, t, 10 * MIN);
      run(e, unlockAt, unlockAt + 20 * SEC);
      expect(events[i].dueTimestamp).toBe(unlockAt + 20 * SEC); // no delay without evidence
      t = unlockAt + 20 * SEC;
    }
    const status = e.getAdaptiveStatus(t);
    expect(status.shortReturnGraceSeconds).toBe(60);
    expect(status.insights.join(' ')).toMatch(/short interruptions/);

    const unlockAt = shortBreakRightBeforeReminder(e, t, 10 * MIN);
    run(e, unlockAt, unlockAt + 59 * SEC);
    expect(events).toHaveLength(4);
    e.tick(0, unlockAt + 60 * SEC); // grace = min(60 s, 10% of the 10-minute interval)
    expect(events).toHaveLength(5);
  });

  test('learning can be turned off', () => {
    const history = Array.from({ length: 8 }, (_, i) => ({
      startedAt: i,
      endedAt: i + 5 * MIN,
      durationMs: 5 * MIN,
      source: 'lock' as const,
      kind: 'short' as const,
      heldCount: 0,
      dueWhileAway: 0,
      reminderSoonAfterReturn: true,
    }));
    const on = deriveAdaptiveAdjustments(history, DEFAULT_SETTINGS.adaptive);
    const off = deriveAdaptiveAdjustments(history, { ...DEFAULT_SETTINGS.adaptive, learnFromPatterns: false });
    expect(on.shortReturnGraceMs).toBe(60 * SEC);
    expect(off.shortReturnGraceMs).toBe(0);
  });

  test('reminders repeatedly piling up after long absences extend settling (bounded), with no activity claims', () => {
    const longs = Array.from({ length: 4 }, (_, i) => ({
      startedAt: i,
      endedAt: i + 47 * MIN,
      durationMs: 47 * MIN,
      source: 'lock' as const,
      kind: 'long' as const,
      heldCount: 2,
      dueWhileAway: 0,
    }));
    const adj = deriveAdaptiveAdjustments(longs, { ...DEFAULT_SETTINGS.adaptive, settlingMinutes: 4 });
    expect(adj.settlingMs).toBe(6 * MIN);
    const text = adj.insights.join(' ');
    expect(text).toMatch(/47 min/);
    expect(text).not.toMatch(/lunch|meeting|exercise|eating/i);
  });
});

describe('Restart and persistence of the adaptive context', () => {
  test('holds and absence history survive a restart; no duplicate delivery', () => {
    const settings = makeSettings({ eye: 17, posture: 53, stand: 71, walk: 97 });
    const e1 = new ReminderEngine(settings, 0, T0);
    run(e1, T0, T0 + 16 * MIN);
    e1.setLocked(true, T0 + 16 * MIN);
    const unlockAt = T0 + 56 * MIN;
    e1.setLocked(false, unlockAt);
    run(e1, unlockAt, unlockAt + 10 * SEC);
    const savedAt = unlockAt + 10 * SEC;
    const stored = JSON.parse(
      JSON.stringify({ cycles: e1.getCycleInfo(), adaptive: e1.getAdaptiveState(), delivered: e1.getDeliveredCycleIds() })
    );

    const restartAt = savedAt + 5 * SEC; // quick app restart (momentary app-off)
    const e2 = new ReminderEngine(settings, 0, restartAt);
    const events = collect(e2);
    e2.setDeliveredCycleIds(stored.delivered);
    e2.setAdaptiveState(stored.adaptive, restartAt);
    e2.setCycleInfo(stored.cycles, restartAt, savedAt);
    e2.handleAppStart(savedAt, restartAt);
    expect(e2.getAbsenceHistory().map((h) => h.kind)).toEqual(['long', 'momentary']);
    expect(due(e2, 'eye-break', restartAt).settlingUntil).toBe(unlockAt + 3 * MIN);
    run(e2, restartAt, unlockAt + 3 * MIN - SEC);
    expect(events).toHaveLength(0);
    e2.tick(0, unlockAt + 3 * MIN);
    expect(events.map((x) => x.type)).toEqual(['eye-break']);
  });

  test('a long time with the app closed counts as a long absence (nearly-due reminders settle first)', () => {
    const settings = makeSettings({ eye: 23, posture: null, stand: null, walk: null });
    const e1 = new ReminderEngine(settings, 0, T0);
    run(e1, T0, T0 + 22 * MIN);
    const savedAt = T0 + 22 * MIN;
    const cycles = e1.getCycleInfo();
    const startAt = savedAt + 3 * 3600 * SEC;
    const e2 = new ReminderEngine(settings, 0, startAt);
    const events = collect(e2);
    e2.setCycleInfo(cycles, startAt, savedAt);
    const rec = e2.handleAppStart(savedAt, startAt)!;
    expect(rec).toMatchObject({ source: 'app-off', kind: 'long', heldCount: 1 });
    expect(due(e2, 'eye-break', startAt).secondsRemaining).toBe(60); // exact countdown kept
    run(e2, startAt, startAt + 3 * MIN - SEC);
    expect(events).toHaveLength(0);
    e2.tick(0, startAt + 3 * MIN);
    expect(events).toHaveLength(1);
  });

  test('corrupt adaptive state is ignored safely', () => {
    const e = new ReminderEngine(makeSettings({ eye: 7 }), 0, T0);
    e.setAdaptiveState({ history: [{ bogus: true }, null, 5], holds: { 'eye-break': { cycleId: 3 } }, openAbsence: 'x' }, T0);
    expect(e.getAbsenceHistory()).toEqual([]);
    expect(e.getAdaptiveStatus(T0).phase).toBe('active');
  });
});
