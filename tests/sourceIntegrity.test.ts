import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The renderer imports shared code from <root>/shared (Vite alias @shared), while the Electron main
 * process compiles apps/desktop/src/shared. Both copies must be byte-identical, otherwise the UI and
 * the scheduler silently run different logic.
 */
const root = path.resolve(__dirname, '..');
const files = ['reminderEngine.ts', 'types.ts', 'stretches.ts', 'wellnessScore.ts', 'adaptivePolicy.ts'];
const norm = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');

describe('Shared source copies', () => {
  for (const f of files) {
    test(`shared/${f} matches apps/desktop/src/shared/${f}`, () => {
      expect(norm(path.join(root, 'apps/desktop/src/shared', f))).toBe(norm(path.join(root, 'shared', f)));
    });
  }

  test('main process imports the desktop shared copy; renderer imports the root copy via @shared', () => {
    const main = norm(path.join(root, 'apps/desktop/src/main/index.ts'));
    expect(main).toContain("from '../shared/reminderEngine'");
    const vite = norm(path.join(root, 'apps/desktop/vite.config.ts'));
    expect(vite).toContain("'@shared': path.resolve(__dirname, '../../shared')");
  });
});
