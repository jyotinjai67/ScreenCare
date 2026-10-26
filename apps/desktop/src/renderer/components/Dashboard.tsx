import React from 'react';
import { AppStateSnapshot, ReminderType } from '@shared/types';
import { calculateWellnessScore } from '@shared/wellnessScore';

interface DashboardProps {
  state: AppStateSnapshot;
  onStartBreak: (type: ReminderType) => void;
  onPause: (minutes?: number) => void;
  onResume: () => void;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMinutesSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onStartBreak,
  onPause,
  onResume,
}) => {
  const { activeScreenSeconds, currentContinuousSeconds, settings, todaySummary, nextReminders, isPaused, isIdle } = state;
  const scoreData = calculateWellnessScore(
    activeScreenSeconds,
    settings.dailyScreenTimeGoalHours,
    state.recentLogs
  );

  const goalSeconds = settings.dailyScreenTimeGoalHours * 3600;
  const screenPct = Math.min(100, Math.round((activeScreenSeconds / goalSeconds) * 100));

  // 20-min continuous session limit percentage (20m = 1200s)
  const continuousPct = Math.min(100, Math.round((currentContinuousSeconds / 1200) * 100));

  // Score circular stroke calculation
  const scoreRadius = 52;
  const scoreCircumference = 2 * Math.PI * scoreRadius;
  const scoreStrokeOffset = scoreCircumference - (scoreData.score / 100) * scoreCircumference;

  // Continuous session stroke calculation
  const sessionRadius = 52;
  const sessionCircumference = 2 * Math.PI * sessionRadius;
  const sessionStrokeOffset = sessionCircumference - (continuousPct / 100) * sessionCircumference;

  const getReminderItem = (type: ReminderType) => {
    return nextReminders.find((r) => r.type === type);
  };

  const eyeReminder = getReminderItem('eye-break');
  const postureReminder = getReminderItem('posture-stretch');
  const standReminder = getReminderItem('stand-move');
  const walkReminder = getReminderItem('walking');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, animation: 'fadeIn 0.3s ease' }}>
      {/* Top Banner: Status & Quick Controls */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: isPaused ? '#f59e0b' : isIdle ? '#64748b' : '#10b981',
              boxShadow: isPaused
                ? '0 0 12px #f59e0b'
                : isIdle
                ? 'none'
                : '0 0 12px #10b981',
            }}
          />
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              {isPaused
                ? 'Monitoring Paused'
                : isIdle
                ? 'User Inactive / Idle Detected'
                : 'Active Health Monitoring'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 12 }}>
              {isPaused
                ? 'Reminders are held until resumed'
                : 'Automatic 20-20-20 & posture reminders active'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isPaused ? (
            <button className="btn btn-primary btn-sm" onClick={onResume}>
              ▶ Resume Monitoring
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPause(15)}
                title="Pause reminders for 15 minutes"
              >
                ⏸ Pause 15m
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onPause(60)}
                title="Pause reminders for 1 hour"
              >
                ⏸ Pause 1h
              </button>
            </>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onStartBreak('eye-break')}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #14b8a6 100%)',
              fontWeight: 700,
            }}
          >
            👁️ Quick 20s Break
          </button>
        </div>
      </div>

      {/* Hero Visual Section: Score Ring & Continuous Session Ring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: 24 }}>
        {/* Card 1: Eye Health & Wellness Score Ring */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 28, padding: 28 }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="65"
                cy="65"
                r={scoreRadius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="11"
                fill="none"
              />
              <circle
                cx="65"
                cy="65"
                r={scoreRadius}
                stroke="url(#dashScoreGrad)"
                strokeWidth="11"
                fill="none"
                strokeDasharray={scoreCircumference}
                strokeDashoffset={scoreStrokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
              <defs>
                <linearGradient id="dashScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
            </svg>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 38,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                {scoreData.score}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginTop: 2, letterSpacing: '0.5px' }}>
                SCORE
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Eye & Body Wellness</h3>
              <span
                className={`badge ${
                  scoreData.score >= 80 ? 'badge-success' : scoreData.score >= 60 ? 'badge-warning' : 'badge-danger'
                }`}
                style={{ fontSize: 11 }}
              >
                {scoreData.rating}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              {scoreData.score >= 80
                ? 'Excellent ocular habits! Frequent micro-breaks are keeping ciliary strain low.'
                : 'Take an eye rest to recover accommodating focus.'}
            </p>

            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Eye Breaks
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                  {todaySummary.eyeBreaksCompleted} completed
                </div>
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Body Movement
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2dd4bf' }}>
                  {todaySummary.movementBreaksCompleted} completed
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Screen Time & Continuous Session Visualizer */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 28, padding: 28 }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="65"
                cy="65"
                r={sessionRadius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="11"
                fill="none"
              />
              <circle
                cx="65"
                cy="65"
                r={sessionRadius}
                stroke={continuousPct >= 90 ? '#f43f5e' : 'url(#continuousGrad)'}
                strokeWidth="11"
                fill="none"
                strokeDasharray={sessionCircumference}
                strokeDashoffset={sessionStrokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
              />
              <defs>
                <linearGradient id="continuousGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 24,
                  fontWeight: 800,
                  color: continuousPct >= 90 ? '#fb7185' : '#ffffff',
                  lineHeight: 1,
                }}
              >
                {Math.floor(currentContinuousSeconds / 60)}m
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>
                CONTINUOUS
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Daily Screen Time</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>
                {formatDuration(activeScreenSeconds)} / {settings.dailyScreenTimeGoalHours}h
              </span>
            </div>

            {/* Visual Screen-Time Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${screenPct}%`,
                  background:
                    screenPct > 90
                      ? 'linear-gradient(90deg, #f59e0b, #f43f5e)'
                      : 'linear-gradient(90deg, #0284c7, #2dd4bf)',
                  borderRadius: 4,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Continuous session resets automatically after 10 minutes of idle or break time.
            </p>
          </div>
        </div>
      </div>

      {/* Four Large Illustrated Wellness Tiles */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>Wellness Protocols</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Configured intervals: Eye (20m) • Posture (45m) • Stand (60m) • Walk (90m)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {/* Tile 1: 20-20-20 Eye Break */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.8) 0%, rgba(2, 132, 199, 0.12) 100%)',
            }}
          >
            {/* Visual Vector Artwork */}
            <div
              style={{
                width: '100%',
                height: 110,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0369a1 0%, #0d9488 100%)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <svg viewBox="0 0 160 90" style={{ width: '85%', height: '85%' }}>
                {/* Sun & Mountains */}
                <circle cx="120" cy="25" r="14" fill="#fef08a" opacity="0.9" />
                <polygon points="10,90 55,35 100,90" fill="#047857" opacity="0.9" />
                <polygon points="70,90 115,40 160,90" fill="#065f46" opacity="0.9" />
                {/* Modern Eye Overlay */}
                <path d="M 25 45 Q 80 15 135 45 Q 80 75 25 45 Z" fill="rgba(255,255,255,0.9)" />
                <circle cx="80" cy="45" r="16" fill="#0284c7" />
                <circle cx="80" cy="45" r="8" fill="#090d16" />
                <circle cx="76" cy="41" r="3" fill="#ffffff" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#38bdf8',
                }}
              >
                20-20-20 PROTOCOL
              </div>
            </div>

            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Eye Rest Break
            </h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Next due: {eyeReminder ? formatMinutesSeconds(eyeReminder.secondsRemaining) : '20m'}
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 'auto', width: '100%' }}
              onClick={() => onStartBreak('eye-break')}
            >
              Take 20s Break
            </button>
          </div>

          {/* Tile 2: Posture & Spine Check */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.8) 0%, rgba(13, 148, 136, 0.12) 100%)',
            }}
          >
            {/* Visual Vector Artwork */}
            <div
              style={{
                width: '100%',
                height: 110,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0f766e 0%, #047857 100%)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <svg viewBox="0 0 160 90" style={{ width: '85%', height: '85%' }}>
                {/* Spine alignment diagram */}
                <circle cx="80" cy="20" r="10" fill="#a7f3d0" />
                <path d="M 80 32 L 80 75" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
                <circle cx="80" cy="40" r="4" fill="#ffffff" />
                <circle cx="80" cy="52" r="4" fill="#ffffff" />
                <circle cx="80" cy="64" r="4" fill="#ffffff" />
                <path d="M 60 42 Q 80 48 100 42" stroke="#a7f3d0" strokeWidth="3" fill="none" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#2dd4bf',
                }}
              >
                45M INTERVAL
              </div>
            </div>

            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Posture & Spine
            </h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Next due: {postureReminder ? formatMinutesSeconds(postureReminder.secondsRemaining) : '45m'}
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto', width: '100%' }}
              onClick={() => onStartBreak('posture-stretch')}
            >
              Check Posture
            </button>
          </div>

          {/* Tile 3: Stand Up & Move */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.8) 0%, rgba(245, 158, 11, 0.12) 100%)',
            }}
          >
            {/* Visual Vector Artwork */}
            <div
              style={{
                width: '100%',
                height: 110,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <svg viewBox="0 0 160 90" style={{ width: '85%', height: '85%' }}>
                {/* Standing Stretch Figure */}
                <circle cx="80" cy="18" r="9" fill="#fef3c7" />
                <path d="M 80 28 L 80 62" stroke="#fef3c7" strokeWidth="4" strokeLinecap="round" />
                {/* Arms stretching upwards */}
                <path d="M 60 14 L 80 34 L 100 14" stroke="#fef3c7" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                {/* Legs */}
                <path d="M 80 62 L 68 85" stroke="#fef3c7" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 80 62 L 92 85" stroke="#fef3c7" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fbbf24',
                }}
              >
                60M INTERVAL
              </div>
            </div>

            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Stand & Move
            </h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Next due: {standReminder ? formatMinutesSeconds(standReminder.secondsRemaining) : '60m'}
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto', width: '100%' }}
              onClick={() => onStartBreak('stand-move')}
            >
              Stand Up Now
            </button>
          </div>

          {/* Tile 4: Walking Refresh */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.8) 0%, rgba(139, 92, 246, 0.12) 100%)',
            }}
          >
            {/* Visual Vector Artwork */}
            <div
              style={{
                width: '100%',
                height: 110,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <svg viewBox="0 0 160 90" style={{ width: '85%', height: '85%' }}>
                {/* Park path and walking figure */}
                <path d="M 20 90 Q 80 55 140 90" stroke="#ddd6fe" strokeWidth="12" fill="none" opacity="0.4" />
                <circle cx="75" cy="26" r="8" fill="#ffffff" />
                <path d="M 75 35 L 75 60" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                <path d="M 75 60 L 62 82" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 75 60 L 88 80" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
                <polygon points="125,45 115,75 135,75" fill="#a78bfa" />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 8,
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#c4b5fd',
                }}
              >
                90M INTERVAL
              </div>
            </div>

            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              Walking Refresh
            </h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Next due: {walkReminder ? formatMinutesSeconds(walkReminder.secondsRemaining) : '90m'}
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto', width: '100%' }}
              onClick={() => onStartBreak('walking')}
            >
              Start Walk
            </button>
          </div>
        </div>
      </div>

      {/* Visual Upcoming Reminders Timeline */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
          Upcoming Reminder Timeline
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {nextReminders.slice(0, 4).map((rem, idx) => (
            <div
              key={rem.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: idx === 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: idx === 0 ? '#38bdf8' : 'var(--text-muted)',
                }}
              >
                {rem.type === 'eye-break' ? '👁️' : rem.type === 'posture-stretch' ? '🧘' : rem.type === 'stand-move' ? '🚶' : '🌿'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {rem.type === 'eye-break' ? '20-20-20 Eye Break' : rem.type === 'posture-stretch' ? 'Posture Check' : rem.type === 'stand-move' ? 'Stand Up' : 'Walking Refresh'}
                </div>
                <div style={{ fontSize: 11, color: idx === 0 ? '#38bdf8' : 'var(--text-muted)', fontWeight: 600 }}>
                  In {formatMinutesSeconds(rem.secondsRemaining)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
