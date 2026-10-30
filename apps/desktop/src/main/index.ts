import {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  Notification,
  Tray,
  Menu,
  nativeImage,
  screen,
} from 'electron';
import path from 'path';
import fs from 'fs';
import {
  ReminderEngine,
  ReminderDueEvent,
  AdaptiveStateSnapshot,
  normalizeSettings,
  dateKey,
  PRESENTATION_GAP_MS,
} from '../shared/reminderEngine';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  AppStateSnapshot,
  ReminderType,
  BreakLogEntry,
  ReminderCycleInfo,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let notificationWindow: BrowserWindow | null = null;
let notifAutoDismissTimeout: NodeJS.Timeout | null = null;
// Fallback queue for events that arrive while a panel is showing (e.g. a preview). Scheduled reminders
// are queued inside the engine itself: they stay due in their own cycle until actually presented.
let notificationQueue: ReminderDueEvent[] = [];
let lastAdaptivePhase = '';
let queueProcessTimeout: NodeJS.Timeout | null = null;
let isDisplayingNotification = false;
let tray: Tray | null = null;
let engine: ReminderEngine;
let timerInterval: NodeJS.Timeout | null = null;
let saveInterval: NodeJS.Timeout | null = null;
let isQuitting = false;
// Timestamps of the last lock / suspend events, used to reconcile missed unlock/resume events.
let lockedAt = 0;
let suspendedAt = 0;

const dataDir = app.getPath('userData');
const dataFilePath = path.join(dataDir, 'screencare-data.json');

interface StoredData {
  schemaVersion?: number;
  settings: UserSettings;
  activeScreenSeconds: number;
  activeDate?: string;
  breakLogs: BreakLogEntry[];
  cycles?: Record<ReminderType, ReminderCycleInfo>;
  deliveredCycleIds?: string[];
  /** When this state was written. Used by the startup policy (app-off time is frozen). */
  savedAt?: number;
  /** Adaptive context: absence durations/sources, presentation holds. No content or input data. */
  adaptive?: AdaptiveStateSnapshot;
}

// v2 + optional `adaptive` block (additive; older builds ignore it, so the version is unchanged).
const STORE_SCHEMA_VERSION = 2;

/**
 * Loads persisted state. Never throws and never deletes user data:
 *  - missing file            -> defaults
 *  - corrupt / unparsable    -> file is preserved as screencare-data.corrupt-<ts>.json, defaults used
 *  - partial / outdated data -> every field validated and merged onto defaults (backward compatible)
 */
function loadStoredData(): StoredData {
  const fallback: StoredData = { settings: normalizeSettings(DEFAULT_SETTINGS), activeScreenSeconds: 0, breakLogs: [] };
  if (!fs.existsSync(dataFilePath)) return fallback;
  let parsed: any;
  try {
    parsed = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') throw new Error('Stored data is not an object');
  } catch (err) {
    console.error('Stored ScreenCare data is unreadable; keeping a backup and starting with defaults:', err);
    try {
      fs.copyFileSync(dataFilePath, path.join(dataDir, `screencare-data.corrupt-${Date.now()}.json`));
    } catch (_e) {}
    return fallback;
  }
  const today = dateKey(Date.now());
  const storedDate = typeof parsed.activeDate === 'string' ? parsed.activeDate : undefined;
  const storedSeconds = Number(parsed.activeScreenSeconds);
  return {
    schemaVersion: Number(parsed.schemaVersion) || 1,
    settings: normalizeSettings(parsed.settings, DEFAULT_SETTINGS),
    // "Today" counters only carry over within the same day (legacy files without a date are kept once).
    activeScreenSeconds:
      Number.isFinite(storedSeconds) && storedSeconds > 0 && (!storedDate || storedDate === today) ? storedSeconds : 0,
    activeDate: today,
    breakLogs: Array.isArray(parsed.breakLogs) ? parsed.breakLogs : [],
    cycles: parsed.cycles && typeof parsed.cycles === 'object' ? parsed.cycles : undefined,
    deliveredCycleIds: Array.isArray(parsed.deliveredCycleIds) ? parsed.deliveredCycleIds : undefined,
    savedAt: Number.isFinite(Number(parsed.savedAt)) && Number(parsed.savedAt) > 0 ? Number(parsed.savedAt) : undefined,
    adaptive: parsed.adaptive && typeof parsed.adaptive === 'object' ? parsed.adaptive : undefined,
  };
}

function saveStoredData(): void {
  if (!engine) return;
  try {
    const now = Date.now();
    const data: StoredData = {
      schemaVersion: STORE_SCHEMA_VERSION,
      settings: engine.getSettings(),
      activeScreenSeconds: engine.getStatus().activeScreenSeconds,
      activeDate: engine.getActiveDate(),
      breakLogs: engine.getBreakLogs().slice(-200),
      cycles: engine.getCycleInfo(),
      deliveredCycleIds: engine.getDeliveredCycleIds(),
      savedAt: now,
      adaptive: engine.getAdaptiveState(),
    };
    const tempPath = `${dataFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dataFilePath);
  } catch (err) {
    console.error('Error saving stored ScreenCare data:', err);
  }
}

/** Creates the single authoritative engine instance and wires its one delivery path. */
function createEngine(data: StoredData): ReminderEngine {
  const now = Date.now();
  const e = new ReminderEngine(data.settings, data.activeScreenSeconds, now);
  e.setBreakLogs(data.breakLogs);
  if (data.deliveredCycleIds) e.setDeliveredCycleIds(data.deliveredCycleIds);
  if (data.adaptive) e.setAdaptiveState(data.adaptive, now);
  if (data.cycles) e.setCycleInfo(data.cycles, now, data.savedAt);
  // Time while ScreenCare was not running counts as an absence for the return-from-break policy.
  e.handleAppStart(data.cycles ? data.savedAt : undefined, now);
  e.setOnReminderDue((event) => {
    showNotificationForEvent(event);
  });
  return e;
}

/** Drops any pending or visible notification (used on lock, sleep, quit). Cycles are already marked delivered, so nothing is replayed later. */
function clearNotificationPresentation(): void {
  notificationQueue = [];
  if (queueProcessTimeout) {
    clearTimeout(queueProcessTimeout);
    queueProcessTimeout = null;
  }
  if (notifAutoDismissTimeout) {
    clearTimeout(notifAutoDismissTimeout);
    notifAutoDismissTimeout = null;
  }
  isDisplayingNotification = false;
  if (engine) engine.setPresentationActive(false, Date.now());
  const win = notificationWindow;
  notificationWindow = null;
  if (win && !win.isDestroyed()) {
    win.destroy();
  }
}

function getAppSnapshot(): AppStateSnapshot {
  const status = engine.getStatus();
  return {
    activeScreenSeconds: status.activeScreenSeconds,
    currentContinuousSeconds: status.currentContinuousSeconds,
    isIdle: status.isIdle,
    isPaused: status.isPaused || status.isLocked || status.isSuspended || status.isLockOrSleepPaused,
    pausedUntil: status.pauseUntil,
    todaySummary: engine.getDailySummary(),
    recentLogs: engine.getBreakLogs().slice(-20),
    settings: engine.getSettings(),
    activeBreak: null,
    nextReminders: engine.getNextReminders(),
    adaptive: engine.getAdaptiveStatus(),
  };
}

function focusMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 840,
    minHeight: 580,
    title: 'ScreenCare',
    show: false,
    backgroundColor: '#0b0f19',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  // Minimize to system tray if enabled
  win.on('minimize', (event: any) => {
    if (engine.getSettings().minimizeToTray) {
      event.preventDefault();
      win.hide();
    }
  });

  // Close hides to system tray unless explicitly quitting
  win.on('close', (event) => {
    if (!isQuitting && engine.getSettings().minimizeToTray) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

/**
 * Coordinates and displays the polished custom Electron animated notification panel.
 * Non-modal, non-intrusive, positioned above Windows taskbar, focusable: false so typing is never interrupted.
 * Incompatible reminders are queued sequentially without overlapping windows.
 */
function showNotificationForEvent(event: ReminderDueEvent): void {
  try {
    // Never present anything while Windows is locked or asleep
    if (engine && engine.isSystemPaused()) return;
    // If a notification panel is currently displayed, queue this event to deliver sequentially
    if (isDisplayingNotification && notificationWindow && !notificationWindow.isDestroyed()) {
      const isAlreadyQueued = notificationQueue.some((q) => q.cycleId === event.cycleId);
      if (!isAlreadyQueued) {
        notificationQueue.push(event);
      }
      return;
    }

    displayNotificationPanel(event);
  } catch (err) {
    console.error('Safe notification dispatch error:', err);
  }
}

function displayNotificationPanel(event: ReminderDueEvent): void {
  try {
    // Clean up existing notification window if active (destroy synchronously; its 'closed' handler is
    // instance-guarded so it can never clobber the state of the panel created below)
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      const old = notificationWindow;
      notificationWindow = null;
      old.destroy();
    }
    if (notifAutoDismissTimeout) {
      clearTimeout(notifAutoDismissTimeout);
      notifAutoDismissTimeout = null;
    }

    isDisplayingNotification = true;
    // One panel at a time: the engine holds further reminders (in their own cycles) until this closes.
    engine.setPresentationActive(true, Date.now());

    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;

    // Dimensions matching reference card
    const NOTIF_WIDTH = 350;
    const NOTIF_HEIGHT = 430;
    const margin = 16;
    const x = Math.round(workX + workWidth - NOTIF_WIDTH - margin);
    const y = Math.round(workY + workHeight - NOTIF_HEIGHT - margin);

    const panel = new BrowserWindow({
      width: NOTIF_WIDTH,
      height: NOTIF_HEIGHT,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false, // CRITICAL: NEVER steals focus or interrupts typing
      show: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    notificationWindow = panel;

    const queryPayload = encodeURIComponent(
      JSON.stringify({
        type: event.type,
        title: event.title,
        message: event.message,
        cycleId: event.cycleId,
        instruction: event.instruction,
        isGrouped: event.isGrouped,
        groupedTypes: event.groupedTypes,
        firstWord: event.firstWord,
        highlightWord: event.highlightWord,
        categoryLabel: event.categoryLabel,
        illustrationKey: event.illustrationKey,
        variationIndex: event.variationIndex,
        variationId: event.variationId,
      })
    );

    const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
    if (isDev) {
      panel.loadURL(`${process.env.VITE_DEV_SERVER_URL}#notification?data=${queryPayload}`);
    } else {
      panel.loadFile(path.join(__dirname, '../../dist/index.html'), {
        hash: `notification?data=${queryPayload}`,
      });
    }

    panel.once('ready-to-show', () => {
      // Never show a panel that was replaced, or while Windows is locked/asleep
      if (notificationWindow === panel && !panel.isDestroyed() && !engine.isSystemPaused()) {
        panel.showInactive(); // Display smoothly without taking focus
      }
    });

    const onWindowClosed = () => {
      // Ignore close events from a panel that has already been replaced or cleared
      if (notificationWindow !== panel) return;
      isDisplayingNotification = false;
      notificationWindow = null;
      if (notifAutoDismissTimeout) {
        clearTimeout(notifAutoDismissTimeout);
        notifAutoDismissTimeout = null;
      }
      engine.setPresentationActive(false, Date.now());

      // Deliver the next queued (incompatible / held-back) reminder after a short gap, never overlapping.
      if (engine.isSystemPaused()) return;
      if (queueProcessTimeout) clearTimeout(queueProcessTimeout);
      queueProcessTimeout = setTimeout(() => {
        queueProcessTimeout = null;
        if (engine.isSystemPaused() || isDisplayingNotification) return;
        const nextEvent = notificationQueue.shift();
        if (nextEvent) {
          displayNotificationPanel(nextEvent);
        } else {
          engine.deliverPending(Date.now()); // emits through the single delivery path if anything is due
        }
      }, PRESENTATION_GAP_MS);
    };

    panel.on('closed', onWindowClosed);

    // Auto-dismiss smoothly after 15 seconds of display
    notifAutoDismissTimeout = setTimeout(() => {
      if (!panel.isDestroyed()) {
        panel.close();
      }
    }, 15000);

    // Also trigger subtle native sound if sound is enabled
    if (Notification.isSupported() && engine.getSettings().eyeBreak.soundEnabled) {
      try {
        const notif = new Notification({
          title: event.title,
          body: event.message,
          silent: false,
        });
        notif.on('click', () => {
          focusMainWindow();
        });
        // Silent native notification accompanies panel
      } catch (err) {}
    }
  } catch (err) {
    console.error('Safe notification dispatch error:', err);
    isDisplayingNotification = false;
  }
}

function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - 7.5;
      const dy = y - 7.5;
      if (dx * dx + dy * dy <= 49) {
        canvas[idx] = 14;
        canvas[idx + 1] = 180;
        canvas[idx + 2] = 14;
        canvas[idx + 3] = 255;
      } else {
        canvas[idx + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function updateTrayMenu(): void {
  if (!tray) return;
  const status = engine.getStatus();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open ScreenCare',
      click: () => {
        focusMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: `Monitoring: ${status.isPaused ? 'Paused' : 'Active'}`,
      enabled: false,
    },
    ...trayAdaptiveItems(),
    {
      label: status.isPaused ? 'Resume Monitoring' : 'Pause Reminders (1 Hour)',
      click: () => {
        if (status.isPaused) {
          engine.resume();
        } else {
          engine.pause(60);
        }
        saveStoredData();
        broadcastState();
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Stop Application & Exit',
      click: () => {
        stopApplication();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function trayAdaptiveItems(): Electron.MenuItemConstructorOptions[] {
  try {
    const a = engine.getAdaptiveStatus();
    if (!a.enabled || a.phase !== 'settling' || !a.settlingUntil) return [];
    const at = new Date(a.settlingUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return [{ label: `Settling in after your break — reminders resume by ${at}`, enabled: false }];
  } catch (_e) {
    return [];
  }
}

function setupTray(): void {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('ScreenCare — Mindful Screen Rest');
    updateTrayMenu();
    tray.on('double-click', () => {
      focusMainWindow();
    });
  } catch (err) {
    console.warn('System tray setup skipped or failed:', err);
  }
}

function broadcastState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('screencare:state-update', getAppSnapshot());
  }
}

/**
 * Clean, explicit shutdown: stops the scheduler, the autosave timer, any notification panel and the
 * tray, persists state once, then exits. Used by the tray "Stop Application & Exit" item and the
 * Settings "Stop ScreenCare" button.
 */
function stopApplication(): void {
  isQuitting = true;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  clearNotificationPresentation();
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
  saveStoredData();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
  app.exit(0);
}

/**
 * Safety net for missed Windows power events. Electron's lock/unlock/suspend/resume events are the
 * primary signal; if an unlock or resume event is ever lost, the scheduler would otherwise stay frozen.
 * We only clear the frozen state when the OS reports the session is NOT locked AND there has been user
 * input since the lock/suspend event (idle time shorter than the time elapsed since that event).
 */
function reconcilePowerState(idleSeconds: number, now: number): void {
  if (!engine.isSystemPaused()) return;
  let osLocked = false;
  try {
    osLocked = powerMonitor.getSystemIdleState(1) === 'locked';
  } catch (_e) {
    return;
  }
  if (osLocked) return;
  const inputAfter = (eventAt: number) => eventAt > 0 && idleSeconds * 1000 < now - eventAt - 2000;
  if (engine.isSystemSuspended() && inputAfter(suspendedAt)) {
    console.warn('ScreenCare: resume event not received; system is active again, resuming timers.');
    engine.setSuspended(false, now);
  }
  if (engine.isSystemLocked() && inputAfter(lockedAt)) {
    console.warn('ScreenCare: unlock event not received; session is unlocked, resuming timers.');
    engine.setLocked(false, now);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another ScreenCare instance owns the scheduler; never start a second one.
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    engine = createEngine(loadStoredData());
    saveStoredData(); // persist any migration/normalization immediately

    mainWindow = createMainWindow();
    setupTray();

    // Single authoritative timer ticker (runs while the dashboard is hidden in the tray)
    timerInterval = setInterval(() => {
      const now = Date.now();
      const idleSec = powerMonitor.getSystemIdleTime();
      reconcilePowerState(idleSec, now);
      engine.tick(idleSec, now);
      broadcastState();
      const phase = engine.getAdaptiveStatus(now).phase;
      if (phase !== lastAdaptivePhase) {
        lastAdaptivePhase = phase;
        updateTrayMenu();
      }
    }, 1000);

    saveInterval = setInterval(saveStoredData, 60000);

    // Lock / sleep: freeze every countdown and active-time accumulation; drop any visible/queued panel.
    powerMonitor.on('lock-screen', () => {
      lockedAt = Date.now();
      clearNotificationPresentation();
      engine.setLocked(true, lockedAt);
      saveStoredData();
      broadcastState();
      updateTrayMenu();
    });
    powerMonitor.on('unlock-screen', () => {
      lockedAt = 0;
      engine.setLocked(false, Date.now());
      saveStoredData();
      broadcastState();
      updateTrayMenu();
    });
    powerMonitor.on('suspend', () => {
      suspendedAt = Date.now();
      clearNotificationPresentation();
      engine.setSuspended(true, suspendedAt);
      saveStoredData();
      broadcastState();
      updateTrayMenu();
    });
    powerMonitor.on('resume', () => {
      // If the machine wakes to a still-locked session, engine stays frozen until unlock.
      suspendedAt = 0;
      engine.setSuspended(false, Date.now());
      saveStoredData();
      broadcastState();
      updateTrayMenu();
    });

    try {
      app.setLoginItemSettings({
        openAtLogin: engine.getSettings().startAtLogin,
      });
    } catch (e) {}
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  clearNotificationPresentation();
  saveStoredData();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !engine?.getSettings()?.minimizeToTray) {
    app.quit();
  }
});

ipcMain.handle('screencare:get-state', () => {
  return getAppSnapshot();
});

/**
 * Save Preferences. The payload is validated against the current settings, applied to the running
 * engine (which reschedules only reminders whose interval/enabled state changed), persisted, and the
 * resulting authoritative snapshot is returned so the renderer can display it immediately.
 */
ipcMain.handle('screencare:update-settings', (_event, newSettings: UserSettings) => {
  const normalized = normalizeSettings(newSettings, engine.getSettings());
  engine.updateSettings(normalized, Date.now());
  saveStoredData();
  try {
    app.setLoginItemSettings({ openAtLogin: normalized.startAtLogin });
  } catch (e) {}
  const snapshot = getAppSnapshot();
  broadcastState();
  updateTrayMenu();
  return snapshot;
});

ipcMain.handle('screencare:pause', (_event, minutes?: number) => {
  engine.pause(minutes);
  saveStoredData();
  broadcastState();
  updateTrayMenu();
  return getAppSnapshot();
});

ipcMain.handle('screencare:resume', () => {
  engine.resume();
  saveStoredData();
  broadcastState();
  updateTrayMenu();
  return getAppSnapshot();
});

ipcMain.handle('screencare:reset-all-data', () => {
  // Explicit user action. Keep a backup of the previous file rather than destroying it.
  try {
    if (fs.existsSync(dataFilePath)) {
      fs.copyFileSync(dataFilePath, path.join(dataDir, `screencare-data.before-reset-${Date.now()}.json`));
      fs.unlinkSync(dataFilePath);
    }
  } catch (e) {}
  clearNotificationPresentation();
  // Re-create through createEngine so the notification callback is wired again.
  engine = createEngine({ settings: normalizeSettings(DEFAULT_SETTINGS), activeScreenSeconds: 0, breakLogs: [] });
  saveStoredData();
  broadcastState();
  updateTrayMenu();
  return getAppSnapshot();
});

ipcMain.handle('screencare:minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('screencare:close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('screencare:stop-application', () => {
  stopApplication();
});

ipcMain.handle('screencare:get-database-path', () => {
  return dataFilePath;
});

// Notification Panel Controls. Closing a panel never records completion.
ipcMain.handle('screencare:close-notification', () => {
  if (notifAutoDismissTimeout) {
    clearTimeout(notifAutoDismissTimeout);
    notifAutoDismissTimeout = null;
  }
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close(); // 'closed' handler advances the queue
  }
});

ipcMain.handle('screencare:click-notification', () => {
  if (notifAutoDismissTimeout) {
    clearTimeout(notifAutoDismissTimeout);
    notifAutoDismissTimeout = null;
  }
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close();
  }
  focusMainWindow();
});

ipcMain.handle('screencare:pause-notification-timer', () => {
  if (notifAutoDismissTimeout) {
    clearTimeout(notifAutoDismissTimeout);
    notifAutoDismissTimeout = null;
  }
});

ipcMain.handle('screencare:resume-notification-timer', () => {
  if (notifAutoDismissTimeout) {
    clearTimeout(notifAutoDismissTimeout);
  }
  notifAutoDismissTimeout = setTimeout(() => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.close();
    }
  }, 8000);
});

// Preview only: shows the panel without touching any reminder schedule or dedup state.
ipcMain.handle('screencare:preview-notification', (_event, type: ReminderType) => {
  return engine.previewReminder(type);
});

// Backward compatibility stubs for break events (app is reminder-only, no break modals)
ipcMain.handle('screencare:start-break', (_event, type: ReminderType) => {
  return engine.startBreak(type);
});

ipcMain.handle('screencare:complete-break', (_event, type: ReminderType, durationSeconds?: number) => {
  engine.completeBreak(type, durationSeconds);
  saveStoredData();
  broadcastState();
});

ipcMain.handle('screencare:snooze-break', (_event, type: ReminderType) => {
  engine.snoozeBreak(type);
  saveStoredData();
  broadcastState();
});

ipcMain.handle('screencare:skip-break', (_event, type: ReminderType) => {
  engine.skipBreak(type);
  saveStoredData();
  broadcastState();
});
