import { describe, test, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { getExerciseVariations } from '../shared/stretches';
import { ReminderEngine, ReminderDueEvent, getGroupedIllustrationAlternatives, normalizeSettings } from '../shared/reminderEngine';
import { DEFAULT_SETTINGS, ReminderType } from '../shared/types';

/**
 * Animated notification scenes: 3 distinct, rigged loops per activity, rotated per reminder cycle.
 */
// React lives in apps/desktop (renderer dependency); the scenes module is loaded dynamically so the
// root (non-JSX) type-check does not try to compile the renderer.
const desktopRequire = createRequire(path.resolve(__dirname, '../apps/desktop/package.json'));
const React = desktopRequire('react');
const { renderToStaticMarkup } = desktopRequire('react-dom/server');
let SCENES: Record<string, any>;
let resolveScene: (key?: string, type?: string) => any;
let ExerciseScene: any;
let PhaseTicker: any;
beforeAll(async () => {
  const scenesModule = path.resolve(__dirname, '../apps/desktop/src/renderer/components/ExerciseScenes.tsx');
  const mod: any = await import(/* @vite-ignore */ scenesModule);
  ({ SCENES, resolveScene, ExerciseScene, PhaseTicker } = mod);
});

const TYPES: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking'];
const cssPath = path.resolve(__dirname, '../apps/desktop/src/renderer/styles/scenes.css');
const css = fs.readFileSync(cssPath, 'utf8');

describe('Scene library', () => {
  test('every activity has three variations, each with its own dedicated animated scene', () => {
    for (const type of TYPES) {
      const vars = getExerciseVariations(type);
      expect(vars.length).toBe(3);
      const keys = vars.map((v) => resolveScene(v.illustrationKey, type)!.key);
      expect(new Set(keys).size).toBe(3);
      for (const k of keys) expect(SCENES[k]).toBeDefined();
    }
  });

  test('each scene renders an SVG with the jointed character rig, a description and 2-3 synced phases', () => {
    for (const scene of Object.values(SCENES) as any[]) {
      const html = renderToStaticMarkup(React.createElement(ExerciseScene, { scene }));
      expect(html).toContain(`sc-${scene.key}`);
      expect(html).toContain('role="img"');
      expect(html).toContain(`aria-label="${scene.label}"`);
      expect(html).toMatch(/clip-path="url\(#sc-clip-/);
      // front rig, side rig, seated side rig (reach) or the close-up portrait (palms)
      expect(html).toMatch(/class="(arm-l|arm-f|palms|reach)"/);
      expect(scene.phases.length).toBeGreaterThanOrEqual(2);
      expect(scene.phases.length).toBeLessThanOrEqual(3);
      expect(scene.durationSec).toBeGreaterThan(3);
      const ticker = renderToStaticMarkup(React.createElement(PhaseTicker, { scene }));
      for (const p of scene.phases) expect(ticker).toContain(p);
      expect(ticker).toContain(`--sc-dur:${scene.durationSec}s`);
    }
  });

  test('every CSS animation referenced by the scenes has a keyframes definition', () => {
    const defined = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
    const used = new Set<string>();
    for (const m of css.matchAll(/animation(?:-name)?:\s*([^;]+);/g)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+/)[0];
        if (name && name !== 'none' && !name.startsWith('var(')) used.add(name);
      }
    }
    for (const name of used) expect(defined.has(name), `@keyframes ${name}`).toBe(true);
    // each non-walking scene has its own choreography rules
    for (const key of Object.keys(SCENES)) {
      if (key.startsWith('walk')) continue;
      expect(css.includes(`.sc-${key} `), key).toBe(true);
    }
    expect(css).toContain('prefers-reduced-motion');
  });

  test('legacy keys and plain reminder types resolve to a scene', () => {
    expect(resolveScene('eye-palming')!.key).toBe('eye-relax');
    expect(resolveScene('walk-desk')!.key).toBe('walking-break');
    expect(resolveScene(undefined, 'stand-move')!.key).toBe('stand-overhead');
    expect(resolveScene('unknown-key', 'water')).toBeNull();
  });

  test('the notification card renders the scene and its step ticker', () => {
    const card = fs.readFileSync(path.resolve(__dirname, '../apps/desktop/src/renderer/components/NotificationCard.tsx'), 'utf8');
    expect(card).toContain('resolveScene(payload.illustrationKey');
    expect(card).toContain('<ExerciseScene scene={scene} />');
    expect(card).toContain('<PhaseTicker scene={scene} />');
  });
});

describe('Rotation of animations across reminder cycles', () => {
  const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);
  const only = (type: ReminderType, minutes: number) => {
    const s = normalizeSettings(DEFAULT_SETTINGS);
    s.eyeBreak.enabled = type === 'eye-break';
    s.postureStretch.enabled = type === 'posture-stretch';
    s.standMove.enabled = type === 'stand-move';
    s.walking.enabled = type === 'walking';
    const key = { 'eye-break': 'eyeBreak', 'posture-stretch': 'postureStretch', 'stand-move': 'standMove', walking: 'walking' }[type as string] as 'eyeBreak';
    s[key].intervalMinutes = minutes;
    return s;
  };

  test('consecutive reminders of one activity cycle through its three animations', () => {
    for (const type of TYPES) {
      const e = new ReminderEngine(only(type, 7), 0, T0);
      const events: ReminderDueEvent[] = [];
      e.setOnReminderDue((ev) => events.push(ev));
      for (let t = T0 + 1000; t <= T0 + 4 * 7 * 60_000; t += 1000) e.tick(0, t);
      expect(events).toHaveLength(4);
      const keys = events.map((ev) => ev.illustrationKey);
      expect(new Set(keys.slice(0, 3)).size).toBe(3);
      expect(keys[3]).toBe(keys[0]);
    }
  });

  test('repeated combined breaks rotate their scene; Eye Rest groups always keep a distant-gaze scene', () => {
    const s = normalizeSettings(DEFAULT_SETTINGS);
    s.eyeBreak.enabled = false;
    s.postureStretch.enabled = false;
    s.standMove.intervalMinutes = 9;
    s.walking.intervalMinutes = 9;
    const e = new ReminderEngine(s, 0, T0);
    const events: ReminderDueEvent[] = [];
    e.setOnReminderDue((ev) => events.push(ev));
    for (let t = T0 + 1000; t <= T0 + 3 * 9 * 60_000; t += 1000) e.tick(0, t);
    expect(events.every((ev) => ev.isGrouped)).toBe(true);
    expect(events.map((ev) => ev.illustrationKey)).toEqual(['walking-break', 'stand-overhead', 'walk-stroll']);

    expect(getGroupedIllustrationAlternatives(['eye-break', 'walking'])).toEqual(['walk-distant-gaze']);
    expect(getGroupedIllustrationAlternatives(['eye-break', 'posture-stretch', 'stand-move', 'walking'])).toEqual(['walk-distant-gaze']);
    expect(getGroupedIllustrationAlternatives(['posture-stretch', 'stand-move'])[0]).toBe('stand-chest-opener');
  });

  test('preview shows the next animation each time without touching any schedule', () => {
    const e = new ReminderEngine(normalizeSettings(DEFAULT_SETTINGS), 0, T0);
    const before = JSON.stringify(e.getCycleInfo());
    const keys = [0, 1, 2, 3].map((i) => e.previewReminder('posture-stretch', T0 + i).illustrationKey);
    expect(new Set(keys.slice(0, 3)).size).toBe(3);
    expect(keys[3]).toBe(keys[0]);
    expect(JSON.stringify(e.getCycleInfo())).toBe(before);
    expect(e.getDeliveredCycleIds()).toEqual([]);
  });
});
