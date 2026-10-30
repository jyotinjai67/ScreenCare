import React, { useState, useEffect } from 'react';
import {
  StretchBreakAnimation,
  EyeBreakAnimation,
  NeckShoulderAnimation,
  WaterReminderAnimation,
  WalkingAnimation,
  StandStretchAnimation,
  getExerciseAnimation,
} from './ExerciseAnimations';
import { ExerciseScene, PhaseTicker, resolveScene } from './ExerciseScenes';
import { ReminderType } from '@shared/types';

interface NotificationPayload {
  type: ReminderType | string;
  title: string;
  message: string;
  cycleId?: string;
  instruction?: string;
  isGrouped?: boolean;
  groupedTypes?: (ReminderType | string)[];
  firstWord?: string;
  highlightWord?: string;
  categoryLabel?: string;
  illustrationKey?: string;
  variationIndex?: number;
  variationId?: string;
}

export const NotificationCard: React.FC = () => {
  const [payload, setPayload] = useState<NotificationPayload>({
    type: 'posture-stretch',
    title: 'Stretch Break',
    message: 'Give your back and shoulders a little movement.',
    instruction: 'Slowly stretch left, then right.',
    categoryLabel: 'Posture & Neck',
  });

  useEffect(() => {
    // Parse reminder data from window.location.hash
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const queryStr = hash.split('?')[1];
      const params = new URLSearchParams(queryStr);
      const dataRaw = params.get('data');
      if (dataRaw) {
        try {
          const parsed = JSON.parse(decodeURIComponent(dataRaw));
          setPayload((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse notification payload:', e);
        }
      }
    }
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.screenCareApi && (window.screenCareApi as any).closeNotification) {
      (window.screenCareApi as any).closeNotification();
    } else {
      window.close();
    }
  };

  const handleCardClick = () => {
    if (window.screenCareApi && (window.screenCareApi as any).clickNotification) {
      (window.screenCareApi as any).clickNotification();
    }
  };

  const handleMouseEnter = () => {
    if (window.screenCareApi && (window.screenCareApi as any).pauseNotificationTimer) {
      (window.screenCareApi as any).pauseNotificationTimer();
    }
  };

  const handleMouseLeave = () => {
    if (window.screenCareApi && (window.screenCareApi as any).resumeNotificationTimer) {
      (window.screenCareApi as any).resumeNotificationTimer();
    }
  };

  const defaultCategoryLabelFor = (t: ReminderType | string): string => {
    switch (t) {
      case 'eye-break':
        return 'Eye Break';
      case 'posture-stretch':
        return 'Posture & Neck';
      case 'stand-move':
        return 'Stand & Stretch';
      case 'walking':
        return 'Walking Refresh';
      case 'water':
        return 'Hydration';
      case 'neck-shoulder':
        return 'Neck & Shoulder';
      default:
        return 'Wellness Break';
    }
  };

  const scene = resolveScene(payload.illustrationKey, String(payload.type));

  // Determine which exercise animation and text to render
  const renderContent = () => {
    const t = payload.type;
    const catLabel = payload.categoryLabel || defaultCategoryLabelFor(t);

    // Rigged, multi-phase scene for this exact variation (3 per activity, rotated by the scheduler).
    // Older illustration components remain as a fallback for keys without a scene.
    const variationAnim = scene
      ? <ExerciseScene scene={scene} />
      : payload.illustrationKey
      ? getExerciseAnimation(payload.illustrationKey, String(t))
      : null;

    // First check if payload explicitly supplied custom firstWord / highlightWord (e.g. for grouped breaks or variations)
    if (payload.firstWord && payload.highlightWord) {
      let anim = variationAnim || <StretchBreakAnimation />;
      if (!variationAnim) {
        if (t === 'walking') {
          anim = <WalkingAnimation />;
        } else if (t === 'stand-move') {
          anim = <StandStretchAnimation />;
        } else if (t === 'eye-break') {
          anim = <EyeBreakAnimation />;
        } else if (t === 'posture-stretch') {
          anim = <StretchBreakAnimation />;
        } else if (t === 'neck-shoulder') {
          anim = <NeckShoulderAnimation />;
        }
      }

      return {
        firstWord: payload.firstWord,
        highlightWord: payload.highlightWord,
        subtitle: payload.message || 'Take a moment to reset and refresh your body and mind.',
        instruction: payload.instruction || 'Stand up, move gently, and give your body a mindful break.',
        animation: anim,
        categoryLabel: catLabel,
      };
    }

    if (t === 'eye-break') {
      return {
        firstWord: 'Eye',
        highlightWord: 'Break',
        subtitle: payload.message || 'Look at something 6 metres away for 20 seconds.',
        instruction: payload.instruction || 'Look away into the distance.',
        animation: variationAnim || <EyeBreakAnimation />,
        categoryLabel: catLabel,
      };
    } else if (t === 'posture-stretch') {
      return {
        firstWord: 'Posture &',
        highlightWord: 'Spine',
        subtitle: payload.message || 'Roll your shoulders back, align your neck, and release upper body tension.',
        instruction: payload.instruction || 'Slowly stretch spine left, then right.',
        animation: variationAnim || <StretchBreakAnimation />,
        categoryLabel: catLabel,
      };
    } else if (t === 'stand-move') {
      return {
        firstWord: 'Stand &',
        highlightWord: 'Stretch',
        subtitle: payload.message || 'Rise from your seat and stretch upward to restore circulation.',
        instruction: payload.instruction || 'Stand up tall and stretch your arms overhead.',
        animation: variationAnim || <StandStretchAnimation />,
        categoryLabel: catLabel,
      };
    } else if (t === 'walking') {
      return {
        firstWord: 'Walking',
        highlightWord: 'Break',
        subtitle: payload.message || 'Take a short 2-minute stroll away from your workstation.',
        instruction: payload.instruction || 'Step away from your desk and take a short walk.',
        animation: variationAnim || <WalkingAnimation />,
        categoryLabel: catLabel,
      };
    } else if (t === 'water') {
      return {
        firstWord: 'Water',
        highlightWord: 'Reminder',
        subtitle: payload.message || 'Stay hydrated to keep your mind and eyes refreshed.',
        instruction: payload.instruction || 'Take a refreshing sip of water.',
        animation: variationAnim || <WaterReminderAnimation />,
        categoryLabel: catLabel,
      };
    } else if (t === 'neck-shoulder') {
      return {
        firstWord: 'Neck &',
        highlightWord: 'Shoulder',
        subtitle: payload.message || 'Give your neck and shoulders a gentle release.',
        instruction: payload.instruction || 'Gently tilt head left, roll shoulders, tilt right.',
        animation: variationAnim || <NeckShoulderAnimation />,
        categoryLabel: catLabel,
      };
    } else {
      // Default: Posture Stretch / Stretch Break
      return {
        firstWord: 'Stretch',
        highlightWord: 'Break',
        subtitle: payload.message || 'Give your back and shoulders a little movement.',
        instruction: payload.instruction || 'Slowly stretch left, then right.',
        animation: variationAnim || <StretchBreakAnimation />,
        categoryLabel: catLabel,
      };
    }
  };

  const { firstWord, highlightWord, subtitle, instruction, animation, categoryLabel } = renderContent();

  return (
    <div
      className="notif-window-root"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <div className="notif-card">
        {/* Top Header with ScreenCare branding, Category Pill & close controls */}
        <div className="notif-header">
          <div className="notif-brand">
            <div className="notif-logo-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
              </svg>
            </div>
            <span className="notif-app-name">ScreenCare</span>
            <span className="notif-category-pill">{categoryLabel}</span>
          </div>

          <div className="notif-controls">
            <button
              className="notif-btn-icon"
              onClick={handleClose}
              title="Minimize"
              type="button"
            >
              —
            </button>
            <button
              className="notif-btn-icon notif-btn-close"
              onClick={handleClose}
              title="Close"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="notif-text-center">
          <h2 className="notif-title">
            {firstWord} <span className="notif-title-highlight">{highlightWord}</span>
          </h2>
          <p className="notif-subtitle">{subtitle}</p>
        </div>

        {/* Animated Exercise Illustration Showcase Stage */}
        <div className="notif-illustration-wrapper notif-illustration-stage">
          {animation}
          {scene ? (
            <PhaseTicker scene={scene} />
          ) : (
            <div className="notif-rhythm-bar-container">
              <span className="notif-rhythm-label">Rhythm</span>
              <div className="notif-rhythm-bar" />
            </div>
          )}
        </div>

        {/* Bottom Instruction */}
        <div className="notif-instruction">
          {instruction}
        </div>
      </div>
    </div>
  );
};
