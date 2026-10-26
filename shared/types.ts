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
}

export interface ReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
  durationSeconds: number;
  snoozeMinutes: number;
  soundEnabled: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h
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
  }[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  eyeBreak: {
    enabled: true,
    intervalMinutes: 20,
    durationSeconds: 20,
    snoozeMinutes: 5,
    soundEnabled: true,
  },
  postureStretch: {
    enabled: true,
    intervalMinutes: 45,
    durationSeconds: 45,
    snoozeMinutes: 10,
    soundEnabled: true,
  },
  standMove: {
    enabled: true,
    intervalMinutes: 60,
    durationSeconds: 60,
    snoozeMinutes: 10,
    soundEnabled: true,
  },
  walking: {
    enabled: true,
    intervalMinutes: 90,
    durationSeconds: 180, // 3 minutes
    snoozeMinutes: 15,
    soundEnabled: true,
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
};
