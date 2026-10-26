import {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  Notification,
  Tray,
  Menu,
  nativeImage,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { ReminderEngine, ReminderDueEvent } from '../shared/reminderEngine';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  AppStateSnapshot,
  ReminderType,
  BreakLogEntry,
  ReminderCycleInfo,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: ReminderEngine;
let timerInterval: NodeJS.Timeout | null = null;
let isQuitting = false;

const dataDir = app.getPath('userData');
const dataFilePath = path.join(dataDir, 'screencare-data.json');

interface StoredData {
  settings: UserSettings;
  activeScreenSeconds: number;
  breakLogs: BreakLogEntry[];
  cycles?: Record<ReminderType, ReminderCycleInfo>;
}

function loadStoredData(): StoredData {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        activeScreenSeconds: Number(parsed.activeScreenSeconds) || 0,
        breakLogs: Array.isArray(parsed.breakLogs) ? parsed.breakLogs : [],
        cycles: parsed.cycles || undefined,
      };
    }
  } catch (err) {
    console.error('Error loading stored ScreenCare data:', err);
  }
  return {
    settings: { ...DEFAULT_SETTINGS },
    activeScreenSeconds: 0,
    breakLogs: [],
  };
}

function saveStoredData(): void {
  try {
    const data: StoredData = {
      settings: engine.getSettings(),
      activeScreenSeconds: engine.getStatus().activeScreenSeconds,
      breakLogs: engine.getBreakLogs().slice(-200),
      cycles: engine.getCycleInfo(),
    };
    const tempPath = `${dataFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dataFilePath);
  } catch (err) {
    console.error('Error saving stored ScreenCare data:', err);
  }
}

function getAppSnapshot(): AppStateSnapshot {
  const status = engine.getStatus();
  return {
    activeScreenSeconds: status.activeScreenSeconds,
    currentContinuousSeconds: status.currentContinuousSeconds,
    isIdle: status.isIdle,
    isPaused: status.isPaused,
    pausedUntil: status.pauseUntil,
    todaySummary: engine.getDailySummary(),
    recentLogs: engine.getBreakLogs().slice(-20),
    settings: engine.getSettings(),
    activeBreak: engine.getActiveBreak(),
    nextReminders: engine.getNextReminders(),
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
    width: 1100,
    height: 760,
    minWidth: 880,
    minHeight: 640,
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

function showNotificationForEvent(event: ReminderDueEvent): void {
  if (!Notification.isSupported()) return;

  const notif = new Notification({
    title: event.title,
    body: event.message,
    silent: !engine.getSettings().eyeBreak.soundEnabled,
    urgency: 'normal',
  });

  // Notification-only: clicking focuses the existing window without forcing a modal open
  notif.on('click', () => {
    focusMainWindow();
  });

  notif.show();
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

function setupTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('ScreenCare — Eye & Body Health');

  const updateTrayMenu = () => {
    const status = engine.getStatus();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open ScreenCare Dashboard',
        click: () => {
          focusMainWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'Take 20-20-20 Eye Break Now',
        click: () => {
          focusMainWindow();
          engine.startBreak('eye-break');
          mainWindow?.webContents.send('screencare:open-break-screen', { type: 'eye-break' });
          broadcastState();
        },
      },
      {
        label: 'Posture & Shoulder Stretch',
        click: () => {
          focusMainWindow();
          engine.startBreak('posture-stretch');
          mainWindow?.webContents.send('screencare:open-break-screen', { type: 'posture-stretch' });
          broadcastState();
        },
      },
      { type: 'separator' },
      {
        label: status.isPaused ? 'Resume Reminders' : 'Pause Reminders (1 Hour)',
        click: () => {
          if (status.isPaused) {
            engine.resume();
          } else {
            engine.pause(60);
          }
          broadcastState();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ScreenCare',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray?.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  tray.on('double-click', () => {
    focusMainWindow();
  });
}

function broadcastState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('screencare:state-update', getAppSnapshot());
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    const initialData = loadStoredData();
    engine = new ReminderEngine(initialData.settings, initialData.activeScreenSeconds);
    engine.setBreakLogs(initialData.breakLogs);
    if (initialData.cycles) {
      engine.setCycleInfo(initialData.cycles);
    }

    // Single authoritative handler: exactly ONE native notification, zero modal popups
    engine.setOnReminderDue((event) => {
      showNotificationForEvent(event);
    });

    mainWindow = createMainWindow();
    setupTray();

    // Authoritative single-scheduler background ticker
    timerInterval = setInterval(() => {
      const idleSec = powerMonitor.getSystemIdleTime();
      engine.tick(idleSec, Date.now());
      broadcastState();
    }, 1000);

    setInterval(saveStoredData, 60000);

    // Stop counting immediately on lock or sleep; resume only when unlocked and user is active
    powerMonitor.on('lock-screen', () => {
      engine.setLocked(true);
      broadcastState();
    });
    powerMonitor.on('unlock-screen', () => {
      engine.setLocked(false, Date.now());
      broadcastState();
    });
    powerMonitor.on('suspend', () => {
      engine.setSuspended(true);
      saveStoredData();
      broadcastState();
    });
    powerMonitor.on('resume', () => {
      engine.setSuspended(false, Date.now());
      broadcastState();
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
  if (timerInterval) clearInterval(timerInterval);
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

ipcMain.handle('screencare:update-settings', (_event, newSettings: UserSettings) => {
  engine.updateSettings(newSettings);
  saveStoredData();
  try {
    app.setLoginItemSettings({ openAtLogin: newSettings.startAtLogin });
  } catch (e) {}
  broadcastState();
});

ipcMain.handle('screencare:start-break', (_event, type: ReminderType) => {
  const breakState = engine.startBreak(type);
  broadcastState();
  return breakState;
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

ipcMain.handle('screencare:pause', (_event, minutes?: number) => {
  engine.pause(minutes);
  broadcastState();
});

ipcMain.handle('screencare:resume', () => {
  engine.resume();
  broadcastState();
});

ipcMain.handle('screencare:reset-all-data', () => {
  engine = new ReminderEngine(DEFAULT_SETTINGS, 0);
  try {
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  } catch (e) {}
  broadcastState();
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

ipcMain.handle('screencare:get-database-path', () => {
  return dataFilePath;
});
