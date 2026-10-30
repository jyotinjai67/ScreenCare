#!/usr/bin/env node
/**
 * verify-release.js — proves the packaged Windows app was built from the current source.
 *
 * 1. Compiles the current Electron main/preload/shared TypeScript into a temp folder.
 * 2. Reads the packaged app.asar (release/windows/win-unpacked/resources/app.asar) and compares
 *    every compiled main-process file byte-for-byte (line endings normalised).
 * 3. Compares the packaged renderer bundle (dist/) with apps/desktop/dist built from current source.
 * 4. Prints size, modification time and SHA-256 for both release executables, and checks they are
 *    newer than the packaged app.asar.
 *
 * Usage (from the repository root):  node scripts/verify-release.js
 * Exit code 0 = verified, 1 = mismatch / missing artifact.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const desktop = path.join(root, 'apps', 'desktop');
const releaseDir = path.join(root, 'release', 'windows');
const asarPath = path.join(releaseDir, 'win-unpacked', 'resources', 'app.asar');
const asar = require(require.resolve('@electron/asar', { paths: [desktop] }));

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL  ${msg}`);
};
const ok = (msg) => console.log(`  OK    ${msg}`);
const norm = (buf) => buf.toString('utf8').replace(/\r\n/g, '\n');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

console.log('ScreenCare release verification');
if (!fs.existsSync(asarPath)) {
  fail(`missing ${asarPath}`);
  process.exit(1);
}

// 1. Fresh compile of current main-process source
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'screencare-verify-'));
const tscBin = require.resolve('typescript/bin/tsc', { paths: [desktop] });
execFileSync(process.execPath, [tscBin, '-p', path.join(desktop, 'tsconfig.electron.json'), '--outDir', tmp], {
  stdio: 'inherit',
});

// 2. Compare compiled files with the packaged ones
const packaged = new Set(asar.listPackage(asarPath).map((p) => p.replace(/\\/g, '/').replace(/^\//, '')));
for (const rel of walk(tmp)) {
  const inAsar = `dist-electron/${rel}`;
  if (!packaged.has(inAsar)) {
    fail(`${inAsar} is not in app.asar`);
    continue;
  }
  const same = norm(asar.extractFile(asarPath, path.normalize(inAsar))) === norm(fs.readFileSync(path.join(tmp, rel)));
  same ? ok(`${inAsar} matches current source`) : fail(`${inAsar} differs from current source (stale build)`);
}
const stale = [...packaged].filter((p) => p.startsWith('dist-electron/apps/'));
stale.length ? fail(`stale legacy files packaged: ${stale.join(', ')}`) : ok('no stale legacy dist-electron/apps files packaged');

// 3. Renderer bundle
const distDir = path.join(desktop, 'dist');
if (!fs.existsSync(distDir)) {
  fail('apps/desktop/dist not found (run the build first)');
} else {
  for (const rel of walk(distDir)) {
    const inAsar = `dist/${rel}`;
    if (!packaged.has(inAsar)) fail(`${inAsar} is not in app.asar`);
    else if (norm(asar.extractFile(asarPath, path.normalize(inAsar))) !== norm(fs.readFileSync(path.join(distDir, rel)))) fail(`${inAsar} differs`);
    else ok(`${inAsar} matches built renderer`);
  }
}

// 4. Executables
const asarTime = fs.statSync(asarPath).mtimeMs;
for (const name of ['ScreenCare-Setup.exe', 'ScreenCare.exe']) {
  const p = path.join(releaseDir, name);
  if (!fs.existsSync(p)) {
    fail(`missing ${p}`);
    continue;
  }
  const st = fs.statSync(p);
  console.log(`  ${name}\n    size:     ${st.size} bytes (${(st.size / 1048576).toFixed(2)} MB)\n    modified: ${st.mtime.toISOString()}\n    sha256:   ${sha256(p)}`);
  st.mtimeMs + 1000 >= asarTime ? ok(`${name} is not older than app.asar`) : fail(`${name} is older than app.asar (stale executable)`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures === 0 ? '\nRESULT: VERIFIED — release matches current source' : `\nRESULT: ${failures} problem(s) found`);
process.exit(failures === 0 ? 0 : 1);
