/**
 * Runtime check of the animated notification panels in the real Electron app: previews every activity
 * three times and verifies the real panel window renders a different animated scene each time, with
 * running CSS animations and the synced step ticker. Not part of `npm test` (needs a display).
 *
 *   node tests/e2e/notification-scenes.e2e.js <path-to-apps/desktop> [screenshotDir]
 */
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const appDir = path.resolve(process.argv[2] || path.join(__dirname, '../../apps/desktop'));
const shots = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'sc-scene-shots-'));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-scenes-userdata-'));
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
  await sleep(1500);
  const before = await win.evaluate(async () => JSON.stringify((await window.screenCareApi.getState()).nextReminders.map((r) => r.cycleId)));

  for (const type of ['eye-break', 'posture-stretch', 'stand-move', 'walking']) {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      await win.evaluate((t) => window.screenCareApi.previewNotification(t), type);
      let panel = null;
      for (let k = 0; k < 40 && !panel; k++) {
        await sleep(150);
        panel = (await app.windows()).find((w) => w !== win) || null;
      }
      if (!panel) {
        check(`${type} preview ${i + 1} opened a panel`, false);
        continue;
      }
      await panel.waitForSelector('svg.sc', { timeout: 5000 }).catch(() => {});
      await sleep(900);
      const info = await panel.evaluate(() => {
        const svg = document.querySelector('svg.sc');
        return {
          scene: svg ? [...svg.classList].find((c) => c.startsWith('sc-')) : null,
          running: document.getAnimations().filter((a) => a.playState === 'running').length,
          ticker: (document.querySelector('.sc-ticker-labels') || {}).textContent || '',
        };
      });
      seen.push(info.scene);
      check(`${type} #${i + 1}: animated scene ${info.scene}`, info.scene && info.running > 3 && info.ticker.length > 10, `${info.running} running animations`);
      await panel.screenshot({ path: path.join(shots, `${type}-${i + 1}.png`) });
      await win.evaluate(() => window.screenCareApi.closeNotification && window.screenCareApi.closeNotification()).catch(() => {});
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isFocusable()).forEach((w) => w.close()));
      await sleep(1200);
    }
    check(`${type}: three different animations across three reminders`, new Set(seen).size === 3, seen.join(', '));
  }
  const after = await win.evaluate(async () => JSON.stringify((await window.screenCareApi.getState()).nextReminders.map((r) => r.cycleId)));
  check('previews did not touch any reminder cycle', before === after);

  await win.evaluate(() => window.screenCareApi.stopApplication()).catch(() => {});
  await sleep(800);
  const failed = results.filter((r) => !r.pass);
  console.log(`\nSCENES E2E RESULT: ${results.length - failed.length}/${results.length} checks passed. Screenshots: ${shots}`);
  fs.rmSync(userData, { recursive: true, force: true });
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
