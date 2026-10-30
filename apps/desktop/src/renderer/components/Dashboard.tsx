import React from 'react';
import { AppStateSnapshot, ReminderType } from '@shared/types';

interface DashboardProps {
  state: AppStateSnapshot;
  onPause: (minutes?: number) => void;
  onResume: () => void;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Due now';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onPause, onResume }) => {
  const { activeScreenSeconds, nextReminders, isPaused, settings } = state;
  const goalSeconds = (settings.dailyScreenTimeGoalHours || 6) * 3600;
  const screenPct = Math.min(100, Math.round((activeScreenSeconds / goalSeconds) * 100));

  const getReminderItem = (type: ReminderType) => {
    return nextReminders.find((r) => r.type === type);
  };

  const eyeReminder = getReminderItem('eye-break');
  const postureReminder = getReminderItem('posture-stretch');
  const standReminder = getReminderItem('stand-move');
  const walkReminder = getReminderItem('walking');

  // Earliest upcoming reminder: only the four scheduled reminders, skipping individually paused ones.
  // (The authoritative list is already sorted by remaining time.)
  const scheduledTypes: ReminderType[] = ['eye-break', 'posture-stretch', 'stand-move', 'walking'];
  const earliestReminder =
    nextReminders.find((r) => scheduledTypes.includes(r.type) && !r.isPaused) || null;

  const adaptive = state.adaptive;
  const formatClock = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const reminderName = (t: ReminderType) =>
    t === 'eye-break' ? 'Eye Rest' : t === 'posture-stretch' ? 'Posture' : t === 'stand-move' ? 'Stand & Stretch' : 'Walking';
  const settlingLabel = (r?: { settlingUntil?: number }) => (r && r.settlingUntil ? ` · after ${formatClock(r.settlingUntil)}` : '');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {adaptive && adaptive.enabled && (adaptive.phase === 'settling' || adaptive.insights.length > 0) && (
        <div
          role="status"
          className="adaptive-status"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(20, 184, 166, 0.08)',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
          }}
        >
          {adaptive.phase === 'settling' && adaptive.settlingUntil && (
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Welcome back — settling in after {Math.round((adaptive.lastReturn?.durationSeconds || 0) / 60)} min away.{' '}
              {adaptive.heldTypes.map(reminderName).join(', ')} will remind you after {formatClock(adaptive.settlingUntil)}.
            </div>
          )}
          {adaptive.insights.map((text) => (
            <div key={text}>{text}</div>
          ))}
        </div>
      )}
      {settings.devTestMode && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #eab308',
            background: 'rgba(234, 179, 8, 0.12)',
            color: '#fde047',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ⚡ Rapid Test Mode is on — reminders use accelerated 20s–90s test intervals instead of your saved
          minute intervals. Turn it off in Preferences to use your own schedule.
        </div>
      )}
      {/* Hero Overview Card */}
      <div
        className="glass-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr 1fr',
          gap: 24,
          alignItems: 'center',
          padding: '24px 28px',
        }}
      >
        {/* Tasteful Vector Eye-Care Artwork */}
        <div
          style={{
            width: 130,
            height: 100,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0c4a6e 0%, #065f46 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 160 110" style={{ width: '90%', height: '90%' }}>
            {/* Distant soft sun/moon */}
            <circle cx="125" cy="30" r="14" fill="#38bdf8" opacity="0.35" />
            {/* Distant calm hills */}
            <path d="M 0 110 L 45 60 L 95 110 Z" fill="#0284c7" opacity="0.4" />
            <path d="M 60 110 L 115 50 L 160 110 Z" fill="#0d9488" opacity="0.5" />
            <path d="M 20 110 L 80 75 L 140 110 Z" fill="#047857" opacity="0.6" />
            {/* Minimalist resting eye contour */}
            <path
              d="M 28 55 Q 80 25 132 55 Q 80 85 28 55 Z"
              fill="rgba(255, 255, 255, 0.95)"
            />
            <circle cx="80" cy="55" r="14" fill="#0284c7" />
            <circle cx="80" cy="55" r="6" fill="#0b0f19" />
            <circle cx="77" cy="52" r="2.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Accumulated Active Screen Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Screen Time
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent-cyan-light)', fontWeight: 600 }}>
              Today
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {formatDuration(activeScreenSeconds)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              / {settings.dailyScreenTimeGoalHours}h target
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: `${screenPct}%`,
                height: '100%',
                background: screenPct > 90
                  ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                  : 'linear-gradient(90deg, #0284c7, #2dd4bf)',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Paused automatically when locked, asleep, or idle.
          </span>
        </div>

        {/* Next Due Reminder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Next Scheduled Reminder
            </span>
          </div>

          {earliestReminder ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>
                  {earliestReminder.type === 'eye-break' ? '👁️' : earliestReminder.type === 'posture-stretch' ? '🧘' : earliestReminder.type === 'stand-move' ? '🚶' : '🌿'}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {earliestReminder.type === 'eye-break'
                    ? 'Eye Break'
                    : earliestReminder.type === 'posture-stretch'
                    ? 'Posture & Spine'
                    : earliestReminder.type === 'stand-move'
                    ? 'Stand & Stretch'
                    : 'Walking Refresh'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent-teal-light)' }}>
                  {isPaused ? '(Paused)' : `in ${formatCountdown(earliestReminder.secondsRemaining)}${settlingLabel(earliestReminder)}`}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
                {earliestReminder.type === 'eye-break'
                  ? `Look at something 6 metres away for ${settings.eyeBreak.durationSeconds || 20} seconds.`
                  : earliestReminder.type === 'posture-stretch'
                  ? 'Roll shoulders back, align neck, and release spinal tension.'
                  : earliestReminder.type === 'stand-move'
                  ? 'Stand up and stretch legs to restore circulation.'
                  : 'Take a short 2-minute stroll away from your screen.'}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>All reminders disabled in settings.</p>
          )}

          <div style={{ marginTop: 4 }}>
            {isPaused ? (
              <button className="btn btn-primary btn-sm" onClick={onResume}>
                ▶ Resume Monitoring
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => onPause(60)}>
                ⏸ Pause for 1 Hour
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reminders Schedule Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Background Reminder Schedules
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Animated GIF-style illustration • One timely notification per cycle
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (window.screenCareApi && (window.screenCareApi as any).previewNotification) {
                (window.screenCareApi as any).previewNotification('posture-stretch');
              }
            }}
            title="Preview animated GIF-like notification card"
          >
            ✨ Preview Animated Reminder
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {/* Card 1: Eye Break */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>👁️</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  20-20-20 Eye Rest
                </span>
              </div>
              <span className="status-pill active" style={{ fontSize: 11, padding: '2px 8px' }}>
                Every {settings.eyeBreak.intervalMinutes}m
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Relaxes the eye ciliary muscles accommodating near screen focus.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  if (window.screenCareApi && (window.screenCareApi as any).previewNotification) {
                    (window.screenCareApi as any).previewNotification('eye-break');
                  }
                }}
                title="Preview Eye Break animation"
              >
                👁️ Preview
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan-light)' }}>
                  {isPaused || settings.eyeBreak.paused ? 'Paused' : formatCountdown(eyeReminder?.secondsRemaining || 0) + settlingLabel(eyeReminder)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Posture Stretch */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🧘</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Posture & Neck Check
                </span>
              </div>
              <span className="status-pill active" style={{ fontSize: 11, padding: '2px 8px' }}>
                Every {settings.postureStretch.intervalMinutes}m
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Encourages upright spinal alignment and releases trapezius tension.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  if (window.screenCareApi && (window.screenCareApi as any).previewNotification) {
                    (window.screenCareApi as any).previewNotification('posture-stretch');
                  }
                }}
                title="Preview Posture & Spine animation"
              >
                🧘 Preview
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan-light)' }}>
                  {isPaused || settings.postureStretch.paused ? 'Paused' : formatCountdown(postureReminder?.secondsRemaining || 0) + settlingLabel(postureReminder)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Stand & Move */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🚶</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Stand & Stretch
                </span>
              </div>
              <span className="status-pill active" style={{ fontSize: 11, padding: '2px 8px' }}>
                Every {settings.standMove.intervalMinutes}m
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Combats prolonged sitting fatigue and reactivates circulation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  if (window.screenCareApi && (window.screenCareApi as any).previewNotification) {
                    (window.screenCareApi as any).previewNotification('stand-move');
                  }
                }}
                title="Preview Stand & Stretch animation"
              >
                🚶 Preview
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan-light)' }}>
                  {isPaused || settings.standMove.paused ? 'Paused' : formatCountdown(standReminder?.secondsRemaining || 0) + settlingLabel(standReminder)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Walking Refresh */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🌿</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Walking Refresh
                </span>
              </div>
              <span className="status-pill active" style={{ fontSize: 11, padding: '2px 8px' }}>
                Every {settings.walking.intervalMinutes}m
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              A short stroll away from monitors for complete cognitive and ocular reset.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  if (window.screenCareApi && (window.screenCareApi as any).previewNotification) {
                    (window.screenCareApi as any).previewNotification('walking');
                  }
                }}
                title="Preview Walking Refresh animation"
              >
                🌿 Preview
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan-light)' }}>
                  {isPaused || settings.walking.paused ? 'Paused' : formatCountdown(walkReminder?.secondsRemaining || 0) + settlingLabel(walkReminder)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discreet Quiet Background Note */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.45)',
        }}
      >
        <span style={{ fontSize: 16 }}>🛡️</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          ScreenCare monitors screen time quietly in the background. It will never force a break screen, modal, or countdown upon you. Reminders appear once at their scheduled time.
        </span>
      </div>
    </div>
  );
};
