import { AbsenceKind, AbsenceRecord, AdaptiveSettings, DEFAULT_SETTINGS } from './types';

/* ------------------------------------------------------------------------------------------------
 * Adaptive reminder policy — pure, deterministic functions (no timers, no I/O, no ML).
 * ------------------------------------------------------------------------------------------------
 * Layering (see ReminderEngine):
 *   1. User preferences          -> UserSettings (intervals are only ever changed by the user)
 *   2. Independent scheduling    -> one cycle per reminder (scheduledTime / pausedRemainingMs)
 *   3. Absence & activity context-> lock / sleep / idle / app-off absences, classified here
 *   4. Notification eligibility  -> holds computed here (settling after long absences, learned grace)
 *   5. Grouping & delivery queue -> ReminderEngine.deliverDue + areActivitiesCompatible
 *
 * Everything in this file reads interval/remaining values that are passed in; nothing here knows or
 * assumes any particular interval (20/30/60/90 …). Only the user's saved preferences matter.
 */

/** Absences shorter than this are "momentary" (e.g. a quick Win+L): never delayed, ignored for learning. */
export const MOMENTARY_ABSENCE_MS = 30_000;
/** Gap between one notification panel closing and the next queued reminder being presented. */
export const PRESENTATION_GAP_MS = 800;
/** After a long absence, consecutive deliveries of held (backlog) reminders are at least this far apart. */
export const RETURN_BACKLOG_SPACING_MS = 45_000;
/** Learned grace after short interruptions is never longer than this … */
export const SHORT_RETURN_GRACE_MS = 60_000;
/** … and never longer than this fraction of the reminder's own interval. */
export const SHORT_RETURN_GRACE_MAX_FRACTION = 0.1;
/** Grouping look-ahead never exceeds this fraction of the waiting reminder's own interval. */
export const GROUPING_WINDOW_MAX_FRACTION = 0.1;
/** Learned settling extension multiplier and the absolute cap of the resulting settling period. */
export const LEARNED_SETTLING_MULTIPLIER = 1.5;
export const MAX_SETTLING_MS = 30 * 60_000;
/** "Soon after return" window used to learn whether short interruptions are followed by a reminder. */
export const SOON_AFTER_RETURN_MS = 60_000;
/** Bounded local history (durations and sources only — never content, keystrokes or screenshots). */
export const MAX_ABSENCE_HISTORY = 100;

export const ADAPTIVE_LIMITS = {
  longAbsenceMinutes: { min: 2, max: 240 },
  settlingMinutes: { min: 0, max: 30 },
  nearlyDuePercent: { min: 5, max: 50 },
  groupingWindowSeconds: { min: 0, max: 600 },
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeAdaptiveSettings(input: unknown, fallback: AdaptiveSettings = DEFAULT_SETTINGS.adaptive): AdaptiveSettings {
  const base = { ...DEFAULT_SETTINGS.adaptive, ...(fallback || {}) };
  const src: any = input && typeof input === 'object' ? input : {};
  const L = ADAPTIVE_LIMITS;
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : base.enabled,
    learnFromPatterns: typeof src.learnFromPatterns === 'boolean' ? src.learnFromPatterns : base.learnFromPatterns,
    longAbsenceMinutes: clampInt(src.longAbsenceMinutes, base.longAbsenceMinutes, L.longAbsenceMinutes.min, L.longAbsenceMinutes.max),
    settlingMinutes: clampInt(src.settlingMinutes, base.settlingMinutes, L.settlingMinutes.min, L.settlingMinutes.max),
    nearlyDuePercent: clampInt(src.nearlyDuePercent, base.nearlyDuePercent, L.nearlyDuePercent.min, L.nearlyDuePercent.max),
    groupingWindowSeconds: clampInt(src.groupingWindowSeconds, base.groupingWindowSeconds, L.groupingWindowSeconds.min, L.groupingWindowSeconds.max),
  };
}

/** Classifies an absence purely by its measured duration and the user's configured threshold. */
export function classifyAbsence(durationMs: number, adaptive: AdaptiveSettings): AbsenceKind {
  if (!Number.isFinite(durationMs) || durationMs < MOMENTARY_ABSENCE_MS) return 'momentary';
  return durationMs >= adaptive.longAbsenceMinutes * 60_000 ? 'long' : 'short';
}

/**
 * A reminder is nearly due when the time left is a small fraction of ITS OWN configured interval
 * (overdue reminders, remaining <= 0, are always nearly due). No reminder-specific durations.
 */
export function isNearlyDue(remainingMs: number, intervalMs: number, adaptive: AdaptiveSettings): boolean {
  if (!(intervalMs > 0)) return false;
  return remainingMs <= (adaptive.nearlyDuePercent / 100) * intervalMs;
}

/** Longest a due reminder may wait for a compatible reminder about to become due. */
export function groupingWindowMs(intervalMs: number, adaptive: AdaptiveSettings): number {
  if (!adaptive.enabled || adaptive.groupingWindowSeconds <= 0 || !(intervalMs > 0)) return 0;
  return Math.min(adaptive.groupingWindowSeconds * 1000, GROUPING_WINDOW_MAX_FRACTION * intervalMs);
}

export interface AdaptiveAdjustments {
  settlingMs: number;
  shortReturnGraceMs: number;
  insights: string[];
}

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const SOURCE_LABEL = 'lock, sleep, inactivity or app-closed time';

/**
 * Transparent learning rules over locally stored absence durations. Each rule needs repeated evidence,
 * produces a bounded adjustment, and is explained in plain language. Nothing here claims to know what
 * the user was doing (lunch, meetings, exercise …) — only how long the computer was locked/idle.
 *
 *  R1 Settling extension: if, in at least 3 of the last 6 long absences, two or more reminders were
 *     waiting when the user came back, the settling period is extended ×1.5 (capped at 30 min).
 *  R2 Short-interruption grace: if, in at least 4 of the last 8 short absences, a reminder appeared
 *     within a minute of returning, nearly-due reminders get a small grace after short absences
 *     (≤ 60 s and ≤ 10% of the reminder's own interval). Without that evidence, short absences
 *     preserve the exact countdown with no delay.
 */
export function deriveAdaptiveAdjustments(history: AbsenceRecord[], adaptive: AdaptiveSettings): AdaptiveAdjustments {
  const baseSettlingMs = adaptive.settlingMinutes * 60_000;
  const result: AdaptiveAdjustments = { settlingMs: baseSettlingMs, shortReturnGraceMs: 0, insights: [] };
  if (!adaptive.enabled) return result;

  const longs = history.filter((h) => h.kind === 'long');
  const shorts = history.filter((h) => h.kind === 'short');

  if (longs.length >= 3) {
    const typicalMin = Math.round(median(longs.slice(-10).map((h) => h.durationMs)) / 60_000);
    result.insights.push(
      `Your recent long absences lasted about ${typicalMin} min (measured from ${SOURCE_LABEL} only).`
    );
  }

  if (!adaptive.learnFromPatterns) return result;

  const recentLongs = longs.slice(-6);
  const piledUp = recentLongs.filter((h) => h.heldCount >= 2).length;
  if (baseSettlingMs > 0 && recentLongs.length >= 3 && piledUp >= 3) {
    result.settlingMs = Math.min(MAX_SETTLING_MS, Math.round(baseSettlingMs * LEARNED_SETTLING_MULTIPLIER));
    result.insights.push(
      `Several reminders were often waiting when you returned from long absences, so the settling period is extended to ${Math.round(result.settlingMs / 60_000 * 10) / 10} min.`
    );
  }

  const recentShorts = shorts.slice(-8);
  const soon = recentShorts.filter((h) => h.reminderSoonAfterReturn).length;
  if (recentShorts.length >= 4 && soon >= 4) {
    result.shortReturnGraceMs = SHORT_RETURN_GRACE_MS;
    result.insights.push(
      'Reminders often appeared right after short interruptions, so nearly-due reminders now wait up to 1 min after you return.'
    );
  }
  return result;
}

/** Hold length for a nearly-due reminder after a long absence: never longer than its own interval. */
export function settlingHoldMs(settlingMs: number, intervalMs: number): number {
  return Math.max(0, Math.min(settlingMs, intervalMs));
}

/** Learned grace after a short absence: bounded absolutely and relative to the reminder's interval. */
export function shortGraceHoldMs(graceMs: number, intervalMs: number): number {
  return Math.max(0, Math.min(graceMs, SHORT_RETURN_GRACE_MAX_FRACTION * intervalMs));
}

export function sanitizeAbsenceHistory(input: unknown): AbsenceRecord[] {
  if (!Array.isArray(input)) return [];
  const sources = ['lock', 'suspend', 'idle', 'app-off'];
  const kinds = ['momentary', 'short', 'long'];
  return input
    .filter(
      (r: any) =>
        r &&
        typeof r === 'object' &&
        Number.isFinite(r.startedAt) &&
        Number.isFinite(r.endedAt) &&
        Number.isFinite(r.durationMs) &&
        sources.includes(r.source) &&
        kinds.includes(r.kind)
    )
    .map((r: any) => ({
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      durationMs: Math.max(0, r.durationMs),
      source: r.source,
      kind: r.kind,
      heldCount: Number.isFinite(r.heldCount) ? Math.max(0, r.heldCount) : 0,
      dueWhileAway: Number.isFinite(r.dueWhileAway) ? Math.max(0, r.dueWhileAway) : 0,
      ...(r.reminderSoonAfterReturn ? { reminderSoonAfterReturn: true } : {}),
    }))
    .slice(-MAX_ABSENCE_HISTORY);
}
