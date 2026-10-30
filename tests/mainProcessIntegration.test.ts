import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

/**
 * Integration tests for the real Electron main process (apps/desktop/src/main/index.ts), with the
 * `electron` module replaced by a deterministic in-memory fake. This exercises the exact production
 * path: IPC handler → validation → engine → persistence file → snapshot, plus power events, the
 * notification queue, tray/background operation and restart. Fake timers drive the 1 s scheduler tick.
 */

type Handler = (...args: any[]) => any;

interface FakeElectron {
  handlers: Record<string, Handler>;
  power: Record<string, Handler>;
  windows: any[];
  sent: any[];
  exitCalls: number[];
  quitCalls: number;
  idleSeconds: number;
  idleState: string;
  userData: string;
  module: any;
}

let fake: FakeElectron;

function makeFakeElectron(userData: string): FakeElectron {
  const f: FakeElectron = {
    handlers: {},
    power: {},
    windows: [],
    sent: [],
    exitCalls: [],
    quitCalls: 0,
    idleSeconds: 0,
    idleState: 'active',
    userData,
    module: null,
  };
  let readyCb: (() => void) | null = null;

  class FakeBrowserWindow {
    opts: any;
    destroyed = false;
    visible = false;
    shownInactive = false;
    listeners: Record<string, Handler[]> = {};
    webContents = {
      send: (_ch: string, data: any) => f.sent.push(data),
      on: () => {},
      setWindowOpenHandler: () => {},
    };
    constructor(opts: any) {
      this.opts = opts;
      f.windows.push(this);
    }
    loadFile() {
      // simulate the page becoming ready asynchronously
      setTimeout(() => this.emit('ready-to-show'), 10);
    }
    loadURL() {}
    on(ev: string, cb: Handler) {
      (this.listeners[ev] ||= []).push(cb);
    }
    once(ev: string, cb: Handler) {
      const wrap = (...a: any[]) => {
        this.listeners[ev] = (this.listeners[ev] || []).filter((x) => x !== wrap);
        cb(...a);
      };
      this.on(ev, wrap);
    }
    emit(ev: string, ...a: any[]) {
      for (const cb of [...(this.listeners[ev] || [])]) cb(...a);
    }
    isDestroyed() {
      return this.destroyed;
    }
    show() {
      this.visible = true;
    }
    showInactive() {
      this.visible = true;
      this.shownInactive = true;
    }
    hide() {
      this.visible = false;
    }
    focus() {}
    restore() {}
    isMinimized() {
      return false;
    }
    close() {
      // Like Electron: 'close' can be prevented; otherwise the window closes and 'closed' fires async.
      let prevented = false;
      this.emit('close', { preventDefault: () => (prevented = true) });
      if (prevented || this.destroyed) return;
      this.destroyed = true;
      this.visible = false;
      setTimeout(() => this.emit('closed'), 0);
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.visible = false;
      setTimeout(() => this.emit('closed'), 0);
    }
  }

  f.module = {
    app: {
      getPath: () => userData,
      requestSingleInstanceLock: () => true,
      on: () => {},
      whenReady: () => ({ then: (cb: () => void) => (readyCb = cb) }),
      setLoginItemSettings: () => {},
      exit: (code: number) => f.exitCalls.push(code),
      quit: () => (f.quitCalls += 1),
    },
    BrowserWindow: FakeBrowserWindow,
    ipcMain: { handle: (ch: string, fn: Handler) => (f.handlers[ch] = fn) },
    powerMonitor: {
      on: (ev: string, fn: Handler) => (f.power[ev] = fn),
      getSystemIdleTime: () => f.idleSeconds,
      getSystemIdleState: () => f.idleState,
    },
    Notification: { isSupported: () => false },
    Tray: class {
      destroyed = false;
      menu: any;
      setToolTip() {}
      setContextMenu(m: any) {
        (f as any).trayMenu = m;
      }
      on() {}
      isDestroyed() {
        return this.destroyed;
      }
      destroy() {
        this.destroyed = true;
      }
    },
    Menu: { buildFromTemplate: (t: any) => t },
    nativeImage: { createFromBuffer: () => ({}) },
    screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
  };
  (f as any).fireReady = () => readyCb && readyCb();
  return f;
}

const T0 = new Date('2026-10-27T05:00:00.000Z').getTime();
const desktopElectronPath = (() => {
  try {
    return createRequire(__filename).resolve('electron', { paths: [path.resolve(__dirname, '../apps/desktop')] });
  } catch {
    return null;
  }
})();
let userData: string;

async function bootApp() {
  vi.resetModules();
  fake = makeFakeElectron(userData);
  const factory = () => ({ ...fake.module, default: fake.module });
  vi.doMock('electron', factory);
  // The main process resolves `electron` from apps/desktop/node_modules — mock that exact module id too.
  if (desktopElectronPath) vi.doMock(desktopElectronPath, factory);
  await import('../apps/desktop/src/main/index.js');
  (fake as any).fireReady();
}

const snapshot = () => fake.handlers['screencare:get-state']();
const remaining = (type: string) => snapshot().nextReminders.find((r: any) => r.type === type)?.secondsRemaining;
const readStore = () => JSON.parse(fs.readFileSync(path.join(userData, 'screencare-data.json'), 'utf8'));
const notificationPanels = () => fake.windows.filter((w) => w.opts && w.opts.focusable === false);
const visiblePanels = () => notificationPanels().filter((w) => w.visible && !w.destroyed);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  userData = fs.mkdtempSync(path.join(os.tmpdir(), 'screencare-it-'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('electron');
  if (desktopElectronPath) vi.doUnmock(desktopElectronPath);
  fs.rmSync(userData, { recursive: true, force: true });
});

describe('Main process: Save Preferences end-to-end', () => {
  test('1/17. Saving Eye Rest 20 → 2 updates engine, persistence and the returned + broadcast snapshot', async () => {
    await bootApp();
    vi.advanceTimersByTime(5 * 60_000);
    expect(remaining('eye-break')).toBe(15 * 60);
    const others = snapshot().nextReminders.filter((r: any) => r.type !== 'eye-break');

    const settings = JSON.parse(JSON.stringify(snapshot().settings)); // renderer receives a structured clone
    settings.eyeBreak.intervalMinutes = 2;
    const returned = await fake.handlers['screencare:update-settings']({}, settings);

    // The IPC call returns the authoritative snapshot the renderer renders immediately
    expect(returned.settings.eyeBreak.intervalMinutes).toBe(2);
    expect(returned.nextReminders.find((r: any) => r.type === 'eye-break').secondsRemaining).toBe(120);
    // broadcast state carries the same thing
    expect(fake.sent[fake.sent.length - 1].nextReminders.find((r: any) => r.type === 'eye-break').secondsRemaining).toBe(120);
    // persisted
    const stored = readStore();
    expect(stored.settings.eyeBreak.intervalMinutes).toBe(2);
    expect(stored.cycles['eye-break'].scheduledTime).toBe(Date.now() + 120_000);
    // other reminders untouched
    for (const o of others) {
      expect(returned.nextReminders.find((r: any) => r.type === o.type).nextDueTimestamp).toBe(o.nextDueTimestamp);
    }
    // the periodic tick does not overwrite the saved configuration
    vi.advanceTimersByTime(65_000);
    expect(snapshot().settings.eyeBreak.intervalMinutes).toBe(2);
    expect(remaining('eye-break')).toBe(55);
    expect(snapshot().nextReminders.some((r: any) => r.type === 'viewing-distance')).toBe(false);
  });

  test('Invalid payloads from the renderer are validated, not applied blindly', async () => {
    await bootApp();
    const bad = JSON.parse(JSON.stringify(snapshot().settings));
    bad.eyeBreak.intervalMinutes = 'abc';
    bad.postureStretch.intervalMinutes = -5;
    const returned = await fake.handlers['screencare:update-settings']({}, bad);
    expect(returned.settings.eyeBreak.intervalMinutes).toBe(20);
    expect(returned.settings.postureStretch.intervalMinutes).toBe(1);
  });

  test('5. Saved interval and remaining time survive a full application restart', async () => {
    await bootApp();
    vi.advanceTimersByTime(60_000);
    const s = JSON.parse(JSON.stringify(snapshot().settings));
    s.postureStretch.intervalMinutes = 10;
    await fake.handlers['screencare:update-settings']({}, s);
    vi.advanceTimersByTime(30_000);
    fake.handlers['screencare:stop-application']();
    expect(fake.exitCalls).toEqual([0]);

    // Machine stays off for 2 hours, then ScreenCare starts again
    vi.setSystemTime(Date.now() + 2 * 3600_000);
    await bootApp();
    expect(snapshot().settings.postureStretch.intervalMinutes).toBe(10);
    expect(remaining('posture-stretch')).toBe(10 * 60 - 30);
    // no burst of notifications at startup
    vi.advanceTimersByTime(5_000);
    expect(notificationPanels()).toHaveLength(0);
  });
});

describe('Main process: notifications, power events, tray', () => {
  async function bootWithShortIntervals(eye = 1, posture = 1) {
    await bootApp();
    const s = JSON.parse(JSON.stringify(snapshot().settings));
    s.eyeBreak.intervalMinutes = eye;
    s.postureStretch.intervalMinutes = posture;
    s.eyeBreak.soundEnabled = false;
    await fake.handlers['screencare:update-settings']({}, s);
  }

  test('8. Incompatible reminders are shown one panel at a time, sequentially', async () => {
    await bootWithShortIntervals(1, 1); // eye + posture are incompatible
    vi.advanceTimersByTime(61_000);
    expect(visiblePanels()).toHaveLength(1);
    expect(notificationPanels()).toHaveLength(1);
    // closing the first panel delivers the queued one after a short gap
    await fake.handlers['screencare:close-notification']();
    vi.advanceTimersByTime(1_000);
    expect(visiblePanels()).toHaveLength(1);
    expect(notificationPanels()).toHaveLength(2);
    // never two visible at once
    vi.advanceTimersByTime(16_000);
    expect(visiblePanels().length).toBeLessThanOrEqual(1);
    // closing never records completion
    expect(snapshot().todaySummary.eyeBreaksCompleted).toBe(0);
    expect(snapshot().todaySummary.movementBreaksCompleted).toBe(0);
  });

  test('12/14. Lock clears queued + visible panels; nothing is shown or replayed while locked or after unlock', async () => {
    await bootWithShortIntervals(1, 1);
    vi.advanceTimersByTime(61_000);
    expect(visiblePanels()).toHaveLength(1);
    const before = snapshot().nextReminders.map((r: any) => [r.type, r.secondsRemaining]);
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    vi.advanceTimersByTime(20);
    expect(visiblePanels()).toHaveLength(0);
    const activeBefore = snapshot().activeScreenSeconds;
    vi.advanceTimersByTime(30 * 60_000);
    expect(visiblePanels()).toHaveLength(0);
    expect(snapshot().activeScreenSeconds).toBe(activeBefore);
    expect(snapshot().nextReminders.map((r: any) => [r.type, r.secondsRemaining])).toEqual(before);
    const panelsBeforeUnlock = notificationPanels().length;
    fake.idleState = 'active';
    fake.power['unlock-screen']();
    vi.advanceTimersByTime(5_000);
    expect(notificationPanels().length).toBe(panelsBeforeUnlock); // no stale burst
  });

  test('Missed unlock event is reconciled from OS state once the user is active again', async () => {
    await bootApp();
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    vi.advanceTimersByTime(10 * 60_000);
    expect(snapshot().isPaused).toBe(true);
    // Windows unlocked but Electron never delivered 'unlock-screen'; user types (idle resets)
    fake.idleState = 'active';
    fake.idleSeconds = 0;
    vi.advanceTimersByTime(2_000);
    expect(snapshot().isPaused).toBe(false);
  });

  test('Wake while still locked stays paused', async () => {
    await bootApp();
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    fake.power['suspend']();
    vi.advanceTimersByTime(60_000);
    fake.power['resume']();
    vi.advanceTimersByTime(5_000);
    expect(snapshot().isPaused).toBe(true);
  });

  test('Preview does not reset the real schedule', async () => {
    await bootApp();
    vi.advanceTimersByTime(3 * 60_000);
    const before = remaining('eye-break');
    await fake.handlers['screencare:preview-notification']({}, 'eye-break');
    expect(remaining('eye-break')).toBe(before);
  });

  test('Reset All Data keeps notifications working and backs up the old file', async () => {
    await bootApp();
    await fake.handlers['screencare:update-settings']({}, { ...snapshot().settings, eyeBreak: { ...snapshot().settings.eyeBreak, intervalMinutes: 1, soundEnabled: false } });
    await fake.handlers['screencare:reset-all-data']();
    expect(fs.readdirSync(userData).some((n) => n.startsWith('screencare-data.before-reset-'))).toBe(true);
    expect(snapshot().settings.eyeBreak.intervalMinutes).toBe(20);
    const s = JSON.parse(JSON.stringify(snapshot().settings));
    s.eyeBreak.intervalMinutes = 1;
    await fake.handlers['screencare:update-settings']({}, s);
    vi.advanceTimersByTime(61_000);
    expect(visiblePanels()).toHaveLength(1);
  });

  test('15. Closing/minimizing the dashboard keeps scheduling in the tray; explicit exit stops everything', async () => {
    await bootApp();
    const main = fake.windows[0];
    main.close(); // minimizeToTray default: hides instead of closing
    expect(main.destroyed).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(remaining('eye-break')).toBe(20 * 60 - 10); // scheduler still running
    const exitItem = (fake as any).trayMenu.find((i: any) => i.label === 'Stop Application & Exit');
    exitItem.click();
    expect(fake.exitCalls).toEqual([0]);
    const savedAt = readStore().savedAt;
    vi.advanceTimersByTime(120_000);
    expect(readStore().savedAt).toBe(savedAt); // no timers left running after exit
  });

  test('16. Corrupt persistence file: app starts with defaults and keeps a backup of the original', async () => {
    fs.writeFileSync(path.join(userData, 'screencare-data.json'), '{ this is not json');
    await bootApp();
    expect(snapshot().settings.eyeBreak.intervalMinutes).toBe(20);
    expect(fs.readdirSync(userData).some((n) => n.startsWith('screencare-data.corrupt-'))).toBe(true);
  });

  test('16b. Legacy/partial persistence file is migrated without losing saved preferences', async () => {
    fs.writeFileSync(
      path.join(userData, 'screencare-data.json'),
      JSON.stringify({ settings: { standMove: { intervalMinutes: 58 } }, activeScreenSeconds: 120, breakLogs: [] })
    );
    await bootApp();
    expect(snapshot().settings.standMove.intervalMinutes).toBe(58);
    expect(snapshot().settings.standMove.enabled).toBe(true);
    expect(remaining('stand-move')).toBe(58 * 60);
    expect(readStore().schemaVersion).toBe(2);
  });
});

describe('Main process: adaptive return-from-break policy', () => {
  async function bootWith(mutate: (s: any) => void) {
    await bootApp();
    const s = JSON.parse(JSON.stringify(snapshot().settings));
    s.eyeBreak.soundEnabled = false;
    mutate(s);
    await fake.handlers['screencare:update-settings']({}, s);
  }
  const trayLabels = () => ((fake as any).trayMenu || []).map((i: any) => i.label).filter(Boolean);

  test('Long lock with a nearly-due reminder: settling, duplicate OS events, one panel afterwards', async () => {
    await bootWith((s) => (s.eyeBreak.intervalMinutes = 11));
    vi.advanceTimersByTime(10 * 60_000); // 60 s of Eye Rest left
    expect(remaining('eye-break')).toBe(60);
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    fake.power['suspend']();
    vi.advanceTimersByTime(40 * 60_000);
    expect(notificationPanels()).toHaveLength(0);
    fake.power['resume'](); // wakes to the lock screen: still away
    expect(snapshot().adaptive.phase).toBe('away');
    fake.idleState = 'active';
    fake.power['unlock-screen']();
    // duplicate / late events must not extend the settling period
    vi.advanceTimersByTime(30_000);
    fake.power['unlock-screen']();
    fake.power['resume']();
    expect(remaining('eye-break')).toBe(30); // exact countdown, untouched
    const snap = snapshot();
    expect(snap.adaptive.phase).toBe('settling');
    expect(snap.adaptive.heldTypes).toEqual(['eye-break']);
    expect(snap.adaptive.lastReturn).toMatchObject({ kind: 'long', source: 'lock' });
    expect(trayLabels().some((l: string) => l.startsWith('Settling in after your break'))).toBe(true);

    vi.advanceTimersByTime(150_000 - 1_000); // up to 1 s before the 3-minute settling period ends
    expect(notificationPanels()).toHaveLength(0);
    vi.advanceTimersByTime(1_100);
    expect(visiblePanels()).toHaveLength(1);
    vi.advanceTimersByTime(60_000);
    expect(notificationPanels()).toHaveLength(1); // no burst
    expect(snapshot().adaptive.phase).toBe('active');
    expect(trayLabels().some((l: string) => l.startsWith('Settling'))).toBe(false);
    expect(snapshot().todaySummary.eyeBreaksCompleted).toBe(0);
  });

  test('Adaptive context is persisted; a quick restart keeps the same settling deadline', async () => {
    await bootWith((s) => (s.eyeBreak.intervalMinutes = 11));
    vi.advanceTimersByTime(10 * 60_000);
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    vi.advanceTimersByTime(30 * 60_000);
    fake.idleState = 'active';
    fake.power['unlock-screen']();
    const settleUntil = snapshot().adaptive.settlingUntil;
    expect(settleUntil).toBe(Date.now() + 3 * 60_000);
    vi.advanceTimersByTime(20_000);
    fake.handlers['screencare:stop-application']();
    const stored = readStore();
    expect(stored.adaptive.history[0]).toMatchObject({ source: 'lock', kind: 'long' });
    expect(JSON.stringify(stored.adaptive)).not.toMatch(/key|screenshot|title|window/i);

    vi.setSystemTime(Date.now() + 5_000);
    await bootApp();
    expect(snapshot().adaptive.settlingUntil).toBe(settleUntil);
    vi.advanceTimersByTime(settleUntil - Date.now() - 1_000);
    expect(notificationPanels()).toHaveLength(0);
    vi.advanceTimersByTime(1_100);
    expect(visiblePanels()).toHaveLength(1);
  });

  test('A reminder queued behind a visible panel is not lost when the PC is locked briefly', async () => {
    await bootWith((s) => {
      s.eyeBreak.intervalMinutes = 1;
      s.postureStretch.intervalMinutes = 1;
    });
    vi.advanceTimersByTime(61_000);
    expect(visiblePanels()).toHaveLength(1); // Eye Rest; Posture waits (incompatible)
    expect(remaining('posture-stretch')).toBe(0);
    fake.idleState = 'locked';
    fake.power['lock-screen']();
    vi.advanceTimersByTime(2 * 60_000); // short absence
    expect(visiblePanels()).toHaveLength(0);
    fake.idleState = 'active';
    fake.power['unlock-screen']();
    vi.advanceTimersByTime(1_100);
    expect(visiblePanels()).toHaveLength(1);
    expect(notificationPanels()).toHaveLength(2);
    expect(remaining('posture-stretch')).toBe(60); // delivered → its own next cycle started
  });

  test('Saving adaptive preferences never reschedules reminders', async () => {
    await bootApp();
    vi.advanceTimersByTime(4 * 60_000);
    const before = snapshot().nextReminders.map((r: any) => [r.type, r.cycleId, r.nextDueTimestamp]);
    const s = JSON.parse(JSON.stringify(snapshot().settings));
    s.adaptive.settlingMinutes = 6;
    s.adaptive.longAbsenceMinutes = 25;
    const returned = await fake.handlers['screencare:update-settings']({}, s);
    expect(returned.settings.adaptive).toMatchObject({ settlingMinutes: 6, longAbsenceMinutes: 25 });
    expect(returned.nextReminders.map((r: any) => [r.type, r.cycleId, r.nextDueTimestamp])).toEqual(before);
    expect(readStore().settings.adaptive.settlingMinutes).toBe(6);
  });
});
