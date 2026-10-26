import {
  ReminderType,
  UserSettings,
  BreakLogEntry,
  ActiveBreakState,
  DailyWellnessSummary,
  ReminderCycleInfo,
  ReminderCycleStatus,
} from './types';
import { getExerciseForReminder } from './stretches';

export interface ReminderDueEvent {
  cycleId: string;
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

  private cycles: Record<ReminderType, ReminderCycleInfo>;
  private activeBreak: ActiveBreakState | null = null;
  private breakLogs: BreakLogEntry[] = [];
  private onReminderDueCallback?: (event: ReminderDueEvent) => void;

  constructor(settings: UserSettings, initialScreenSeconds = 0, initialTimestamp = Date.now()) {
    this.settings = { ...settings };
    this.activeScreenSeconds = initialScreenSeconds;
    this.currentContinuousSeconds = initialScreenSeconds;
    this.cycles = this.initializeCycles(initialTimestamp);
  }

  public setOnReminderDue(callback: (event: ReminderDueEvent) => void): void {
    this.onReminderDueCallback = callback;
  }

  public updateSettings(newSettings: UserSettings, now = Date.now()): void {
    this.settings = { ...newSettings };
    // Reschedule any currently 'scheduled' reminders with the new intervals
    const types: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking', 'viewing-distance'];
    for (const t of types) {
      if (this.cycles[t].status === 'scheduled') {
        this.scheduleNext(t, now);
      }
    }
  }

  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  public getCycleInfo(): Record<ReminderType, ReminderCycleInfo> {
    return JSON.parse(JSON.stringify(this.cycles));
  }

  public setCycleInfo(cycles: Partial<Record<ReminderType, ReminderCycleInfo>>, now = Date.now()): void {
    for (const [key, cycle] of Object.entries(cycles)) {
      if (cycle && this.cycles[key as ReminderType]) {
        this.cycles[key as ReminderType] = { ...cycle };
      }
    }
    // Perform sleep/wake audit on imported cycles
    this.handleWakeOrResume(now);
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

    // If a break is currently active, decrement its remaining seconds
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

    // Check overdue reminders by priority: walking > stand-move > posture-stretch > eye-break
    const types: ReminderType[] = ['walking', 'stand-move', 'posture-stretch', 'eye-break'];

    for (const type of types) {
      const config = this.getReminderConfig(type);
      if (!config.enabled) continue;

      const cycle = this.cycles[type];

      // CRITICAL DEDUPLICATION: Only trigger if status is 'scheduled'
      // If already 'notified' or 'in-progress', it will NOT trigger again during this cycle
      if (cycle.status === 'scheduled' && now >= cycle.scheduledTime) {
        // Atomically mark cycle as notified
        cycle.status = 'notified';
        cycle.notifiedAt = now;

        const event = this.buildReminderEvent(type, cycle.cycleId, now);

        // Burst suppression: prevent sudden multiple notifications if multiple overdue
        this.deferOtherReminders(type, now + 180000);

        if (this.onReminderDueCallback) {
          this.onReminderDueCallback(event);
        }

        return event;
      }
    }

    return null;
  }

  public triggerReminder(type: ReminderType, now = Date.now()): ReminderDueEvent {
    let cycle = this.cycles[type];
    if (cycle.status !== 'scheduled') {
      cycle.cycleId = `${type}-${now}`;
    }
    cycle.status = 'notified';
    cycle.notifiedAt = now;

    const event = this.buildReminderEvent(type, cycle.cycleId, now);
    this.deferOtherReminders(type, now + 180000);

    if (this.onReminderDueCallback) {
      this.onReminderDueCallback(event);
    }

    return event;
  }

  public startBreak(type: ReminderType, now = Date.now()): ActiveBreakState {
    const exercise = getExerciseForReminder(type);
    const config = this.getReminderConfig(type);
    const duration = this.settings.devTestMode ? Math.min(10, config.durationSeconds) : config.durationSeconds;

    const cycle = this.cycles[type];
    cycle.status = 'in-progress';

    this.activeBreak = {
      type,
      exercise,
      totalSeconds: duration,
      remainingSeconds: duration,
      status: 'active',
      cycleId: cycle.cycleId,
    };

    return this.activeBreak;
  }

  public completeBreak(type: ReminderType, actualDurationSeconds?: number, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const duration = actualDurationSeconds ?? config.durationSeconds;
    const cycle = this.cycles[type];

    cycle.status = 'completed';
    cycle.completedAt = now;

    this.breakLogs.push({
      id: `${cycle.cycleId}-comp-${now}`,
      type,
      timestamp: now,
      action: 'completed',
      durationSeconds: duration,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'completed';
      this.activeBreak = null;
    }

    // Schedule next legitimate cycle
    this.scheduleNext(type, now);
  }

  public snoozeBreak(type: ReminderType, now = Date.now()): void {
    const config = this.getReminderConfig(type);
    const snoozeMs = (this.settings.devTestMode ? 0.25 : config.snoozeMinutes) * 60 * 1000;
    const cycle = this.cycles[type];

    cycle.status = 'snoozed';

    this.breakLogs.push({
      id: `${cycle.cycleId}-snooze-${now}`,
      type,
      timestamp: now,
      action: 'snoozed',
      durationSeconds: 0,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'snoozed';
      this.activeBreak = null;
    }

    // Reschedule snooze cycle
    const nextTime = now + snoozeMs;
    this.cycles[type] = {
      cycleId: `${type}-${nextTime}`,
      type,
      scheduledTime: nextTime,
      status: 'scheduled',
    };
  }

  public skipBreak(type: ReminderType, now = Date.now()): void {
    const cycle = this.cycles[type];
    cycle.status = 'skipped';

    this.breakLogs.push({
      id: `${cycle.cycleId}-skip-${now}`,
      type,
      timestamp: now,
      action: 'skipped',
      durationSeconds: 0,
    });

    if (this.activeBreak && this.activeBreak.type === type) {
      this.activeBreak.status = 'skipped';
      this.activeBreak = null;
    }

    // Schedule next legitimate cycle
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
    this.handleWakeOrResume(now);
  }

  public handleWakeOrResume(now = Date.now()): void {
    // Audit overdue reminders to prevent sudden burst of notifications upon wake/resume
    const overdueTypes: ReminderType[] = [];
    const types: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking'];

    for (const t of types) {
      const cycle = this.cycles[t];
      if (cycle.status === 'scheduled' && cycle.scheduledTime <= now) {
        overdueTypes.push(t);
      }
    }

    if (overdueTypes.length > 1) {
      // Keep only the single most immediate reminder due right now
      // Defer remaining reminders smoothly
      const [first, ...rest] = overdueTypes;
      this.cycles[first].scheduledTime = now;

      rest.forEach((t, index) => {
        const staggeredDelay = (index + 1) * 300000; // 5m, 10m, 15m
        this.cycles[t].scheduledTime = now + staggeredDelay;
        this.cycles[t].cycleId = `${t}-${this.cycles[t].scheduledTime}`;
      });
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

  public getNextReminders(now = Date.now()): {
    type: ReminderType;
    nextDueTimestamp: number;
    secondsRemaining: number;
    status: ReminderCycleStatus;
    cycleId: string;
  }[] {
    const list: {
      type: ReminderType;
      nextDueTimestamp: number;
      secondsRemaining: number;
      status: ReminderCycleStatus;
      cycleId: string;
    }[] = [];

    for (const [key, cycle] of Object.entries(this.cycles)) {
      const type = key as ReminderType;
      const config = this.getReminderConfig(type);
      if (config.enabled && cycle.scheduledTime > 0) {
        list.push({
          type,
          nextDueTimestamp: cycle.scheduledTime,
          secondsRemaining: Math.max(0, Math.round((cycle.scheduledTime - now) / 1000)),
          status: cycle.status,
          cycleId: cycle.cycleId,
        });
      }
    }
    return list.sort((a, b) => a.secondsRemaining - b.secondsRemaining);
  }

  public getDailySummary(dateString?: string, nowTimestamp = Date.now()): DailyWellnessSummary {
    const targetDate = dateString || new Date(nowTimestamp).toISOString().split('T')[0];
    let eyeCompleted = 0;
    let moveCompleted = 0;
    let skipped = 0;
    let snoozed = 0;

    for (const log of this.breakLogs) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
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

  private buildReminderEvent(type: ReminderType, cycleId: string, now: number): ReminderDueEvent {
    const exercise = getExerciseForReminder(type);
    let title = 'ScreenCare Reminder';
    let message = 'Time to take care of your body and vision.';

    switch (type) {
      case 'eye-break':
        title = 'Time to rest your eyes 👁️ (20-20-20 Rule)';
        message = 'Look at something in the distance (20 feet) for 20 seconds.';
        break;
      case 'posture-stretch':
        title = 'Posture & Spine Check 🧘';
        message = 'Roll your shoulders back, align your neck, and relieve upper body tension.';
        break;
      case 'stand-move':
        title = 'Stand Up & Move 🚶';
        message = 'You have been seated for a full session. Stand up and stretch your body.';
        break;
      case 'walking':
        title = 'Walking Refresh Break 🌿';
        message = 'Step away from your workstation for a refreshing 2-3 minute walk.';
        break;
      case 'viewing-distance':
        title = 'Viewing Distance Check 📐';
        message = 'Sit back comfortably and maintain arm-length distance from the screen.';
        break;
    }

    return {
      cycleId,
      type,
      title,
      message,
      exercise,
      dueTimestamp: now,
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
      this.cycles[type] = {
        cycleId: `${type}-disabled`,
        type,
        scheduledTime: 0,
        status: 'completed',
      };
      return;
    }

    const intervalMs = this.settings.devTestMode
      ? (type === 'eye-break' ? 20 : type === 'posture-stretch' ? 40 : type === 'stand-move' ? 60 : 90) * 1000
      : config.intervalMinutes * 60 * 1000;

    const scheduledTime = fromTimestamp + intervalMs;
    this.cycles[type] = {
      cycleId: `${type}-${scheduledTime}`,
      type,
      scheduledTime,
      status: 'scheduled',
    };
  }

  private initializeCycles(initialTimestamp: number): Record<ReminderType, ReminderCycleInfo> {
    const types: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking', 'viewing-distance'];
    const res = {} as Record<ReminderType, ReminderCycleInfo>;
    for (const t of types) {
      const config = this.getReminderConfig(t);
      const intervalMs = this.settings.devTestMode
        ? (t === 'eye-break' ? 20 : t === 'posture-stretch' ? 40 : t === 'stand-move' ? 60 : 90) * 1000
        : config.intervalMinutes * 60 * 1000;
      const scheduledTime = initialTimestamp + intervalMs;
      res[t] = {
        cycleId: `${t}-${scheduledTime}`,
        type: t,
        scheduledTime,
        status: 'scheduled',
      };
    }
    return res;
  }

  private deferOtherReminders(triggeredType: ReminderType, deferUntil: number): void {
    for (const [key, cycle] of Object.entries(this.cycles)) {
      const type = key as ReminderType;
      if (type !== triggeredType && cycle.status === 'scheduled' && cycle.scheduledTime < deferUntil && cycle.scheduledTime > 0) {
        cycle.scheduledTime = deferUntil;
        cycle.cycleId = `${type}-${deferUntil}`;
      }
    }
  }
}
