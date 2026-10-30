/**
 * Interactive runtime check of the real Electron app (main + preload + React renderer) driven through
 * its actual UI with Playwright. Not part of `npm test` (needs a display + Playwright).
 *
 *   node tests/e2e/electron-runtime.e2e.js <path-to-apps/desktop> [screenshotDir]
 *
 * It uses an isolated, temporary user-data directory, so the real user's preferences are never touched.
 */
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const appDir = path.resolve(process.argv[2] || path.join(__dirname, '../../apps/desktop'));
const shots = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'sc-shots-'));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-e2e-userdata-'));
const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

async function launch() {
  const app = await electron.launch({
    executablePath: require(path.join(appDir, 'node_modules/electron')),
    args: [appDir, '--no-sandbox', `--user-data-dir=${userData}`],
  });
  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  await win.waitForTimeout(2500);
  return { app, win };
}

const cardText = async (win) => (await win.locator('main').innerText()).replace(/\s+/g, ' ');
const countdowns = async (win) => {
  const t = await cardText(win);
  return [...t.matchAll(/Next: (Paused|Due now|\d+h \d+m|\d+m \d+s|\d+s)/g)].map((m) => m[1]);
};
const toSec = (s) => {
  let m;
  if ((m = s.match(/^(\d+)h (\d+)m$/))) return +m[1] * 3600 + +m[2] * 60;
  if ((m = s.match(/^(\d+)m (\d+)s$/))) return +m[1] * 60 + +m[2];
  if ((m = s.match(/^(\d+)s$/))) return +m[1];
  return NaN;
};
const apiRemaining = async (win) =>
  JSON.parse(await win.evaluate(async () => JSON.stringify((await window.screenCareApi.getState()).nextReminders)))
    .reduce((m, r) => ((m[r.type] = r.secondsRemaining), m), {});
const gotoTab = async (win, re) => {
  await win.getByRole('button', { name: re }).first().click();
  await win.waitForTimeout(500);
};

(async () => {
  // ---------- First run ----------
  let { app, win } = await launch();
  const userDataReal = await app.evaluate(({ app }) => app.getPath('userData'));
  check('isolated user-data directory in use', userDataReal === userData, userDataReal);

  let cds = await countdowns(win);
  check('dashboard shows four reminder countdowns', cds.length === 4, cds.join(' | '));
  const before = cds.map(toSec);

  await gotoTab(win, /settings|preferences/i);
  const inputs = win.locator('input[type=number]');
  await inputs.nth(0).fill('2'); // Eye Rest
  await win.getByRole('button', { name: 'Save Preferences' }).click();
  await win.waitForTimeout(400);
  check('Settings input shows authoritative value after save', (await inputs.nth(0).inputValue()) === '2');
  await gotoTab(win, /overview|dashboard/i);
  cds = await countdowns(win);
  const after = cds.map(toSec);
  check('Eye Rest countdown restarted at 2 min after save', after[0] <= 120 && after[0] >= 110, cds[0]);
  check(
    'Posture/Stand/Walking countdowns unchanged by the Eye Rest save',
    [1, 2, 3].every((i) => Math.abs(before[i] - after[i]) <= 6),
    `${before.slice(1)} -> ${after.slice(1)}`
  );
  const hero = await cardText(win);
  check('Headline "next reminder" shows Eye Break with the new countdown', /Eye Break in (2m 0s|1m \d+s)/.test(hero));
  await win.screenshot({ path: path.join(shots, '1-after-save.png') });

  const stored = JSON.parse(fs.readFileSync(path.join(userData, 'screencare-data.json'), 'utf8'));
  check('Saved interval persisted to disk', stored.settings.eyeBreak.intervalMinutes === 2);

  // Preview must not reset the real schedule
  const eyeBeforePreview = toSec((await countdowns(win))[0]);
  await win.getByTitle('Preview Eye Break animation').click();
  await win.waitForTimeout(1500);
  const eyeAfterPreview = toSec((await countdowns(win))[0]);
  check('Preview does not reset the Eye Rest countdown', eyeAfterPreview <= eyeBeforePreview && eyeBeforePreview - eyeAfterPreview <= 3, `${eyeBeforePreview}s -> ${eyeAfterPreview}s`);
  const windows = await app.windows();
  check('Preview notification panel opened (1 extra window)', windows.length === 2, `${windows.length} windows`);

  // Lock / unlock via the real powerMonitor event path (OS state forced to 'locked' for the check)
  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.getSystemIdleState = () => 'locked';
    powerMonitor.emit('lock-screen');
  });
  await win.waitForTimeout(500);
  const locked1 = await apiRemaining(win);
  await win.waitForTimeout(4000);
  const locked2 = await apiRemaining(win);
  check('Dashboard shows Paused while locked', (await countdowns(win)).every((c) => c === 'Paused'));
  check('Countdowns frozen while locked (authoritative state)', JSON.stringify(locked1) === JSON.stringify(locked2), JSON.stringify(locked2));
  check('Notification panel closed on lock', (await app.windows()).length === 1);
  await app.evaluate(({ powerMonitor }) => {
    powerMonitor.getSystemIdleState = () => 'active';
    powerMonitor.emit('unlock-screen');
  });
  await win.waitForTimeout(3200);
  const unlocked = await apiRemaining(win);
  const delta = locked2['eye-break'] - unlocked['eye-break'];
  check('Countdowns resume after unlock from the same remaining time', delta >= 2 && delta <= 4, `${locked2['eye-break']}s at lock -> ${unlocked['eye-break']}s ~3 s after unlock`);

  // Close button hides to tray, scheduler keeps running
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await win.waitForTimeout(1500);
  const visible = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.isVisible()));
  check('Closing the dashboard hides it to the tray (process keeps running)', visible.length >= 1 && visible[0] === false);
  const remainingBeforeExit = JSON.parse(await win.evaluate(async () => JSON.stringify((await window.screenCareApi.getState()).nextReminders)));

  // Explicit exit via the real IPC used by "Stop ScreenCare"
  const closed = new Promise((r) => app.process().once('exit', r));
  await win.evaluate(() => window.screenCareApi.stopApplication()).catch(() => {});
  await closed;
  check('Explicit exit terminates the process', app.process().exitCode !== null || app.process().signalCode !== null);

  // ---------- Restart ----------
  await new Promise((r) => setTimeout(r, 5000)); // app is "off" for 5 s
  ({ app, win } = await launch());
  const afterRestart = (await countdowns(win)).map(toSec);
  const eyeBefore = remainingBeforeExit.find((r) => r.type === 'eye-break').secondsRemaining;
  check('Restart restores the saved 2-minute Eye Rest interval', (await win.evaluate(async () => (await window.screenCareApi.getState()).settings.eyeBreak.intervalMinutes)) === 2);
  check('Restart resumes from the remaining time at exit (app-off time frozen)', Math.abs(afterRestart[0] - eyeBefore) <= 5, `${eyeBefore}s at exit -> ${afterRestart[0]}s after restart`);
  await win.screenshot({ path: path.join(shots, '2-after-restart.png') });
  await win.evaluate(() => window.screenCareApi.stopApplication()).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));

  const failed = results.filter((r) => !r.pass);
  console.log(`\nE2E RESULT: ${results.length - failed.length}/${results.length} checks passed. Screenshots: ${shots}`);
  fs.rmSync(userData, { recursive: true, force: true });
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
