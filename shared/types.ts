export type ReminderType = 'eye-break' | 'posture-stretch' | 'stand-move' | 'walking' | 'viewing-distance';

export type ReminderCycleStatus =
  | 'scheduled'
  | 'notified'
  | 'in-progress'
  | 'completed'
  | 'skipped'
  | 'snoozed';

export interface ReminderCycleInfo {
  cycleId: string;
  type: ReminderType;
  scheduledTime: number;
  status: ReminderCycleStatus;
  notifiedAt?: number;
  completedAt?: number;
  pausedRemainingMs?: number;
  variationIndex?: number;
}

export interface ExerciseVariation {
  id: string;
  type: ReminderType;
  title: string;
  categoryLabel: string;
  firstWord: string;
  highlightWord: string;
  subtitle: string;
  instruction: string;
  illustrationKey: string;
  durationSeconds: number;
  description: string;
}

export interface ReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
  durationSeconds: number;
  snoozeMinutes: number;
  soundEnabled: boolean;
  paused?: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h
}

/**
 * Adaptive reminder preferences. These only influence WHEN a due reminder is allowed to be presented
 * (eligibility, settling after an absence, grouping look-ahead). They never rewrite a reminder's
 * configured interval.
 */
export interface AdaptiveSettings {
  /** Master switch for the adaptive return-from-break and grouping behaviour. */
  enabled: boolean;
  /** Allow transparent, deterministic rules to tune timing from locally observed lock/idle durations. */
  learnFromPatterns: boolean;
  /** An absence (lock / sleep / inactivity / app closed) lasting at least this long is a "long" absence. */
  longAbsenceMinutes: number;
  /** After a long absence, nearly-due/overdue reminders wait this long before being presented. */
  settlingMinutes: number;
  /** A reminder is "nearly due" when its remaining time is at most this percentage of its own interval. */
  nearlyDuePercent: number;
  /**
   * Upper bound (seconds) a due reminder may wait for a compatible reminder that is about to become due,
   * so both can be presented as one combined break. The effective wait is also capped at 10% of the
   * waiting reminder's own interval.
   */
  groupingWindowSeconds: number;
}

/** Why the user was away, as far as the operating system can tell. Never a guess about the activity. */
export type AbsenceSource = 'lock' | 'suspend' | 'idle' | 'app-off';
export type AbsenceKind = 'momentary' | 'short' | 'long';

export interface AbsenceRecord {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  source: AbsenceSource;
  kind: AbsenceKind;
  /** Number of reminders held for settling / grace when the user returned. */
  heldCount: number;
  /** Reminders that came due (wall-clock) while away. Locks/sleep freeze countdowns, so usually 0 there. */
  dueWhileAway: number;
  /** A reminder was presented within the first minute after this return. */
  reminderSoonAfterReturn?: boolean;
}

export interface AdaptiveStatus {
  enabled: boolean;
  phase: 'active' | 'away' | 'settling';
  awaySince?: number;
  awaySource?: AbsenceSource;
  lastReturn?: { kind: AbsenceKind; source: AbsenceSource; durationSeconds: number; endedAt: number };
  settlingUntil?: number;
  heldTypes: ReminderType[];
  effectiveSettlingSeconds: number;
  shortReturnGraceSeconds: number;
  insights: string[];
}

export interface UserSettings {
  eyeBreak: ReminderConfig;
  postureStretch: ReminderConfig;
  standMove: ReminderConfig;
  walking: ReminderConfig;
  viewingDistanceReminder: boolean;
  quietHours: QuietHoursConfig;
  dailyScreenTimeGoalHours: number;
  idleThresholdMinutes: number;
  startAtLogin: boolean;
  minimizeToTray: boolean;
  theme: 'light' | 'dark' | 'system';
  devTestMode: boolean; // Enables 15-30s intervals for live testing
  cameraDistanceEnabled: boolean; // Optional opt-in local camera measurement
  adaptive: AdaptiveSettings;
}

export interface BreakLogEntry {
  id: string;
  type: ReminderType;
  timestamp: number;
  action: 'completed' | 'snoozed' | 'skipped';
  durationSeconds: number;
}

export interface DailyWellnessSummary {
  date: string; // YYYY-MM-DD
  totalScreenSeconds: number;
  totalIdleSeconds: number;
  eyeBreaksCompleted: number;
  movementBreaksCompleted: number;
  remindersSkipped: number;
  remindersSnoozed: number;
  wellnessScore: number; // 0 - 100
}

export interface StretchExercise {
  id: string;
  title: string;
  category: 'eye' | 'posture' | 'stretch' | 'movement';
  targetArea: string;
  durationSeconds: number;
  description: string;
  steps: string[];
  benefits: string;
  illustrationKey: string;
}

export interface ActiveBreakState {
  type: ReminderType;
  exercise: StretchExercise;
  remainingSeconds: number;
  totalSeconds: number;
  status: 'active' | 'paused' | 'completed' | 'snoozed' | 'skipped';
  cycleId?: string;
}

export interface AppStateSnapshot {
  activeScreenSeconds: number;
  currentContinuousSeconds: number;
  isIdle: boolean;
  isPaused: boolean;
  pausedUntil?: number;
  todaySummary: DailyWellnessSummary;
  recentLogs: BreakLogEntry[];
  settings: UserSettings;
  activeBreak?: ActiveBreakState | null;
  nextReminders: {
    type: ReminderType;
    nextDueTimestamp: number;
    secondsRemaining: number;
    status: ReminderCycleStatus;
    cycleId: string;
    isPaused?: boolean;
    /** Effective interval of this reminder in seconds (reflects Rapid Test Mode). */
    intervalSeconds?: number;
    /** Set while the reminder is held by the return-from-break settling period (presentation only). */
    settlingUntil?: number;
  }[];
  adaptive?: AdaptiveStatus;
}

export const DEFAULT_SETTINGS: UserSettings = {
  eyeBreak: {
    enabled: true,
    intervalMinutes: 20,
    durationSeconds: 20,
    snoozeMinutes: 5,
    soundEnabled: true,
    paused: false,
  },
  postureStretch: {
    enabled: true,
    intervalMinutes: 45,
    durationSeconds: 45,
    snoozeMinutes: 10,
    soundEnabled: true,
    paused: false,
  },
  standMove: {
    enabled: true,
    intervalMinutes: 60,
    durationSeconds: 60,
    snoozeMinutes: 10,
    soundEnabled: true,
    paused: false,
  },
  walking: {
    enabled: true,
    intervalMinutes: 90,
    durationSeconds: 180, // 3 minutes
    snoozeMinutes: 15,
    soundEnabled: true,
    paused: false,
  },
  viewingDistanceReminder: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
  dailyScreenTimeGoalHours: 6,
  idleThresholdMinutes: 3,
  startAtLogin: false,
  minimizeToTray: true,
  theme: 'system',
  devTestMode: false,
  cameraDistanceEnabled: false,
  adaptive: {
    enabled: true,
    learnFromPatterns: true,
    longAbsenceMinutes: 15,
    settlingMinutes: 3,
    nearlyDuePercent: 25,
    groupingWindowSeconds: 60,
  },
};
