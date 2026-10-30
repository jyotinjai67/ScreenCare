import { describe, test, expect } from 'vitest';
import { ReminderEngine, getGroupedReminderContent, areActivitiesCompatible } from '../shared/reminderEngine';
import {
  EXERCISE_VARIATIONS,
  getExerciseVariations,
  getVariationForReminder,
  getVariationById,
  getExerciseForReminder,
} from '../shared/stretches';
import { DEFAULT_SETTINGS, ReminderType } from '../shared/types';
import fs from 'fs';
import path from 'path';

describe('ScreenCare Exercise Variations & Notification Library Tests', () => {
  const baseTime = 1720000000000;
  const trackedTypes: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking'];

  test('1. Every reminder category has at least 3 distinct exercise variations', () => {
    for (const type of trackedTypes) {
      const variations = getExerciseVariations(type);
      expect(variations.length).toBeGreaterThanOrEqual(3);

      // Verify each variation has required fields and unique IDs
      const ids = new Set<string>();
      const illustrationKeys = new Set<string>();

      for (const v of variations) {
        expect(v.id).toBeTruthy();
        expect(v.title).toBeTruthy();
        expect(v.categoryLabel).toBeTruthy();
        expect(v.firstWord).toBeTruthy();
        expect(v.highlightWord).toBeTruthy();
        expect(v.subtitle).toBeTruthy();
        expect(v.instruction).toBeTruthy();
        expect(v.illustrationKey).toBeTruthy();
        expect(v.durationSeconds).toBeGreaterThan(0);

        ids.add(v.id);
        illustrationKeys.add(v.illustrationKey);
      }

      // Must have distinct IDs and distinct illustration keys (not reused graphics)
      expect(ids.size).toBe(variations.length);
      expect(illustrationKeys.size).toBe(variations.length);
    }
  });

  test('2. Eye Break variations cover window view (20-20-20), room distance focus, and soft eye relax', () => {
    const eyeVars = getExerciseVariations('eye-break');
    expect(eyeVars.length).toBe(3);

    // Variation 0: Window View with 20-20-20 instruction
    expect(eyeVars[0].id).toBe('eye-window');
    expect(eyeVars[0].instruction).toContain('window');
    expect(eyeVars[0].description).toContain('20 feet');
    expect(eyeVars[0].durationSeconds).toBe(20);

    // Variation 1: Room Distance Focus
    expect(eyeVars[1].id).toBe('eye-room');
    expect(eyeVars[1].instruction).toContain('room');

    // Variation 2: Soft Focus & Eye Rest
    expect(eyeVars[2].id).toBe('eye-relax');
    expect(eyeVars[2].instruction).toMatch(/(relax|blink|away from the monitor)/i);
  });

  test('3. Posture & Neck variations cover neck stretch, shoulder rolls, and seated posture reset', () => {
    const postureVars = getExerciseVariations('posture-stretch');
    expect(postureVars.length).toBe(3);

    // Variation 0: Gentle Neck Side Stretch
    expect(postureVars[0].id).toBe('neck-side-stretch');
    expect(postureVars[0].instruction).toMatch(/tilt.*shoulder/i);

    // Variation 1: Shoulder Rolls
    expect(postureVars[1].id).toBe('shoulder-rolls');
    expect(postureVars[1].instruction).toMatch(/shoulder.*circles/i);

    // Variation 2: Seated Posture Reset
    expect(postureVars[2].id).toBe('posture-reset');
    expect(postureVars[2].instruction).toMatch(/sit tall.*spine/i);
  });

  test('4. Stand & Stretch variations cover overhead stretch, side stretch, and chest opener', () => {
    const standVars = getExerciseVariations('stand-move');
    expect(standVars.length).toBe(3);

    // Variation 0: Standing Overhead Stretch
    expect(standVars[0].id).toBe('stand-overhead');
    expect(standVars[0].instruction).toMatch(/overhead/i);

    // Variation 1: Gentle Left-Right Side Stretch
    expect(standVars[1].id).toBe('stand-side-stretch');
    expect(standVars[1].instruction).toMatch(/left.*right|side/i);

    // Variation 2: Standing Shoulder & Upper-Back Chest Opener
    expect(standVars[2].id).toBe('stand-chest-opener');
    expect(standVars[2].instruction).toMatch(/clasp hands.*chest/i);
  });

  test('5. Walking Refresh variations cover desk step away, indoor stroll, and distant horizon view', () => {
    const walkVars = getExerciseVariations('walking');
    expect(walkVars.length).toBe(3);

    // Variation 0: Step away from desk
    expect(walkVars[0].id).toBe('walk-desk');
    expect(walkVars[0].instruction).toMatch(/desk/i);

    // Variation 1: Short indoor stroll
    expect(walkVars[1].id).toBe('walk-stroll');
    expect(walkVars[1].instruction).toMatch(/indoor stroll|hall|room/i);

    // Variation 2: Walk away and gaze at horizon
    expect(walkVars[2].id).toBe('walk-distant-gaze');
    expect(walkVars[2].instruction).toMatch(/monitor.*distant object/i);
  });

  test('6. Consecutive reminder cycles rotate deterministically through variations without repeating', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      devTestMode: true, // 20s eye-break interval
      postureStretch: { ...DEFAULT_SETTINGS.postureStretch, enabled: false },
      standMove: { ...DEFAULT_SETTINGS.standMove, enabled: false },
      walking: { ...DEFAULT_SETTINGS.walking, enabled: false },
    };
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Cycle 1: initial cycle has variation 0
    let dueTime = baseTime + 20 * 1000;
    const event1 = engine.tick(0, dueTime);
    expect(event1).not.toBeNull();
    expect(event1?.type).toBe('eye-break');
    expect(event1?.variationIndex).toBe(0);
    expect(event1?.variationId).toBe('eye-window');

    // Cycle 2: next cycle has variation 1
    dueTime += 20 * 1000;
    const event2 = engine.tick(0, dueTime);
    expect(event2).not.toBeNull();
    expect(event2?.type).toBe('eye-break');
    expect(event2?.variationIndex).toBe(1);
    expect(event2?.variationId).toBe('eye-room');

    // Cycle 3: next cycle has variation 2
    dueTime += 20 * 1000;
    const event3 = engine.tick(0, dueTime);
    expect(event3).not.toBeNull();
    expect(event3?.type).toBe('eye-break');
    expect(event3?.variationIndex).toBe(2);
    expect(event3?.variationId).toBe('eye-relax');

    // Cycle 4: wraps smoothly back to variation 0
    dueTime += 20 * 1000;
    const event4 = engine.tick(0, dueTime);
    expect(event4).not.toBeNull();
    expect(event4?.type).toBe('eye-break');
    expect(event4?.variationIndex).toBe(0);
    expect(event4?.variationId).toBe('eye-window');
  });

  test('7. Variation changes NEVER alter intervals, nextDueTimestamp, or cycle countdown math', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      eyeBreak: { ...DEFAULT_SETTINGS.eyeBreak, intervalMinutes: 20 },
      postureStretch: { ...DEFAULT_SETTINGS.postureStretch, intervalMinutes: 45 },
    };
    const engine = new ReminderEngine(settings, 0, baseTime);

    // Check initial countdown for posture-stretch (45 minutes = 2700s)
    let nextList = engine.getNextReminders(baseTime);
    let postureReminder = nextList.find((r) => r.type === 'posture-stretch');
    expect(postureReminder?.secondsRemaining).toBe(2700);

    // Manually trigger and cycle posture-stretch through variation 0, 1, 2
    const event1 = engine.triggerReminder('posture-stretch', baseTime);
    expect(event1.variationIndex).toBe(0);

    // Next countdown MUST still be exactly 45 minutes (2700 seconds)
    nextList = engine.getNextReminders(baseTime);
    postureReminder = nextList.find((r) => r.type === 'posture-stretch');
    expect(postureReminder?.secondsRemaining).toBe(2700);

    // Trigger cycle 2
    const event2 = engine.triggerReminder('posture-stretch', baseTime + 1000);
    expect(event2.variationIndex).toBe(1);

    // Countdown remains strictly 45 minutes
    nextList = engine.getNextReminders(baseTime + 1000);
    postureReminder = nextList.find((r) => r.type === 'posture-stretch');
    expect(postureReminder?.secondsRemaining).toBe(2700);
  });

  test('8. Variation index persists across application restarts', () => {
    const settings = { ...DEFAULT_SETTINGS, devTestMode: true };
    const engine1 = new ReminderEngine(settings, 0, baseTime);

    // Advance through cycle 1 (eye-window) so cycle 2 (eye-room) is scheduled
    engine1.tick(0, baseTime + 20000);
    const savedCycles = engine1.getCycleInfo();
    expect(savedCycles['eye-break'].variationIndex).toBe(1);

    // Restart app and restore cycles
    const engine2 = new ReminderEngine(settings, 0, baseTime + 25000);
    engine2.setCycleInfo(savedCycles, baseTime + 25000, baseTime + 20000);

    const restoredCycles = engine2.getCycleInfo();
    expect(restoredCycles['eye-break'].variationIndex).toBe(1);

    // When cycle 2 triggers, it must deliver variation 1 (eye-room)
    const event = engine2.tick(0, baseTime + 45000);
    expect(event).not.toBeNull();
    expect(event?.variationIndex).toBe(1);
    expect(event?.variationId).toBe('eye-room');
  });

  test('9. Grouped compatible reminders pick an appropriate combined illustration', () => {
    // Eye + Walking: naturally combines walking with distant horizon view
    const eyeAndWalk = getGroupedReminderContent(['eye-break', 'walking']);
    expect(eyeAndWalk.illustrationKey).toBe('walk-distant-gaze');
    expect(eyeAndWalk.categoryLabel).toBe('Eye Rest & Walk');

    // Posture + Standing: combines standing stretch with chest opening
    const postureAndStand = getGroupedReminderContent(['posture-stretch', 'stand-move']);
    expect(postureAndStand.illustrationKey).toBe('stand-chest-opener');

    // Stand + Walking: active movement break
    const standAndWalk = getGroupedReminderContent(['stand-move', 'walking']);
    expect(standAndWalk.illustrationKey).toBe('walking-break');

    // All 4 due activities: full mindful break with distant gaze
    const allFour = getGroupedReminderContent(['eye-break', 'posture-stretch', 'stand-move', 'walking']);
    expect(allFour.illustrationKey).toBe('walk-distant-gaze');
    expect(allFour.categoryLabel).toBe('Full Mindful Break');
  });

  test('10. UI Card components and CSS keyframes are defined and exported', () => {
    const animPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/ExerciseAnimations.tsx');
    const animContent = fs.readFileSync(animPath, 'utf8');

    // Check that all variation components are exported
    expect(animContent).toContain('EyeBreakWindowAnimation');
    expect(animContent).toContain('EyeBreakRoomAnimation');
    expect(animContent).toContain('EyeBreakRelaxAnimation');
    expect(animContent).toContain('NeckSideStretchAnimation');
    expect(animContent).toContain('ShoulderRollsAnimation');
    expect(animContent).toContain('PostureResetAnimation');
    expect(animContent).toContain('StandOverheadAnimation');
    expect(animContent).toContain('StandSideStretchAnimation');
    expect(animContent).toContain('StandChestOpenerAnimation');
    expect(animContent).toContain('WalkDeskAnimation');
    expect(animContent).toContain('WalkStrollAnimation');
    expect(animContent).toContain('WalkDistantGazeAnimation');
    expect(animContent).toContain('getExerciseAnimation');

    const cssPath = path.resolve(__dirname, '../apps/desktop/src/renderer/styles/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Check keyframe animations and styling classes
    expect(cssContent).toContain('.notif-category-pill');
    expect(cssContent).toContain('.notif-illustration-stage');
    expect(cssContent).toContain('.notif-rhythm-bar');
    expect(cssContent).toContain('@keyframes rhythmBreathe');
    expect(cssContent).toContain('@keyframes eyeRoomPupilTrack');
    expect(cssContent).toContain('@keyframes eyeRelaxWavePulse');
    expect(cssContent).toContain('@keyframes shoulderJointRollLeft');
    expect(cssContent).toContain('@keyframes postureUnslumpAnim');
    expect(cssContent).toContain('@keyframes standSideSwayAnim');
    expect(cssContent).toContain('@keyframes standChestExpandAnim');
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');

    const cardPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/NotificationCard.tsx');
    const cardContent = fs.readFileSync(cardPath, 'utf8');

    // NotificationCard renders the category pill and rhythm stage
    expect(cardContent).toContain('notif-category-pill');
    expect(cardContent).toContain('notif-rhythm-bar');
    expect(cardContent).toContain('notif-illustration-stage');
  });
});
