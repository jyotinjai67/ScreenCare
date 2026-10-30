import {
  ReminderType,
  UserSettings,
  BreakLogEntry,
  ActiveBreakState,
  DailyWellnessSummary,
  ReminderCycleInfo,
  ReminderCycleStatus,
  ReminderConfig,
  DEFAULT_SETTINGS,
  AbsenceRecord,
  AbsenceSource,
  AdaptiveStatus,
} from './types';
import { getExerciseForReminder, getExerciseVariations, getVariationForReminder } from './stretches';
import {
  normalizeAdaptiveSettings,
  classifyAbsence,
  isNearlyDue,
  groupingWindowMs,
  deriveAdaptiveAdjustments,
  settlingHoldMs,
  shortGraceHoldMs,
  sanitizeAbsenceHistory,
  PRESENTATION_GAP_MS,
  RETURN_BACKLOG_SPACING_MS,
  SOON_AFTER_RETURN_MS,
  MAX_ABSENCE_HISTORY,
} from './adaptivePolicy';

export { PRESENTATION_GAP_MS } from './adaptivePolicy';

export interface ReminderDueEvent {
  cycleId: string;
  type: ReminderType;
  title: string;
  message: string;
  exercise: ReturnType<typeof getExerciseForReminder>;
  dueTimestamp: number;
  isGrouped?: boolean;
  groupedTypes?: ReminderType[];
  groupedCycleIds?: string[];
  instruction?: string;
  firstWord?: string;
  highlightWord?: string;
  variationIndex?: number;
  variationId?: string;
  categoryLabel?: string;
  illustrationKey?: string;
}

/**
 * Determines whether multiple concurrently due activities are compatible to combine into
 * a single unified wellness break without diluting their health benefits.
 */
export function areActivitiesCompatible(types: ReminderType[]): boolean {
  if (types.length <= 1) return false;
  const set = new Set(types);

  // Seated eye rest (20-20-20 distance gaze) and seated posture stretching without any
  // standing/walking movement are incompatible desk activities that must not be mashed together.
  if (set.size === 2 && set.has('eye-break') && set.has('posture-stretch')) {
    return false;
  }

  // Any set that includes standing or walking can naturally combine stretching and distant gaze
  return true;
}

export interface GroupedReminderContent {
  title: string;
  firstWord: string;
  highlightWord: string;
  subtitle: string;
  instruction: string;
  displayType: ReminderType;
  illustrationKey: string;
  categoryLabel: string;
}

/**
 * Returns tailored, professional copy and visual configuration for grouped wellness activities.
 * Whenever Eye Rest is part of the group, the distant-focus instruction is preserved and uses the
 * user's configured Eye Rest duration (`eyeSeconds`, default 20 s).
 * Pure function: it never touches scheduling state.
 */
export function getGroupedReminderContent(
  types: ReminderType[],
  options: { eyeSeconds?: number } = {}
): GroupedReminderContent {
  const content = baseGroupedReminderContent(types);
  const eyeSeconds = options.eyeSeconds;
  if (types.includes('eye-break') && typeof eyeSeconds === 'number' && Number.isFinite(eyeSeconds) && eyeSeconds > 0) {
    const s = Math.round(eyeSeconds);
    content.instruction = content.instruction.replace(/for 20 seconds/g, `for ${s} seconds`);
    content.subtitle = content.subtitle.replace(/for 20 seconds/g, `for ${s} seconds`);
  }
  return content;
}

/**
 * Alternative animated scenes for a grouped break, so repeated combined breaks don't always show the
 * same loop. The first entry is always the default illustration. Groups that include Eye Rest only use
 * scenes that keep the distant-gaze element, so the eye instruction stays illustrated.
 */
export function getGroupedIllustrationAlternatives(types: ReminderType[]): string[] {
  const base = baseGroupedReminderContent(types).illustrationKey;
  if (types.includes('eye-break')) return [base];
  const alts: Record<string, string[]> = {
    'walking-break': ['walking-break', 'walk-stroll', 'stand-overhead'],
    'walk-stroll': ['walk-stroll', 'walking-break'],
    'stand-chest-opener': ['stand-chest-opener', 'stand-side-stretch', 'stand-overhead'],
  };
  return alts[base] || [base];
}

function baseGroupedReminderContent(types: ReminderType[]): {
  title: string;
  firstWord: string;
  highlightWord: string;
  subtitle: string;
  instruction: string;
  displayType: ReminderType;
  illustrationKey: string;
  categoryLabel: string;
} {
  const set = new Set(types);
  const hasEye = set.has('eye-break');
  const hasPosture = set.has('posture-stretch');
  const hasStand = set.has('stand-move');
  const hasWalk = set.has('walking');

  // All 4 due activities
  if (hasEye && hasPosture && hasStand && hasWalk) {
    return {
      title: 'Mindful Wellness Break',
      firstWord: 'Mindful',
      highlightWord: 'Wellness',
      subtitle: 'Complete rejuvenation: stretch tall, walk away from screens, and rest your eyes.',
      instruction: 'Stand tall, gently roll your shoulders, take a short walk, and rest your eyes on a distant object for 20 seconds.',
      displayType: 'walking',
      illustrationKey: 'walk-distant-gaze',
      categoryLabel: 'Full Mindful Break',
    };
  }

  // 3-activity combinations
  if (hasPosture && hasStand && hasWalk) {
    return {
      title: 'Full Movement Break',
      firstWord: 'Full Body',
      highlightWord: 'Movement',
      subtitle: 'Release tension, stand up tall, and enjoy a brief walk away from screens.',
      instruction: 'Stand tall, gently roll your shoulders, and take a refreshing walk away from your screen.',
      displayType: 'walking',
      illustrationKey: 'walking-break',
      categoryLabel: 'Movement Break',
    };
  }

  if (hasEye && hasStand && hasWalk) {
    return {
      title: 'Active Movement & Eye Rest',
      firstWord: 'Active',
      highlightWord: 'Wellness',
      subtitle: 'Step away from your desk, stretch, and focus your eyes on a distant object.',
      instruction: 'Stand up, take a short walk, and rest your eyes on a distant object for 20 seconds.',
      displayType: 'walking',
      illustrationKey: 'walk-distant-gaze',
      categoryLabel: 'Active Eye Rest',
    };
  }

  if (hasEye && hasPosture && hasStand) {
    return {
      title: 'Posture, Stretch & Eye Rest',
      firstWord: 'Posture &',
      highlightWord: 'Eye Rest',
      subtitle: 'Combine standing stretch with distant eye focus to recharge.',
      instruction: 'Stand tall, gently roll your shoulders, and look at a distant object for 20 seconds.',
      displayType: 'stand-move',
      illustrationKey: 'stand-chest-opener',
      categoryLabel: 'Posture & Eye Rest',
    };
  }

  // 2-activity combinations
  if (hasStand && hasWalk) {
    return {
      title: 'Active Movement Break',
      firstWord: 'Active',
      highlightWord: 'Movement',
      subtitle: 'Combine standing and walking to restore full body circulation.',
      instruction: 'Stand up, walk away from your screen, and move for a moment.',
      displayType: 'walking',
      illustrationKey: 'walking-break',
      categoryLabel: 'Active Movement',
    };
  }

  if (hasPosture && hasStand) {
    return {
      title: 'Posture & Standing Stretch',
      firstWord: 'Posture &',
      highlightWord: 'Stretch',
      subtitle: 'Stand up tall, open your chest, and release shoulder and neck tension.',
      instruction: 'Stand tall, gently roll your shoulders, and stretch your neck.',
      displayType: 'stand-move',
      illustrationKey: 'stand-chest-opener',
      categoryLabel: 'Posture & Stretch',
    };
  }

  if (hasEye && hasWalk) {
    return {
      title: 'Eye Rest & Walking Refresh',
      firstWord: 'Eye Rest &',
      highlightWord: 'Walk',
      subtitle: 'Step away from digital displays and rest your eyes on the horizon.',
      instruction: 'Take a walk away from your screen, and look at a distant object for 20 seconds.',
      displayType: 'walking',
      illustrationKey: 'walk-distant-gaze',
      categoryLabel: 'Eye Rest & Walk',
    };
  }

  if (hasEye && hasStand) {
    return {
      title: 'Stand & Eye Rest',
      firstWord: 'Stand &',
      highlightWord: 'Eye Rest',
      subtitle: 'Rise from your chair and look across the room for 20 seconds.',
      instruction: 'Stand up tall, stretch your arms, and look at a distant object for 20 seconds.',
      displayType: 'stand-move',
      illustrationKey: 'stand-overhead',
      categoryLabel: 'Stand & Eye Rest',
    };
  }

  if (hasPosture && hasWalk) {
    return {
      title: 'Posture & Walking Refresh',
      firstWord: 'Posture &',
      highlightWord: 'Walk',
      subtitle: 'Refresh posture and mental focus with a brief stroll.',
      instruction: 'Take a short walk away from your screen, stand tall, and gently roll your shoulders.',
      displayType: 'walking',
      illustrationKey: 'walk-stroll',
      categoryLabel: 'Posture & Walk',
    };
  }

  // Default fallback for other combinations
  return {
    title: 'Combined Wellness Break',
    firstWord: 'Mindful',
    highlightWord: 'Break',
    subtitle: 'Take a moment to reset and refresh your body and mind.',
    instruction: 'Stand up, move gently, and give your body a mindful break.',
    displayType: hasWalk ? 'walking' : hasStand ? 'stand-move' : 'posture-stretch',
    illustrationKey: hasWalk ? 'walking-break' : hasStand ? 'stand-overhead' : 'neck-tilt',
    categoryLabel: 'Combined Wellness',
  };
}

/* ------------------------------------------------------------------------------------------------
 * Scheduling helpers
 * ------------------------------------------------------------------------------------------------
 * Units: settings store intervals in MINUTES; the engine schedules in MILLISECONDS; the UI snapshot
 * reports SECONDS. All conversions go through the helpers below so there is exactly one place where
 * minutes become milliseconds.
 */

/** The four reminders that own an independent, firing schedule. */
export const TRACKED_REMINDER_TYPES: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking'];

/** Accelerated intervals (seconds) used only when Rapid Test Mode (`devTestMode`) is on. */
export const DEV_TEST_INTERVAL_SECONDS: Record<string, number> = {
  'eye-break': 20,
  'posture-stretch': 40,
  'stand-move': 60,
  walking: 90,
};

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 600;

export function minutesToMs(minutes: number): number {
  return Math.round(minutes * 60 * 1000);
}

export function msToSeconds(ms: number): number {
  return Math.max(0, Math.round(ms / 1000));
}

/** UTC calendar-day key used for the daily summary and the daily active-time rollover. */
export function dateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function configKeyFor(type: ReminderType): 'eyeBreak' | 'postureStretch' | 'standMove' | 'walking' | null {
  switch (type) {
    case 'eye-break':
      return 'eyeBreak';
    case 'posture-stretch':
      return 'postureStretch';
    case 'stand-move':
      return 'standMove';
    case 'walking':
      return 'walking';
    default:
      return null;
  }
}

/** Effective interval (ms) for a reminder under the given settings. */
export function getReminderIntervalMs(settings: UserSettings, type: ReminderType): number {
  if (settings.devTestMode && DEV_TEST_INTERVAL_SECONDS[type] !== undefined) {
    return DEV_TEST_INTERVAL_SECONDS[type] * 1000;
  }
  const key = configKeyFor(type);
  const minutes = key ? settings[key].intervalMinutes : 30;
  return minutesToMs(minutes);
}

export function cloneSettings(settings: UserSettings): UserSettings {
  return JSON.parse(JSON.stringify(settings));
}

function toInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function normalizeReminderConfig(input: any, fallback: ReminderConfig): ReminderConfig {
  const src = input && typeof input === 'object' ? input : {};
  return {
    enabled: toBool(src.enabled, fallback.enabled),
    intervalMinutes: toInt(src.intervalMinutes, fallback.intervalMinutes, MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES),
    durationSeconds: toInt(src.durationSeconds, fallback.durationSeconds, 5, 3600),
    snoozeMinutes: toInt(src.snoozeMinutes, fallback.snoozeMinutes, 1, 240),
    soundEnabled: toBool(src.soundEnabled, fallback.soundEnabled),
    paused: toBool(src.paused, Boolean(fallback.paused)),
  };
}

/**
 * Validates and normalizes a (possibly partial, outdated or malformed) settings object.
 * Every invalid/missing field falls back to the corresponding value in `fallback`
 * (the currently active settings, or the defaults on first load), never silently to garbage.
 * Always returns a fresh deep copy that shares no references with its inputs.
 */
export function normalizeSettings(input: unknown, fallback: UserSettings = DEFAULT_SETTINGS): UserSettings {
  const base = cloneSettings({ ...DEFAULT_SETTINGS, ...(fallback || {}) } as UserSettings);
  const src: any = input && typeof input === 'object' ? input : {};
  const themes = ['light', 'dark', 'system'];
  return {
    eyeBreak: normalizeReminderConfig(src.eyeBreak, base.eyeBreak),
    postureStretch: normalizeReminderConfig(src.postureStretch, base.postureStretch),
    standMove: normalizeReminderConfig(src.standMove, base.standMove),
    walking: normalizeReminderConfig(src.walking, base.walking),
    viewingDistanceReminder: toBool(src.viewingDistanceReminder, base.viewingDistanceReminder),
    quietHours: {
      enabled: toBool(src.quietHours?.enabled, base.quietHours.enabled),
      start: toTime(src.quietHours?.start, base.quietHours.start),
      end: toTime(src.quietHours?.end, base.quietHours.end),
    },
    dailyScreenTimeGoalHours: toInt(src.dailyScreenTimeGoalHours, base.dailyScreenTimeGoalHours, 1, 24),
    idleThresholdMinutes: toInt(src.idleThresholdMinutes, base.idleThresholdMinutes, 1, 60),
    startAtLogin: toBool(src.startAtLogin, base.startAtLogin),
    minimizeToTray: toBool(src.minimizeToTray, base.minimizeToTray),
    theme: themes.includes(src.theme) ? src.theme : base.theme,
    devTestMode: toBool(src.devTestMode, base.devTestMode),
    cameraDistanceEnabled: toBool(src.cameraDistanceEnabled, base.cameraDistanceEnabled),
    adaptive: normalizeAdaptiveSettings(src.adaptive, base.adaptive),
  };
}

export interface NextReminderInfo {
  type: ReminderType;
  nextDueTimestamp: number;
  secondsRemaining: number;
  status: ReminderCycleStatus;
  cycleId: string;
  isPaused?: boolean;
  intervalSeconds?: number;
  /** Presentation hold from the return-from-break policy. Never changes the countdown itself. */
  settlingUntil?: number;
}

/** A presentation hold on ONE specific cycle. Holds never move scheduledTime. */
interface ReminderHold {
  cycleId: string;
  until: number;
  reason: 'settling' | 'short-grace';
}

interface OpenAbsence {
  startedAt: number;
  source: AbsenceSource;
  dueAtStart: ReminderType[];
}

/** Persisted adaptive context (durations and sources only). */
export interface AdaptiveStateSnapshot {
  history: AbsenceRecord[];
  holds: Partial<Record<ReminderType, ReminderHold>>;
  openAbsence?: OpenAbsence | null;
  backlogActive?: boolean;
  lastDeliveryAt?: number;
}

/**
 * ReminderEngine — the single authoritative scheduler.
 *
 * Every tracked reminder owns an independent cycle: { cycleId, scheduledTime, status, pausedRemainingMs }.
 * Nothing in this class shifts one reminder's schedule because of another reminder.
 *
 * Frozen time: a cycle's countdown is frozen (stored as `pausedRemainingMs`) whenever
 *   - the reminder is individually paused (settings.<x>.paused), or
 *   - Windows is locked or suspended, or
 *   - the user paused all reminders (pause()).
 * Unfreezing restores `scheduledTime = now + pausedRemainingMs`, so the exact remaining duration survives.
 *
 * INTERVAL-SAVE POLICY (updateSettings):
 *   When a reminder's effective interval changes, or it is (re-)enabled, its current cycle is discarded
 *   and a new cycle starts at the moment the save is applied: nextDue = saveTime + newInterval.
 *   (If that reminder is paused/frozen, the full new interval is held and starts counting on resume.)
 *   Reminders whose interval/enabled state did not change keep their exact due timestamps and cycle IDs.
 *   Saving settings never records a completion and never delivers a notification.
 *
 * STARTUP POLICY (setCycleInfo with savedAt):
 *   Time while the application is not running is treated like sleep: each reminder resumes from the
 *   remaining duration it had when state was last persisted (clamped to its interval).
 *   handleAppStart() then records that app-off time as an absence (see below).
 *
 * ADAPTIVE RETURN POLICY (settings.adaptive, rules in adaptivePolicy.ts):
 *   An absence opens on the first lock / suspend / idle-threshold signal and closes once, when the user
 *   is present again (unlocked, awake, input activity). Repeated OS events never reopen or extend it.
 *   - momentary/short absence: exact remaining countdowns, no delay (a small learned grace applies only
 *     after repeated evidence that reminders pop up right after short interruptions).
 *   - long absence: reminders that are nearly due (remaining <= nearlyDuePercent of their own interval)
 *     or overdue get a presentation HOLD until return + min(settling, interval). Holds are keyed by cycle
 *     ID, are bounded, never move scheduledTime, and never touch other reminders.
 *   - held reminders that become eligible together are grouped when compatible; incompatible ones are
 *     delivered one at a time, oldest first, spaced apart — never as a burst.
 *
 * DELIVERY QUEUE: a due reminder stays "due" in its own cycle until it is actually presented. While a
 *   notification panel is showing (setPresentationActive) nothing else is delivered; the next eligible
 *   reminder is delivered after the panel closes (PRESENTATION_GAP_MS). Delivery never records completion.
 */
export class ReminderEngine {
  private settings: UserSettings;
  private activeScreenSeconds = 0;
  private currentContinuousSeconds = 0;
  private idleSeconds = 0;
  private isIdle = false;
  private isPaused = false;
  private isLocked = false;
  private isSuspended = false;
  private isLockOrSleepPaused = false;
  private isFrozen = false;
  private pauseUntil = 0;
  private lastTickTime = 0;
  private activeDate: string;

  private cycles: Record<ReminderType, ReminderCycleInfo>;
  private deliveredCycleIds = new Set<string>();
  private activeBreak: ActiveBreakState | null = null;
  private breakLogs: BreakLogEntry[] = [];
  private onReminderDueCallback?: (event: ReminderDueEvent) => void;

  // --- Absence / activity context and notification eligibility (adaptive layer) ---
  private openAbsence: OpenAbsence | null = null;
  private absenceHistory: AbsenceRecord[] = [];
  private lastReturn: AbsenceRecord | null = null;
  private holds: Partial<Record<ReminderType, ReminderHold>> = {};
  private backlogActive = false;
  private lastDeliveryAt = 0;
  private presentationActive = false;
  private presentationCooldownUntil = 0;
  private previewCounters: Partial<Record<ReminderType, number>> = {};

  constructor(settings: UserSettings, initialScreenSeconds = 0, initialTimestamp = Date.now()) {
    // Deep copy: the engine must never share nested objects with callers (or with DEFAULT_SETTINGS).
    this.settings = normalizeSettings(settings, DEFAULT_SETTINGS);
    const initialSeconds = Number.isFinite(initialScreenSeconds) ? Math.max(0, initialScreenSeconds) : 0;
    this.activeScreenSeconds = initialSeconds;
    this.currentContinuousSeconds = initialSeconds;
    this.lastTickTime = initialTimestamp;
    this.activeDate = dateKey(initialTimestamp);
    this.cycles = this.initializeCycles(initialTimestamp);
  }

  public setOnReminderDue(callback: (event: ReminderDueEvent) => void): void {
    this.onReminderDueCallback = callback;
  }

  public getDeliveredCycleIds(): string[] {
    return Array.from(this.deliveredCycleIds).slice(-200);
  }

  public setDeliveredCycleIds(ids: string[]): void {
    this.deliveredCycleIds = new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string'));
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Settings                                                                                        */
  /* ---------------------------------------------------------------------------------------------- */

  public updateSettings(newSettings: UserSettings, now = Date.now()): void {
    const prevSettings = this.settings;
    const nextSettings = normalizeSettings(newSettings, prevSettings);
    this.settings = nextSettings;

    for (const t of TRACKED_REMINDER_TYPES) {
      const prevConfig = this.getReminderConfigFor(prevSettings, t);
      const newConfig = this.getReminderConfigFor(nextSettings, t);
      const prevIntervalMs = getReminderIntervalMs(prevSettings, t);
      const intervalMs = getReminderIntervalMs(nextSettings, t);

      if (!newConfig.enabled) {
        this.cycles[t] = this.disabledCycle(t);
        continue;
      }

      const cycle = this.cycles[t];
      const needsNewCycle =
        !prevConfig.enabled ||
        prevIntervalMs !== intervalMs ||
        !cycle ||
        cycle.scheduledTime <= 0 ||
        cycle.status !== 'scheduled';

      if (needsNewCycle) {
        // Documented policy: restart this reminder's interval from the save time.
        this.scheduleNext(t, now);
        continue;
      }

      // Same interval: only individual pause/resume transitions apply. Due timestamp is preserved.
      if (!prevConfig.paused && newConfig.paused) {
        this.freezeCycle(cycle, now);
      } else if (prevConfig.paused && !newConfig.paused && !this.isFrozen) {
        this.unfreezeCycle(cycle, now, intervalMs);
      }

      // Safety clamp: a countdown can never exceed the configured interval.
      if (cycle.pausedRemainingMs !== undefined) {
        cycle.pausedRemainingMs = Math.min(cycle.pausedRemainingMs, intervalMs);
      } else if (cycle.scheduledTime > now + intervalMs) {
        cycle.scheduledTime = now + intervalMs;
      }
    }
  }

  public getSettings(): UserSettings {
    return cloneSettings(this.settings);
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Persistence                                                                                     */
  /* ---------------------------------------------------------------------------------------------- */

  public getCycleInfo(): Record<ReminderType, ReminderCycleInfo> {
    return JSON.parse(JSON.stringify(this.cycles));
  }

  /**
   * Restores persisted cycles.
   * @param savedAt when the cycles were persisted. When provided, app-off time is frozen (startup policy).
   *                When omitted (legacy files), wall-clock due timestamps are kept.
   */
  public setCycleInfo(cycles: Partial<Record<ReminderType, ReminderCycleInfo>>, now = Date.now(), savedAt?: number): void {
    if (!cycles || typeof cycles !== 'object') return;

    for (const t of TRACKED_REMINDER_TYPES) {
      const config = this.getReminderConfig(t);
      const raw: any = (cycles as any)[t];
      if (!config.enabled) {
        this.cycles[t] = this.disabledCycle(t);
        continue;
      }
      const valid =
        raw &&
        typeof raw === 'object' &&
        typeof raw.cycleId === 'string' &&
        typeof raw.scheduledTime === 'number' &&
        Number.isFinite(raw.scheduledTime) &&
        raw.scheduledTime > 0 &&
        raw.status === 'scheduled';
      if (!valid) {
        // Missing, corrupt, or a "disabled" placeholder for a reminder that is now enabled: start fresh.
        this.scheduleNext(t, now);
        continue;
      }

      const intervalMs = getReminderIntervalMs(this.settings, t);
      const restored: ReminderCycleInfo = {
        cycleId: raw.cycleId,
        type: t,
        scheduledTime: raw.scheduledTime,
        status: 'scheduled',
        variationIndex: typeof raw.variationIndex === 'number' ? raw.variationIndex : 0,
      };

      let remainingMs: number | undefined;
      if (typeof raw.pausedRemainingMs === 'number' && Number.isFinite(raw.pausedRemainingMs)) {
        remainingMs = Math.max(0, raw.pausedRemainingMs);
      } else if (typeof savedAt === 'number' && Number.isFinite(savedAt) && savedAt > 0) {
        remainingMs = Math.max(0, raw.scheduledTime - savedAt);
      }

      if (remainingMs !== undefined) {
        remainingMs = Math.min(remainingMs, intervalMs);
        if (this.isFrozen || config.paused) {
          restored.pausedRemainingMs = remainingMs;
        } else {
          restored.scheduledTime = now + remainingMs;
        }
      } else if (this.isFrozen || config.paused) {
        restored.pausedRemainingMs = Math.min(intervalMs, Math.max(0, raw.scheduledTime - now));
      } else if (restored.scheduledTime > now + intervalMs) {
        restored.scheduledTime = now + intervalMs;
        restored.cycleId = this.generateCycleId(t, restored.scheduledTime);
      }

      this.cycles[t] = restored;
    }
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Lock / sleep / user pause                                                                       */
  /* ---------------------------------------------------------------------------------------------- */

  public setLocked(locked: boolean, now?: number): void {
    const currentNow = now ?? (this.lastTickTime > 0 ? this.lastTickTime : Date.now());
    this.isLocked = locked;
    if (locked) this.beginAbsence(currentNow, 'lock');
    this.handleLockSleepStateChange(currentNow);
  }

  public setSuspended(suspended: boolean, now?: number): void {
    const currentNow = now ?? (this.lastTickTime > 0 ? this.lastTickTime : Date.now());
    this.isSuspended = suspended;
    if (suspended) this.beginAbsence(currentNow, 'suspend');
    this.handleLockSleepStateChange(currentNow);
  }

  public isSystemLocked(): boolean {
    return this.isLocked;
  }

  public isSystemSuspended(): boolean {
    return this.isSuspended;
  }

  public isSystemPaused(): boolean {
    return this.isLockOrSleepPaused || this.isLocked || this.isSuspended;
  }

  private handleLockSleepStateChange(now: number): void {
    const shouldBePaused = this.isLocked || this.isSuspended;
    const returnedNow = !shouldBePaused && this.isLockOrSleepPaused;
    if (shouldBePaused !== this.isLockOrSleepPaused) {
      this.isLockOrSleepPaused = shouldBePaused;
      if (!shouldBePaused) this.lastTickTime = now;
    }
    if (shouldBePaused) {
      // Nothing may be presented while locked/asleep; a pending presentation slot is released.
      this.presentationActive = false;
    }
    this.applyFreezeState(now);
    // The user is back (unlocked AND awake): close the absence exactly once, on the real transition.
    // Duplicate unlock/resume events are not transitions: they can never re-start or extend the
    // settling period, nor end an unrelated inactivity absence.
    if (returnedNow && this.openAbsence) {
      this.endAbsence(now);
    }
  }

  /** Freezes or unfreezes all countdowns exactly once per transition (idempotent for repeated events). */
  private applyFreezeState(now: number): void {
    const shouldFreeze = this.isLockOrSleepPaused || this.isPaused;
    if (shouldFreeze === this.isFrozen) return;
    this.isFrozen = shouldFreeze;
    for (const t of TRACKED_REMINDER_TYPES) {
      const cycle = this.cycles[t];
      if (!cycle || cycle.status !== 'scheduled' || cycle.scheduledTime <= 0) continue;
      if (shouldFreeze) {
        this.freezeCycle(cycle, now);
      } else if (!this.getReminderConfig(t).paused) {
        this.unfreezeCycle(cycle, now, getReminderIntervalMs(this.settings, t));
      }
    }
  }

  private freezeCycle(cycle: ReminderCycleInfo, now: number): void {
    if (cycle.pausedRemainingMs === undefined) {
      cycle.pausedRemainingMs = Math.max(0, cycle.scheduledTime - now);
    }
  }

  private unfreezeCycle(cycle: ReminderCycleInfo, now: number, intervalMs: number): void {
    if (cycle.pausedRemainingMs !== undefined) {
      cycle.scheduledTime = now + Math.min(intervalMs, cycle.pausedRemainingMs);
      delete cycle.pausedRemainingMs;
    }
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Tick                                                                                            */
  /* ---------------------------------------------------------------------------------------------- */

  public tick(systemIdleSeconds: number, now = Date.now()): ReminderDueEvent | null {
    // Stop counting immediately when Windows is locked or suspended
    if (this.isLocked || this.isSuspended || this.isLockOrSleepPaused) {
      return null;
    }

    this.lastTickTime = now;

    // Daily rollover of "today" counters
    const today = dateKey(now);
    if (today !== this.activeDate) {
      this.activeDate = today;
      this.activeScreenSeconds = 0;
      this.idleSeconds = 0;
      this.currentContinuousSeconds = 0;
    }

    // User pause: countdowns are frozen; auto-resume when the pause window ends
    if (this.isPaused) {
      if (this.pauseUntil > 0 && now >= this.pauseUntil) {
        this.resume(now);
      } else {
        return null;
      }
    }

    // Check system idle threshold
    const idleThreshold = this.settings.idleThresholdMinutes * 60;
    this.isIdle = systemIdleSeconds >= idleThreshold;

    if (this.isIdle) {
      this.idleSeconds += 1;
      if (systemIdleSeconds >= 600) {
        this.currentContinuousSeconds = 0;
      }
      // Inactivity without a lock is also an absence; it started at the last input, not at this tick.
      if (!this.openAbsence) {
        const lastInput = now - Math.max(0, systemIdleSeconds) * 1000;
        const floor = this.lastReturn ? this.lastReturn.endedAt : 0;
        this.beginAbsence(Math.max(lastInput, floor), 'idle');
      }
      return null;
    }

    // Input activity again after an inactivity absence: the user has returned.
    if (this.openAbsence) {
      this.endAbsence(now);
    }

    // User is active, unlocked, and awake: accumulate active screen time
    this.activeScreenSeconds += 1;
    this.currentContinuousSeconds += 1;

    // Respect quiet hours
    if (this.isQuietHours(now)) {
      return null;
    }

    return this.deliverDue(now);
  }

  /**
   * Delivers the next eligible reminder (or compatible group) WITHOUT advancing any activity counters.
   * Used by the main process when a notification panel closes so the queued reminder follows promptly.
   */
  public deliverPending(now = Date.now()): ReminderDueEvent | null {
    if (this.isSystemPaused() || this.isPaused || this.isIdle || this.openAbsence) return null;
    if (this.isQuietHours(now)) return null;
    return this.deliverDue(now);
  }

  /** The main process reports whether a notification panel is currently on screen. */
  public setPresentationActive(active: boolean, now = Date.now()): void {
    if (this.presentationActive && !active) {
      this.presentationCooldownUntil = now + PRESENTATION_GAP_MS;
    }
    this.presentationActive = active;
  }

  public isPresentationActive(): boolean {
    return this.presentationActive;
  }

  /** Time at which a reminder may be presented: its due time, or later if a return hold applies. */
  private eligibleAt(type: ReminderType): number {
    const cycle = this.cycles[type];
    const hold = this.holds[type];
    if (hold && this.settings.adaptive.enabled && hold.cycleId === cycle?.cycleId) {
      return Math.max(cycle.scheduledTime, hold.until);
    }
    return cycle ? cycle.scheduledTime : Number.POSITIVE_INFINITY;
  }

  /** Reminders whose countdown is running (enabled, not individually paused, not frozen). */
  private runningTypes(): ReminderType[] {
    return TRACKED_REMINDER_TYPES.filter((type) => {
      const config = this.getReminderConfig(type);
      const cycle = this.cycles[type];
      return (
        config.enabled &&
        !config.paused &&
        cycle &&
        cycle.status === 'scheduled' &&
        cycle.scheduledTime > 0 &&
        cycle.pausedRemainingMs === undefined
      );
    });
  }

  private pruneHolds(): void {
    for (const t of TRACKED_REMINDER_TYPES) {
      const hold = this.holds[t];
      if (hold && hold.cycleId !== this.cycles[t]?.cycleId) delete this.holds[t];
    }
  }

  /** Grouping + delivery queue. Only the delivered reminders' cycles advance. */
  private deliverDue(now: number): ReminderDueEvent | null {
    this.pruneHolds();
    if (this.presentationActive || now < this.presentationCooldownUntil) return null;

    // Collect eligible reminders
    const dueTypes: ReminderType[] = [];
    for (const type of this.runningTypes()) {
      const cycle = this.cycles[type];
      if (now < cycle.scheduledTime) continue;
      if (this.deliveredCycleIds.has(cycle.cycleId)) {
        // Stale cycle already delivered in history: never replay, re-schedule cleanly
        this.scheduleNext(type, now);
        continue;
      }
      if (now >= this.eligibleAt(type)) dueTypes.push(type);
    }

    if (dueTypes.length === 0) {
      if (this.backlogActive && !this.hasActiveHolds(now)) this.backlogActive = false;
      return null;
    }

    // After a long absence, held reminders are released one delivery at a time, spaced apart.
    if (this.backlogActive && this.lastDeliveryAt > 0 && now < this.lastDeliveryAt + RETURN_BACKLOG_SPACING_MS) {
      return null;
    }

    // Fair queue: the reminder that became eligible first goes first; ties (e.g. reminders released
    // together after settling) go to the one that has been waiting longest, then configured order.
    dueTypes.sort(
      (a, b) =>
        this.eligibleAt(a) - this.eligibleAt(b) ||
        this.cycles[a].scheduledTime - this.cycles[b].scheduledTime ||
        TRACKED_REMINDER_TYPES.indexOf(a) - TRACKED_REMINDER_TYPES.indexOf(b)
    );

    // Grouping look-ahead: briefly wait (bounded per reminder) for a compatible reminder that is about to
    // become due, so both are presented as one useful break instead of two interruptions.
    const adaptive = this.settings.adaptive;
    if (adaptive.enabled && adaptive.groupingWindowSeconds > 0) {
      const deadline = Math.min(
        ...dueTypes.map((t) => this.eligibleAt(t) + groupingWindowMs(getReminderIntervalMs(this.settings, t), adaptive))
      );
      if (now < deadline) {
        const upcoming = this.runningTypes().filter((t) => !dueTypes.includes(t) && this.eligibleAt(t) <= deadline);
        const worthWaiting = upcoming.some((t) => areActivitiesCompatible([...dueTypes, t]));
        if (worthWaiting) return null;
      }
    }

    if (dueTypes.length > 1 && areActivitiesCompatible(dueTypes)) {
      // Present in configured order for stable, readable copy
      const ordered = TRACKED_REMINDER_TYPES.filter((t) => dueTypes.includes(t));
      return this.deliverGroup(ordered, now);
    }

    // Single reminder OR incompatible reminders: deliver the oldest one now; the others stay due in
    // their own cycles and are delivered next (sequentially).
    return this.deliverSingle(dueTypes[0], now);
  }

  private hasActiveHolds(now: number): boolean {
    return TRACKED_REMINDER_TYPES.some((t) => {
      const h = this.holds[t];
      return h && h.cycleId === this.cycles[t]?.cycleId && h.until > now;
    });
  }

  private noteDelivered(types: ReminderType[], now: number): void {
    for (const t of types) delete this.holds[t];
    this.lastDeliveryAt = now;
    if (this.lastReturn && now - this.lastReturn.endedAt <= SOON_AFTER_RETURN_MS) {
      this.lastReturn.reminderSoonAfterReturn = true;
    }
  }

  private deliverGroup(dueTypes: ReminderType[], now: number): ReminderDueEvent {
    {
      const grouped = getGroupedReminderContent(dueTypes, { eyeSeconds: this.settings.eyeBreak.durationSeconds });
      const groupedCycleIds: string[] = [];
      // Rotate the illustration with the members' own variation counters (persisted, deterministic;
      // all zero on the first combined break → the default scene). Presentation only.
      const alternatives = getGroupedIllustrationAlternatives(dueTypes);
      const rotation = dueTypes.reduce((sum, t) => sum + (this.cycles[t]?.variationIndex ?? 0), 0);
      const illustrationKey = alternatives[rotation % alternatives.length];

      for (const t of dueTypes) {
        const cycle = this.cycles[t];
        groupedCycleIds.push(cycle.cycleId);
        cycle.status = 'notified';
        cycle.notifiedAt = now;
        this.deliveredCycleIds.add(cycle.cycleId);
        // Notification is not completion: no break log is written here.
        this.scheduleNext(t, now);
      }
      this.noteDelivered(dueTypes, now);

      const event: ReminderDueEvent = {
        cycleId: `grouped-${dueTypes.join('-')}-${now}`,
        type: grouped.displayType,
        title: grouped.title,
        message: grouped.subtitle,
        exercise: getExerciseForReminder(grouped.displayType),
        dueTimestamp: now,
        isGrouped: true,
        groupedTypes: [...dueTypes],
        groupedCycleIds,
        instruction: grouped.instruction,
        firstWord: grouped.firstWord,
        highlightWord: grouped.highlightWord,
        illustrationKey,
        categoryLabel: grouped.categoryLabel,
      };
      this.emit(event);
      return event;
    }
  }

  private deliverSingle(type: ReminderType, now: number): ReminderDueEvent {
    const cycle = this.cycles[type];
    const currentCycleId = cycle.cycleId;
    const currentVarIndex = cycle.variationIndex ?? 0;
    cycle.status = 'notified';
    cycle.notifiedAt = now;
    this.deliveredCycleIds.add(currentCycleId);
    this.scheduleNext(type, now);
    this.noteDelivered([type], now);

    const event = this.buildReminderEvent(type, currentCycleId, now, currentVarIndex);
    this.emit(event);
    return event;
  }

  private emit(event: ReminderDueEvent): void {
    if (!this.onReminderDueCallback) return;
    try {
      this.onReminderDueCallback(event);
    } catch (err) {
      console.error('Safe notification callback error:', err);
    }
  }

  /** Manually fires a reminder AND restarts its cycle (kept for API compatibility). */
  public triggerReminder(type: ReminderType, now = Date.now()): ReminderDueEvent {
    const cycleId = this.generateCycleId(type, now);
    const cycle = this.cycles[type];
    if (cycle) {
      cycle.cycleId = cycleId;
      cycle.status = 'notified';
      cycle.notifiedAt = now;
    }
    this.deliveredCycleIds.add(cycleId);

    const event = this.buildReminderEvent(type, cycleId, now);
    if (TRACKED_REMINDER_TYPES.includes(type)) this.scheduleNext(type, now);
    this.emit(event);
    return event;
  }

  /** Shows a preview notification WITHOUT touching any schedule, cycle ID, or dedup state. */
  public previewReminder(type: ReminderType, now = Date.now()): ReminderDueEvent {
    // Each preview click shows the next animation variation for this activity (presentation only).
    const count = this.previewCounters[type] ?? 0;
    this.previewCounters[type] = count + 1;
    const vars = getExerciseVariations(type);
    const base = this.cycles[type]?.variationIndex ?? 0;
    const varIndex = vars.length > 0 ? (base + count) % vars.length : undefined;
    const event = this.buildReminderEvent(type, `preview-${type}-${now}`, now, varIndex);
    this.emit(event);
    return event;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Break actions                                                                                   */
  /* ---------------------------------------------------------------------------------------------- */

  public startBreak(type: ReminderType, _now = Date.now()): ActiveBreakState {
    const cycle = this.cycles[type];
    const exercise = getExerciseForReminder(type, cycle?.variationIndex ?? 0);
    const config = this.getReminderConfig(type);
    const duration = this.settings.devTestMode ? Math.min(10, config.durationSeconds) : config.durationSeconds;

    this.activeBreak = {
      type,
      exercise,
      totalSeconds: duration,
      remainingSeconds: duration,
      status: 'active',
      cycleId: cycle?.cycleId,
    };

    return this.activeBreak;
  }

  public completeBreak(type: ReminderType, actualDurationSeconds?: number, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const duration = actualDurationSeconds ?? config.durationSeconds;
    const cycle = this.cycles[type];

    if (cycle) {
      cycle.status = 'completed';
      cycle.completedAt = now;
    }

    this.breakLogs.push({
      id: `${cycle?.cycleId || type}-comp-${now}`,
      type,
      timestamp: now,
      action: 'completed',
      durationSeconds: duration,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'completed';
      this.activeBreak = null;
    }

    this.scheduleNext(type, now);
  }

  public snoozeBreak(type: ReminderType, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const snoozeMs = this.settings.devTestMode ? 15000 : minutesToMs(config.snoozeMinutes);
    const cycle = this.cycles[type];

    if (cycle) {
      cycle.status = 'snoozed';
    }

    this.breakLogs.push({
      id: `${cycle?.cycleId || type}-snooze-${now}`,
      type,
      timestamp: now,
      action: 'snoozed',
      durationSeconds: 0,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'snoozed';
      this.activeBreak = null;
    }

    const nextTime = now + snoozeMs;
    this.cycles[type] = {
      cycleId: this.generateCycleId(type, nextTime),
      type,
      scheduledTime: nextTime,
      status: 'scheduled',
      variationIndex: cycle?.variationIndex ?? 0,
      ...(this.isFrozen || config.paused ? { pausedRemainingMs: snoozeMs } : {}),
    };
  }

  public skipBreak(type: ReminderType, now = Date.now()): void {
    const cycle = this.cycles[type];
    if (cycle) {
      cycle.status = 'skipped';
    }

    this.breakLogs.push({
      id: `${cycle?.cycleId || type}-skip-${now}`,
      type,
      timestamp: now,
      action: 'skipped',
      durationSeconds: 0,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'skipped';
      this.activeBreak = null;
    }

    this.scheduleNext(type, now);
  }

  /** Pauses all reminders. Countdowns freeze and resume from their exact remaining time. */
  public pause(minutes?: number, now = Date.now()): void {
    this.isPaused = true;
    this.pauseUntil = minutes && minutes > 0 ? now + minutesToMs(minutes) : 0;
    this.applyFreezeState(now);
  }

  public resume(now = Date.now()): void {
    this.isPaused = false;
    this.pauseUntil = 0;
    this.applyFreezeState(now);
  }

  public pauseReminder(type: ReminderType, now = Date.now()): void {
    const key = configKeyFor(type);
    if (!key) return;
    this.settings = cloneSettings(this.settings);
    this.settings[key].paused = true;
    const cycle = this.cycles[type];
    if (cycle && cycle.status === 'scheduled') this.freezeCycle(cycle, now);
  }

  public resumeReminder(type: ReminderType, now = Date.now()): void {
    const key = configKeyFor(type);
    if (!key) return;
    this.settings = cloneSettings(this.settings);
    this.settings[key].paused = false;
    const cycle = this.cycles[type];
    if (cycle && !this.isFrozen) {
      this.unfreezeCycle(cycle, now, getReminderIntervalMs(this.settings, type));
    }
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Absence context & return policy                                                                 */
  /* ---------------------------------------------------------------------------------------------- */

  private beginAbsence(startedAt: number, source: AbsenceSource): void {
    if (this.openAbsence) return; // already away: the earliest signal defines the start
    const dueAtStart = this.runningTypes().filter((t) => this.cycles[t].scheduledTime <= startedAt);
    this.openAbsence = { startedAt, source, dueAtStart };
  }

  /**
   * Closes the open absence (once) and applies the return policy. Returns the absence record.
   * Only presentation holds are created; no scheduledTime, interval or cycle ID is modified.
   */
  private endAbsence(now: number): AbsenceRecord | null {
    const open = this.openAbsence;
    if (!open) return null;
    this.openAbsence = null;
    const adaptive = this.settings.adaptive;
    const durationMs = Math.max(0, now - open.startedAt);
    const kind = classifyAbsence(durationMs, adaptive);
    const running = this.runningTypes();
    const dueWhileAway = running.filter(
      (t) => this.cycles[t].scheduledTime <= now && !open.dueAtStart.includes(t)
    ).length;

    let heldCount = 0;
    if (adaptive.enabled && kind !== 'momentary') {
      const adj = deriveAdaptiveAdjustments(this.absenceHistory, adaptive);
      for (const t of running) {
        const cycle = this.cycles[t];
        const intervalMs = getReminderIntervalMs(this.settings, t);
        const remainingMs = cycle.scheduledTime - now;
        if (!isNearlyDue(remainingMs, intervalMs, adaptive)) continue;
        const holdMs =
          kind === 'long' ? settlingHoldMs(adj.settlingMs, intervalMs) : shortGraceHoldMs(adj.shortReturnGraceMs, intervalMs);
        const until = now + holdMs;
        if (holdMs <= 0 || until <= cycle.scheduledTime) continue; // would not delay anything
        // Never extend a hold that is still running for the same cycle (e.g. a second absence that ends
        // during settling). An expired hold may be replaced: nothing could be shown while away anyway.
        const existing = this.holds[t];
        if (existing && existing.cycleId === cycle.cycleId && existing.until > now) continue;
        this.holds[t] = { cycleId: cycle.cycleId, until, reason: kind === 'long' ? 'settling' : 'short-grace' };
        heldCount += 1;
      }
      if (kind === 'long' && heldCount > 0) this.backlogActive = true;
    }

    const record: AbsenceRecord = {
      startedAt: open.startedAt,
      endedAt: now,
      durationMs,
      source: open.source,
      kind,
      heldCount,
      dueWhileAway,
    };
    this.absenceHistory.push(record);
    if (this.absenceHistory.length > MAX_ABSENCE_HISTORY) {
      this.absenceHistory = this.absenceHistory.slice(-MAX_ABSENCE_HISTORY);
    }
    this.lastReturn = record;
    return record;
  }

  /**
   * Startup: time while ScreenCare was not running is an absence (source "app-off"). Call after
   * setCycleInfo/setAdaptiveState. If the app was closed while already away (e.g. locked), that
   * earlier start is kept.
   */
  public handleAppStart(savedAt: number | undefined, now = Date.now()): AbsenceRecord | null {
    if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || savedAt <= 0 || savedAt > now) {
      this.openAbsence = null;
      return null;
    }
    const startedAt = this.openAbsence ? Math.min(this.openAbsence.startedAt, savedAt) : savedAt;
    this.openAbsence = { startedAt, source: 'app-off', dueAtStart: this.runningTypes() };
    return this.endAbsence(now);
  }

  public getAbsenceHistory(): AbsenceRecord[] {
    return this.absenceHistory.map((r) => ({ ...r }));
  }

  public getAdaptiveState(): AdaptiveStateSnapshot {
    return JSON.parse(
      JSON.stringify({
        history: this.absenceHistory,
        holds: this.holds,
        openAbsence: this.openAbsence,
        backlogActive: this.backlogActive,
        lastDeliveryAt: this.lastDeliveryAt,
      })
    );
  }

  public setAdaptiveState(state: unknown, now = Date.now()): void {
    const src: any = state && typeof state === 'object' ? state : {};
    this.absenceHistory = sanitizeAbsenceHistory(src.history);
    this.lastReturn = this.absenceHistory.length ? this.absenceHistory[this.absenceHistory.length - 1] : null;
    this.holds = {};
    if (src.holds && typeof src.holds === 'object') {
      for (const t of TRACKED_REMINDER_TYPES) {
        const h = src.holds[t];
        if (h && typeof h.cycleId === 'string' && Number.isFinite(h.until) && h.until > now) {
          this.holds[t] = { cycleId: h.cycleId, until: h.until, reason: h.reason === 'short-grace' ? 'short-grace' : 'settling' };
        }
      }
    }
    const oa = src.openAbsence;
    this.openAbsence =
      oa && Number.isFinite(oa.startedAt) && ['lock', 'suspend', 'idle', 'app-off'].includes(oa.source)
        ? { startedAt: oa.startedAt, source: oa.source, dueAtStart: Array.isArray(oa.dueAtStart) ? oa.dueAtStart : [] }
        : null;
    this.backlogActive = Boolean(src.backlogActive) && Object.keys(this.holds).length > 0;
    this.lastDeliveryAt = Number.isFinite(src.lastDeliveryAt) ? src.lastDeliveryAt : 0;
  }

  /** Read-only, explainable view of the adaptive layer for the UI and tray. */
  public getAdaptiveStatus(now = Date.now()): AdaptiveStatus {
    this.pruneHolds();
    const adaptive = this.settings.adaptive;
    const adj = deriveAdaptiveAdjustments(this.absenceHistory, adaptive);
    const activeHolds = TRACKED_REMINDER_TYPES.filter((t) => {
      const h = this.holds[t];
      return adaptive.enabled && h && h.until > now && this.cycles[t]?.cycleId === h.cycleId;
    });
    const settlingUntil = activeHolds.length ? Math.max(...activeHolds.map((t) => this.holds[t]!.until)) : undefined;
    const away = Boolean(this.openAbsence) || this.isSystemPaused();
    return {
      enabled: adaptive.enabled,
      phase: away ? 'away' : settlingUntil ? 'settling' : 'active',
      ...(this.openAbsence ? { awaySince: this.openAbsence.startedAt, awaySource: this.openAbsence.source } : {}),
      ...(this.lastReturn
        ? {
            lastReturn: {
              kind: this.lastReturn.kind,
              source: this.lastReturn.source,
              durationSeconds: Math.round(this.lastReturn.durationMs / 1000),
              endedAt: this.lastReturn.endedAt,
            },
          }
        : {}),
      ...(settlingUntil ? { settlingUntil } : {}),
      heldTypes: activeHolds,
      effectiveSettlingSeconds: Math.round(adj.settlingMs / 1000),
      shortReturnGraceSeconds: Math.round(adj.shortReturnGraceMs / 1000),
      insights: adj.insights,
    };
  }

  public handleWakeOrResume(now = Date.now()): void {
    if (this.isLockOrSleepPaused) {
      this.handleLockSleepStateChange(now);
    }
  }

  public isQuietHours(nowTimestamp = Date.now()): boolean {
    const q = this.settings.quietHours;
    if (!q.enabled) return false;

    const date = new Date(nowTimestamp);
    const currentMins = date.getHours() * 60 + date.getMinutes();
    const [startH, startM] = q.start.split(':').map(Number);
    const [endH, endM] = q.end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      return currentMins >= startMins || currentMins < endMins;
    }
  }

  /**
   * Authoritative countdown snapshot for the UI. Only the four tracked reminders are reported
   * (the viewing-distance tip has no firing schedule and must never appear as a countdown).
   * Pure read: never mutates schedules.
   */
  public getNextReminders(now = Date.now()): NextReminderInfo[] {
    const list: NextReminderInfo[] = [];

    for (const type of TRACKED_REMINDER_TYPES) {
      const cycle = this.cycles[type];
      const config = this.getReminderConfig(type);
      if (!cycle || !config.enabled || cycle.scheduledTime <= 0) continue;

      const intervalMs = getReminderIntervalMs(this.settings, type);
      const frozen = cycle.pausedRemainingMs !== undefined;
      const remMs = Math.min(
        intervalMs,
        frozen ? (cycle.pausedRemainingMs as number) : Math.max(0, cycle.scheduledTime - now)
      );

      const hold = this.holds[type];
      const held =
        this.settings.adaptive.enabled && hold && hold.cycleId === cycle.cycleId && hold.until > now && hold.until > cycle.scheduledTime;
      list.push({
        type,
        nextDueTimestamp: frozen ? now + remMs : Math.min(cycle.scheduledTime, now + intervalMs),
        secondsRemaining: msToSeconds(remMs),
        status: cycle.status,
        cycleId: cycle.cycleId,
        isPaused: Boolean(config.paused),
        intervalSeconds: msToSeconds(intervalMs),
        ...(held ? { settlingUntil: hold!.until } : {}),
      });
    }
    return list.sort((a, b) => a.secondsRemaining - b.secondsRemaining);
  }

  public getDailySummary(dateString?: string, nowTimestamp = Date.now()): DailyWellnessSummary {
    const targetDate = dateString || dateKey(nowTimestamp);
    let eyeCompleted = 0;
    let moveCompleted = 0;
    let skipped = 0;
    let snoozed = 0;

    for (const log of this.breakLogs) {
      const logDate = dateKey(log.timestamp);
      if (logDate !== targetDate) continue;

      if (log.action === 'completed') {
        if (log.type === 'eye-break') eyeCompleted += 1;
        else moveCompleted += 1;
      } else if (log.action === 'skipped') {
        skipped += 1;
      } else if (log.action === 'snoozed') {
        snoozed += 1;
      }
    }

    const totalOffered = eyeCompleted + moveCompleted + skipped;
    const completionRate = totalOffered > 0 ? (eyeCompleted + moveCompleted) / totalOffered : 1;

    const screenHours = this.activeScreenSeconds / 3600;
    const goalHours = this.settings.dailyScreenTimeGoalHours;
    const screenPenalty = screenHours > goalHours ? Math.min(20, (screenHours - goalHours) * 5) : 0;
    const wellnessScore = Math.max(10, Math.min(100, Math.round(50 + completionRate * 35 + 15 - screenPenalty)));

    return {
      date: targetDate,
      totalScreenSeconds: this.activeScreenSeconds,
      totalIdleSeconds: this.idleSeconds,
      eyeBreaksCompleted: eyeCompleted,
      movementBreaksCompleted: moveCompleted,
      remindersSkipped: skipped,
      remindersSnoozed: snoozed,
      wellnessScore,
    };
  }

  public getBreakLogs(): BreakLogEntry[] {
    return [...this.breakLogs];
  }

  public setBreakLogs(logs: BreakLogEntry[]): void {
    this.breakLogs = Array.isArray(logs)
      ? logs.filter((l) => l && typeof l === 'object' && typeof l.timestamp === 'number')
      : [];
  }

  public getActiveBreak(): ActiveBreakState | null {
    return this.activeBreak;
  }

  public getActiveDate(): string {
    return this.activeDate;
  }

  public getStatus() {
    return {
      activeScreenSeconds: this.activeScreenSeconds,
      currentContinuousSeconds: this.currentContinuousSeconds,
      idleSeconds: this.idleSeconds,
      isIdle: this.isIdle,
      isPaused: this.isPaused,
      isLocked: this.isLocked,
      isSuspended: this.isSuspended,
      isLockOrSleepPaused: this.isLockOrSleepPaused,
      isFrozen: this.isFrozen,
      pauseUntil: this.pauseUntil,
      activeDate: this.activeDate,
    };
  }

  private generateCycleId(type: ReminderType, timestamp: number): string {
    const rand = Math.random().toString(36).substring(2, 9);
    return `${type}-${timestamp}-${rand}`;
  }

  private buildReminderEvent(
    type: ReminderType,
    cycleId: string,
    now: number,
    forcedVarIndex?: number
  ): ReminderDueEvent {
    const cycle = this.cycles[type];
    const varIndex = forcedVarIndex !== undefined ? forcedVarIndex : (cycle?.variationIndex ?? 0);
    const variation = getVariationForReminder(type, varIndex);
    const exercise = getExerciseForReminder(type, varIndex);
    let title = variation.title;
    let message = variation.subtitle;
    let firstWord = variation.firstWord;
    let highlightWord = variation.highlightWord;
    let instruction = variation.instruction;

    switch (type) {
      case 'eye-break':
        if (varIndex === 0) {
          // Distant-focus instruction always uses the user's configured Eye Rest duration.
          const eyeSecs = Math.max(1, Math.round(this.settings.eyeBreak.durationSeconds || 20));
          title = '👁️ Eye Break (20-20-20)';
          message = `Time to rest your eyes. Look at something about 6 metres away for ${eyeSecs} seconds.`;
          firstWord = 'Eye';
          highlightWord = 'Break';
          instruction = `Look at something 6 metres (20 ft) away for ${eyeSecs} seconds.`;
        } else {
          title = `👁️ ${variation.title}`;
        }
        break;
      case 'posture-stretch':
        if (varIndex === 0) {
          title = '🧘 Posture & Spine';
          message = 'Roll your shoulders back, align your neck, and release upper body tension.';
          firstWord = 'Posture &';
          highlightWord = 'Spine';
          instruction = 'Roll your shoulders back and align your neck upright.';
        } else {
          title = `🧘 ${variation.title}`;
        }
        break;
      case 'stand-move':
        if (varIndex === 0) {
          title = '🚶 Stand & Stretch';
          message = 'Time to stand up, stretch your legs, and get your blood flowing.';
          firstWord = 'Stand &';
          highlightWord = 'Stretch';
          instruction = 'Stand up tall and stretch your arms overhead.';
        } else {
          title = `🚶 ${variation.title}`;
        }
        break;
      case 'walking':
        if (varIndex === 0) {
          title = '🌿 Walking Refresh';
          message = 'Step away from your workstation for a refreshing 2-minute walk.';
          firstWord = 'Walking';
          highlightWord = 'Break';
          instruction = 'Step away from your desk and take a short walk.';
        } else {
          title = `🌿 ${variation.title}`;
        }
        break;
      case 'viewing-distance':
        title = '📐 Viewing Distance';
        message = 'Sit back comfortably and maintain arm-length distance from the screen.';
        firstWord = 'Viewing';
        highlightWord = 'Distance';
        instruction = 'Maintain arm-length distance from your monitor.';
        break;
    }

    return {
      cycleId,
      type,
      title,
      message,
      exercise,
      dueTimestamp: now,
      firstWord,
      highlightWord,
      instruction,
      variationIndex: varIndex,
      variationId: variation.id,
      categoryLabel: variation.categoryLabel,
      illustrationKey: variation.illustrationKey,
    };
  }

  private getReminderConfig(type: ReminderType): ReminderConfig {
    return this.getReminderConfigFor(this.settings, type);
  }

  private getReminderConfigFor(settings: UserSettings, type: ReminderType): ReminderConfig {
    const key = configKeyFor(type);
    if (key) return settings[key];
    return {
      enabled: settings.viewingDistanceReminder,
      intervalMinutes: 30,
      durationSeconds: 15,
      snoozeMinutes: 5,
      soundEnabled: false,
    };
  }

  private disabledCycle(type: ReminderType): ReminderCycleInfo {
    return { cycleId: `${type}-disabled`, type, scheduledTime: 0, status: 'completed' };
  }

  private scheduleNext(type: ReminderType, fromTimestamp: number): void {
    if (!TRACKED_REMINDER_TYPES.includes(type)) return;
    const config = this.getReminderConfig(type);
    if (!config.enabled) {
      this.cycles[type] = this.disabledCycle(type);
      return;
    }

    const intervalMs = getReminderIntervalMs(this.settings, type);
    const scheduledTime = fromTimestamp + intervalMs;
    const frozen = this.isFrozen || Boolean(config.paused);
    const prevVarIndex = this.cycles[type]?.variationIndex ?? 0;
    const vars = getExerciseVariations(type);
    const nextVarIndex = vars.length > 0 ? (prevVarIndex + 1) % vars.length : 0;

    this.cycles[type] = {
      cycleId: this.generateCycleId(type, scheduledTime),
      type,
      scheduledTime,
      status: 'scheduled',
      variationIndex: nextVarIndex,
      ...(frozen ? { pausedRemainingMs: intervalMs } : {}),
    };
  }

  private initializeCycles(initialTimestamp: number): Record<ReminderType, ReminderCycleInfo> {
    const res = {} as Record<ReminderType, ReminderCycleInfo>;
    // Viewing distance is a passive tip without a firing schedule: never tracked as a countdown.
    res['viewing-distance'] = this.disabledCycle('viewing-distance');
    for (const t of TRACKED_REMINDER_TYPES) {
      const config = this.getReminderConfig(t);
      if (!config.enabled) {
        res[t] = this.disabledCycle(t);
        continue;
      }
      const scheduledTime = initialTimestamp + getReminderIntervalMs(this.settings, t);
      res[t] = {
        cycleId: this.generateCycleId(t, scheduledTime),
        type: t,
        scheduledTime,
        status: 'scheduled',
        variationIndex: 0,
        ...(config.paused ? { pausedRemainingMs: getReminderIntervalMs(this.settings, t) } : {}),
      };
    }
    return res;
  }
}
