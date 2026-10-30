import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ScreenCare Animated Reminder Implementation Verification', () => {
  const mainIndexPath = path.resolve(__dirname, '../apps/desktop/src/main/index.ts');
  const cssPath = path.resolve(__dirname, '../apps/desktop/src/renderer/styles/index.css');
  const animationsPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/ExerciseAnimations.tsx');
  const notificationCardPath = path.resolve(__dirname, '../apps/desktop/src/renderer/components/NotificationCard.tsx');

  test('1. Non-modal, focus-safe Electron notification window properties', () => {
    const mainContent = fs.readFileSync(mainIndexPath, 'utf8');

    // Must be focusable: false so typing and work are never interrupted
    expect(mainContent).toContain('focusable: false');

    // Must show inactive so focus is not stolen
    // Panel is shown without stealing focus (variable renamed to 'panel' to guard against close races)
    expect(mainContent).toMatch(/(notificationWindow|panel)\.showInactive\(\)/);
    expect(mainContent).not.toMatch(/(notificationWindow|panel)\.show\(\)/);

    // Must be transparent and frameless for clean rounded card floating
    expect(mainContent).toContain('transparent: true');
    expect(mainContent).toContain('frame: false');
    expect(mainContent).toContain('alwaysOnTop: true');
    expect(mainContent).toContain('skipTaskbar: true');

    // Must auto-dismiss smoothly
    expect(mainContent).toContain('setTimeout');
    expect(mainContent).toContain('notificationWindow.close()');

    // Must pause timer on hover and resume on leave
    expect(mainContent).toContain('screencare:pause-notification-timer');
    expect(mainContent).toContain('screencare:resume-notification-timer');
  });

  test('2. Transparent window CSS and no dark box artifact', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Background transparency rules for notification window
    expect(cssContent).toContain('html.notification-window');
    expect(cssContent).toContain('body.notification-window');
    expect(cssContent).toContain('background: transparent !important');
  });

  test('3. Stretch Break demonstrates seated left-center-right motion with dual-phase arm crossfade', () => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const animContent = fs.readFileSync(animationsPath, 'utf8');

    // SVG includes chair, desk, potted plant, active character, ghost guide poses, and directional arrows
    expect(animContent).toContain('StretchBreakAnimation');
    expect(animContent).toContain('stretch-animated-character');
    expect(animContent).toContain('stretch-arms-left-phase');
    expect(animContent).toContain('stretch-arms-right-phase');
    expect(animContent).toContain('arrow-left-pulse');
    expect(animContent).toContain('arrow-right-pulse');

    // CSS keyframes animate body left (-14deg), center (0deg), right (+14deg), center (0deg)
    expect(cssContent).toContain('@keyframes stretchBodyLoop');
    expect(cssContent).toContain('-14deg');
    expect(cssContent).toContain('14deg');

    // CSS keyframes synchronize arm visibility across left and right phases
    expect(cssContent).toContain('@keyframes stretchArmsLeftPhase');
    expect(cssContent).toContain('@keyframes stretchArmsRightPhase');
    expect(cssContent).toContain('.stretch-arms-left-phase');
    expect(cssContent).toContain('.stretch-arms-right-phase');
  });

  test('4. Eye Break, Neck & Shoulder, and Water Reminder animations are defined and styled', () => {
    const animContent = fs.readFileSync(animationsPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Eye Break
    expect(animContent).toContain('EyeBreakAnimation');
    expect(cssContent).toContain('@keyframes eyeBreakHeadTurn');
    expect(cssContent).toContain('@keyframes eyeBreakPupilShift');

    // Neck & Shoulder
    expect(animContent).toContain('NeckShoulderAnimation');
    expect(cssContent).toContain('@keyframes neckTiltHeadAnim');
    expect(cssContent).toContain('@keyframes shoulderRollAnim');

    // Water Reminder
    expect(animContent).toContain('WaterReminderAnimation');
    expect(cssContent).toContain('@keyframes waterArmLiftAnim');
    expect(cssContent).toContain('@keyframes waterHeadTiltAnim');

    // Walking Break
    expect(animContent).toContain('WalkingAnimation');
    expect(cssContent).toContain('@keyframes walkLegLeftAnim');
    expect(cssContent).toContain('@keyframes walkTorsoBounceAnim');

    // Stand & Stretch
    expect(animContent).toContain('StandStretchAnimation');
    expect(cssContent).toContain('@keyframes standUpperBodyStretchAnim');
    expect(cssContent).toContain('@keyframes standOverheadArmsAnim');
  });

  test('5. Notification Card layout matches visual reference', () => {
    const cardContent = fs.readFileSync(notificationCardPath, 'utf8');

    // Branding header with ScreenCare name and icon
    expect(cardContent).toContain('notif-brand');
    expect(cardContent).toContain('notif-app-name');
    expect(cardContent).toContain('ScreenCare');

    // Minimize and close controls
    expect(cardContent).toContain('notif-controls');
    expect(cardContent).toContain('handleClose');

    // Accent highlighted title and subtitle
    expect(cardContent).toContain('notif-title-highlight');
    expect(cardContent).toContain('notif-subtitle');

    // Bottom instruction
    expect(cardContent).toContain('notif-instruction');

    // No disruptive action buttons
    expect(cardContent).not.toContain('Snooze');
    expect(cardContent).not.toContain('Done');
    expect(cardContent).not.toContain('Skip');
    expect(cardContent).not.toContain('Start Break');
  });

  test('6. Walking Reminder is properly paired with WalkingAnimation and Walking Break text', () => {
    const cardContent = fs.readFileSync(notificationCardPath, 'utf8');

    // Walking type maps to Walking Break and WalkingAnimation (no mismatch with neck/water)
    expect(cardContent).toContain("t === 'walking'");
    expect(cardContent).toContain("firstWord: 'Walking'");
    expect(cardContent).toContain("highlightWord: 'Break'");
    expect(cardContent).toContain('<WalkingAnimation />');
  });

  test('7. Eye Break and Stand & Stretch are properly paired', () => {
    const cardContent = fs.readFileSync(notificationCardPath, 'utf8');

    // Eye Break maps to Eye Break and EyeBreakAnimation
    expect(cardContent).toContain("t === 'eye-break'");
    expect(cardContent).toContain('<EyeBreakAnimation />');

    // Stand & Stretch maps to Stand & Stretch and StandStretchAnimation
    expect(cardContent).toContain("t === 'stand-move'");
    expect(cardContent).toContain("firstWord: 'Stand &'");
    expect(cardContent).toContain("highlightWord: 'Stretch'");
    expect(cardContent).toContain('<StandStretchAnimation />');
  });
});

