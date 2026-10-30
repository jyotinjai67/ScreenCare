/**
 * Real-time runtime check of the adaptive return-from-break policy in the real Electron app
 * (main + preload + renderer). Not part of `npm test` (needs a display + Playwright, ~5 minutes).
 *
 *   node tests/e2e/adaptive-runtime.e2e.js <path-to-apps/desktop> [screenshotDir]
 *
 * Uses an isolated temporary user-data directory. Configures short, unusual custom intervals and the
 * smallest allowed adaptive thresholds so a "long" absence can be exercised in real time:
 *   Eye Rest 2 min, nearly due = 50% (≤ 60 s left), long absence ≥ 2 min, settling 1 min.
 * Eye Rest is locked with ~40 s left, so without the policy it would pop up ~40 s after unlock.
 */
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const appDir = path.resolve(process.argv[2] || path.join(__dirname, '../../apps/desktop'));
const shots = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'sc-adaptive-shots-'));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-adaptive-userdata-'));
const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const app = await electron.launch({
    executablePath: require(path.join(appDir, 'node_modules/electron')),
    args: [appDir, '--no-sandbox', `--user-data-dir=${userData}`],
  });
  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  // Under a headless display there is no keyboard/mouse input, so the OS idle time only grows and the
  // app would (correctly) treat the user as away. Simulate an active user, as on a real desktop.
  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.getSystemIdleTime = () => 0;
  });
  await sleep(2000);
  const state = async () => JSON.parse(await win.evaluate(async () => JSON.stringify(await window.screenCareApi.getState())));
  const rem = (s, type) => s.nextReminders.find((r) => r.type === type);
  const panelCount = async () => (await app.windows()).length - 1;

  const s = (await state()).settings;
  s.eyeBreak = { ...s.eyeBreak, intervalMinutes: 2, soundEnabled: false };
  s.postureStretch.intervalMinutes = 37;
  s.standMove.intervalMinutes = 59;
  s.walking.intervalMinutes = 83;
  s.adaptive = { ...s.adaptive, enabled: true, longAbsenceMinutes: 2, settlingMinutes: 1, nearlyDuePercent: 50 };
  const saved = JSON.parse(await win.evaluate(async (x) => JSON.stringify(await window.screenCareApi.updateSettings(x)), s));
  check('custom intervals + adaptive preferences saved', saved.settings.eyeBreak.intervalMinutes === 2 && saved.settings.adaptive.settlingMinutes === 1);

  // Work until Eye Rest is nearly due (≤ 60 s of its 120 s interval left; we lock at ~40 s)
  while (rem(await state(), 'eye-break').secondsRemaining > 40) await sleep(1000);
  const atLock = await state();
  const eyeAtLock = rem(atLock, 'eye-break').secondsRemaining;
  const othersAtLock = atLock.nextReminders.filter((r) => r.type !== 'eye-break').map((r) => [r.type, r.secondsRemaining]);

  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.getSystemIdleState = () => 'locked';
    powerMonitor.emit('lock-screen');
  });
  console.log(`locked with Eye Rest at ${eyeAtLock}s; waiting 130 s (long absence threshold 2 min) …`);
  await sleep(130_000);
  const whileLocked = await state();
  check('no notification while locked', (await panelCount()) === 0);
  check('countdown frozen while locked', rem(whileLocked, 'eye-break').secondsRemaining === eyeAtLock, `${eyeAtLock}s`);
  check('adaptive phase is "away" while locked', whileLocked.adaptive.phase === 'away');

  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.getSystemIdleState = () => 'active';
    powerMonitor.emit('unlock-screen');
  });
  const unlockedAt = Date.now();
  await sleep(3000);
  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.emit('unlock-screen'); // duplicate events must not extend settling
    powerMonitor.emit('resume');
  });
  await sleep(500);
  const back = await state();
  check('return classified as a long lock absence', back.adaptive.lastReturn?.kind === 'long' && back.adaptive.lastReturn?.source === 'lock', JSON.stringify(back.adaptive.lastReturn));
  check('nearly-due Eye Rest is held for settling', back.adaptive.phase === 'settling' && back.adaptive.heldTypes.includes('eye-break'), JSON.stringify(back.adaptive.heldTypes));
  const settleMs = back.adaptive.settlingUntil - unlockedAt;
  check('settling deadline ≈ unlock + 1 min (not extended by duplicate events)', Math.abs(settleMs - 60_000) <= 1500, `${settleMs} ms`);
  const eyeNow = rem(back, 'eye-break').secondsRemaining;
  check('exact remaining countdown preserved (not rewritten)', Math.abs(eyeAtLock - 3 - eyeNow) <= 2, `${eyeAtLock}s at lock -> ${eyeNow}s 3.5 s after unlock`);
  check(
    'other reminders keep their own schedules',
    back.nextReminders.filter((r) => r.type !== 'eye-break').every((r) => {
      const b = othersAtLock.find((o) => o[0] === r.type)[1];
      return b - r.secondsRemaining >= 2 && b - r.secondsRemaining <= 5;
    })
  );
  const banner = (await win.locator('main').innerText()).replace(/\s+/g, ' ');
  check('dashboard explains the settling period', /Welcome back — settling in/.test(banner), banner.slice(0, 160));
  await win.screenshot({ path: path.join(shots, 'adaptive-1-settling.png') });

  // Eye Rest would have been due ~eyeAtLock s after unlock without the policy — it must not appear yet
  const holdEnd = back.adaptive.settlingUntil;
  while (Date.now() < holdEnd - 2500) {
    if ((await panelCount()) !== 0) break;
    await sleep(1000);
  }
  check('no notification during the settling period', (await panelCount()) === 0);
  await sleep(Math.max(0, holdEnd - Date.now()) + 2500);
  check('exactly one notification after settling (no burst)', (await panelCount()) === 1, `${await panelCount()} panel(s)`);
  const panelInfo = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((x) => !x.isFocusable());
    return w ? { url: w.webContents.getURL(), focused: w.isFocused(), visible: w.isVisible() } : null;
  });
  check('panel is the Eye Rest reminder, visible and not focus-stealing', panelInfo && /eye-break/.test(decodeURIComponent(panelInfo.url)) && !panelInfo.focused && panelInfo.visible);
  const after = await state();
  check('presenting the reminder recorded no completion', after.todaySummary.eyeBreaksCompleted === 0 && after.recentLogs.length === 0);
  check('Eye Rest restarted its own 2-minute interval after delivery', rem(after, 'eye-break').secondsRemaining >= 110);
  await sleep(10_000);
  check('still a single panel 10 s later', (await panelCount()) <= 1);

  const stored = JSON.parse(fs.readFileSync(path.join(userData, 'screencare-data.json'), 'utf8'));
  check('adaptive context persisted (durations/sources only)', Array.isArray(stored.adaptive?.history) && stored.adaptive.history[0]?.source === 'lock');

  await win.evaluate(() => window.screenCareApi.stopApplication()).catch(() => {});
  await sleep(1000);
  const failed = results.filter((r) => !r.pass);
  console.log(`\nADAPTIVE E2E RESULT: ${results.length - failed.length}/${results.length} checks passed. Screenshots: ${shots}`);
  fs.rmSync(userData, { recursive: true, force: true });
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
