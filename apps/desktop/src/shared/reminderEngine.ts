import {
  ReminderType,
  UserSettings,
  QuietHoursConfig,
  BreakLogEntry,
  ActiveBreakState,
  DailyWellnessSummary,
} from './types';
import { getExerciseForReminder } from './stretches';

export interface ReminderDueEvent {
  type: ReminderType;
  title: string;
  message: string;
  exercise: ReturnType<typeof getExerciseForReminder>;
  dueTimestamp: number;
}

export class ReminderEngine {
  private settings: UserSettings;
  private activeScreenSeconds = 0;
  private currentContinuousSeconds = 0;
  private idleSeconds = 0;
  private isIdle = false;
  private isPaused = false;
  private pauseUntil = 0;

  private nextDueTimestamps: Record<ReminderType, number> = {
    'eye-break': 0,
    'posture-stretch': 0,
    'stand-move': 0,
    'walking': 0,
    'viewing-distance': 0,
  };

  private activeBreak: ActiveBreakState | null = null;
  private breakLogs: BreakLogEntry[] = [];
  private onReminderDueCallback?: (event: ReminderDueEvent) => void;

  constructor(settings: UserSettings, initialScreenSeconds = 0, initialTimestamp = Date.now()) {
    this.settings = { ...settings };
    this.activeScreenSeconds = initialScreenSeconds;
    this.currentContinuousSeconds = initialScreenSeconds;
    this.recalculateAllNextDue(initialTimestamp);
  }

  public setOnReminderDue(callback: (event: ReminderDueEvent) => void): void {
    this.onReminderDueCallback = callback;
  }

  public updateSettings(newSettings: UserSettings, now = Date.now()): void {
    this.settings = { ...newSettings };
    this.recalculateAllNextDue(now);
  }

  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  public tick(systemIdleSeconds: number, now = Date.now()): ReminderDueEvent | null {
    const idleThreshold = this.settings.idleThresholdMinutes * 60;
    this.isIdle = systemIdleSeconds >= idleThreshold;

    if (this.isPaused) {
      if (this.pauseUntil > 0 && now >= this.pauseUntil) {
        this.resume(now);
      } else {
        return null;
      }
    }

    if (this.isIdle) {
      this.idleSeconds += 1;
      if (systemIdleSeconds >= 600) {
        this.currentContinuousSeconds = 0;
      }
      return null;
    }

    this.activeScreenSeconds += 1;
    this.currentContinuousSeconds += 1;

    if (this.activeBreak && this.activeBreak.status === 'active') {
      if (this.activeBreak.remainingSeconds > 0) {
        this.activeBreak.remainingSeconds -= 1;
      }
      if (this.activeBreak.remainingSeconds === 0) {
        this.completeBreak(this.activeBreak.type, this.activeBreak.totalSeconds, now);
      }
      return null;
    }

    if (this.isQuietHours(now)) {
      return null;
    }

    const types: ReminderType[] = ['walking', 'stand-move', 'posture-stretch', 'eye-break'];

    for (const type of types) {
      const config = this.getReminderConfig(type);
      if (!config.enabled) continue;

      const nextDue = this.nextDueTimestamps[type];
      if (nextDue > 0 && now >= nextDue) {
        const event = this.triggerReminder(type, now);
        this.deferOtherReminders(type, now + 180000);
        return event;
      }
    }

    return null;
  }

  public triggerReminder(type: ReminderType, now = Date.now()): ReminderDueEvent {
    const exercise = getExerciseForReminder(type);
    let title = 'ScreenCare Reminder';
    let message = 'Time to take care of your body and vision.';

    switch (type) {
      case 'eye-break':
        title = '20-20-20 Eye Break';
        message = 'Look at something 20 feet (6m) away for 20 seconds to relax your eyes.';
        break;
      case 'posture-stretch':
        title = 'Posture & Stretch Check';
        message = 'Roll your shoulders, align your spine, and relieve neck tension.';
        break;
      case 'stand-move':
        title = 'Stand Up & Move';
        message = 'You have been seated for an hour. Stand up and stretch your legs.';
        break;
      case 'walking':
        title = 'Walking Refresh Break';
        message = 'Step away from your workstation for a 2-3 minute refreshing walk.';
        break;
      case 'viewing-distance':
        title = 'Viewing Distance Check';
        message = 'Sit back comfortably and maintain arm-length distance from the screen.';
        break;
    }

    const event: ReminderDueEvent = {
      type,
      title,
      message,
      exercise,
      dueTimestamp: now,
    };

    if (this.onReminderDueCallback) {
      this.onReminderDueCallback(event);
    }

    return event;
  }

  public startBreak(type: ReminderType): ActiveBreakState {
    const exercise = getExerciseForReminder(type);
    const config = this.getReminderConfig(type);
    const duration = this.settings.devTestMode ? Math.min(10, config.durationSeconds) : config.durationSeconds;

    this.activeBreak = {
      type,
      exercise,
      totalSeconds: duration,
      remainingSeconds: duration,
      status: 'active',
    };

    return this.activeBreak;
  }

  public completeBreak(type: ReminderType, actualDurationSeconds?: number, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const duration = actualDurationSeconds ?? config.durationSeconds;

    this.breakLogs.push({
      id: `${now}-${type}`,
      type,
      timestamp: now,
      action: 'completed',
      durationSeconds: duration,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'completed';
    }

    this.scheduleNext(type, now);
  }

  public snoozeBreak(type: ReminderType, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const snoozeMs = (this.settings.devTestMode ? 0.25 : config.snoozeMinutes) * 60 * 1000;

    this.nextDueTimestamps[type] = now + snoozeMs;

    this.breakLogs.push({
      id: `${now}-${type}`,
      type,
      timestamp: now,
      action: 'snoozed',
      durationSeconds: 0,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'snoozed';
      this.activeBreak = null;
    }
  }

  public skipBreak(type: ReminderType, now = Date.now()): void {
    this.breakLogs.push({
      id: `${now}-${type}`,
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

  public pause(minutes?: number, now = Date.now()): void {
    this.isPaused = true;
    if (minutes && minutes > 0) {
      this.pauseUntil = now + minutes * 60 * 1000;
    } else {
      this.pauseUntil = 0;
    }
  }

  public resume(now = Date.now()): void {
    this.isPaused = false;
    this.pauseUntil = 0;
    this.recalculateAllNextDue(now);
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

  public getNextReminders(now = Date.now()): { type: ReminderType; nextDueTimestamp: number; secondsRemaining: number }[] {
    const list: { type: ReminderType; nextDueTimestamp: number; secondsRemaining: number }[] = [];
    for (const [key, due] of Object.entries(this.nextDueTimestamps)) {
      const type = key as ReminderType;
      const config = this.getReminderConfig(type);
      if (config.enabled && due > 0) {
        list.push({
          type,
          nextDueTimestamp: due,
          secondsRemaining: Math.max(0, Math.round((due - now) / 1000)),
        });
      }
    }
    return list.sort((a, b) => a.secondsRemaining - b.secondsRemaining);
  }

  public getDailySummary(dateString = new Date().toISOString().split('T')[0]): DailyWellnessSummary {
    let eyeCompleted = 0;
    let moveCompleted = 0;
    let skipped = 0;
    let snoozed = 0;

    for (const log of this.breakLogs) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate !== dateString) continue;

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
      date: dateString,
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
    this.breakLogs = [...logs];
  }

  public getActiveBreak(): ActiveBreakState | null {
    return this.activeBreak;
  }

  public getStatus() {
    return {
      activeScreenSeconds: this.activeScreenSeconds,
      currentContinuousSeconds: this.currentContinuousSeconds,
      idleSeconds: this.idleSeconds,
      isIdle: this.isIdle,
      isPaused: this.isPaused,
      pauseUntil: this.pauseUntil,
    };
  }

  private getReminderConfig(type: ReminderType) {
    switch (type) {
      case 'eye-break':
        return this.settings.eyeBreak;
      case 'posture-stretch':
        return this.settings.postureStretch;
      case 'stand-move':
        return this.settings.standMove;
      case 'walking':
        return this.settings.walking;
      case 'viewing-distance':
        return {
          enabled: this.settings.viewingDistanceReminder,
          intervalMinutes: 30,
          durationSeconds: 15,
          snoozeMinutes: 5,
          soundEnabled: false,
        };
    }
  }

  private scheduleNext(type: ReminderType, fromTimestamp: number): void {
    const config = this.getReminderConfig(type);
    if (!config.enabled) {
      this.nextDueTimestamps[type] = 0;
      return;
    }

    const intervalMs = this.settings.devTestMode
      ? (type === 'eye-break' ? 20 : type === 'posture-stretch' ? 40 : type === 'stand-move' ? 60 : 90) * 1000
      : config.intervalMinutes * 60 * 1000;

    this.nextDueTimestamps[type] = fromTimestamp + intervalMs;
  }

  private recalculateAllNextDue(now: number): void {
    const types: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking', 'viewing-distance'];
    for (const t of types) {
      this.scheduleNext(t, now);
    }
  }

  private deferOtherReminders(triggeredType: ReminderType, deferUntil: number): void {
    for (const [key, due] of Object.entries(this.nextDueTimestamps)) {
      const type = key as ReminderType;
      if (type !== triggeredType && due < deferUntil && due > 0) {
        this.nextDueTimestamps[type] = deferUntil;
      }
    }
  }
}
