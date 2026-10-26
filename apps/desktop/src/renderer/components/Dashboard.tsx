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
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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
  const { activeScreenSeconds, currentContinuousSeconds, settings, todaySummary, nextReminders } = state;
  const scoreData = calculateWellnessScore(
    activeScreenSeconds,
    settings.dailyScreenTimeGoalHours,
    state.recentLogs
  );

  const goalSeconds = settings.dailyScreenTimeGoalHours * 3600;
  const screenPct = Math.min(100, Math.round((activeScreenSeconds / goalSeconds) * 100));

  // Score circular stroke calculation
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (scoreData.score / 100) * circumference;

  const getReminderItem = (type: ReminderType) => {
    return nextReminders.find((r) => r.type === type);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dev Mode Banner */}
      {settings.devTestMode && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span>
            ⚡ <strong>Developer Test Mode Active:</strong> Reminders fire every 20–60 seconds for live verification.
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Toggle in Settings</span>
        </div>
      )}

      {/* Top Section: Score & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 24 }}>
        {/* Wellness Score Card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="var(--border-color)"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="url(#scoreGrad)"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                {scoreData.score}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${scoreData.score >= 70 ? 'badge-success' : 'badge-warning'}`}>
                {scoreData.rating}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {scoreData.breakAdherencePct}% Break Adherence
              </span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Screen Health Score</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {scoreData.recommendation}
            </p>
          </div>
        </div>

        {/* 4 Metric Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Today's Screen Time</span>
              <span style={{ fontSize: 12, color: 'var(--accent-blue-light)' }}>
                Goal: {settings.dailyScreenTimeGoalHours}h
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {formatDuration(activeScreenSeconds)}
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3 }}>
              <div
                style={{
                  width: `${screenPct}%`,
                  height: '100%',
                  background:
                    screenPct > 90
                      ? 'var(--accent-rose)'
                      : screenPct > 75
                      ? 'var(--accent-amber)'
                      : 'var(--accent-blue)',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Continuous Session</span>
              <span style={{ fontSize: 12, color: currentContinuousSeconds >= 1200 ? '#fb7185' : '#34d399' }}>
                {currentContinuousSeconds >= 1200 ? 'Break Due' : 'Healthy'}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 24,
                fontWeight: 700,
                color: currentContinuousSeconds >= 1200 ? 'var(--accent-rose)' : 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {formatDuration(currentContinuousSeconds)}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              20-20-20 Rule interval: {settings.eyeBreak.intervalMinutes}m
            </span>
          </div>

          <div className="glass-card" style={{ padding: 18 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Completed Breaks</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--accent-teal-light)',
                  }}
                >
                  {todaySummary.eyeBreaksCompleted}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Eye</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--accent-blue-light)',
                  }}
                >
                  {todaySummary.movementBreaksCompleted}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Movement</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 18 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Monitoring Status</span>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {state.isPaused ? 'Paused' : state.isIdle ? 'System Idle' : 'Tracking Active'}
              </span>
              {state.isPaused ? (
                <button className="btn btn-primary btn-sm" onClick={onResume}>
                  Resume
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => onPause(60)}>
                  Pause 1h
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Reminders Section */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Scheduled Wellness Breaks</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* 1. Eye Break */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontSize: 18,
                }}
              >
                👁️
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>20-20-20 Eye Break</h4>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Every {settings.eyeBreak.intervalMinutes}m • 20s</span>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--accent-blue-light)',
                marginBottom: 14,
              }}
            >
              {formatMinutesSeconds(getReminderItem('eye-break')?.secondsRemaining ?? 0)}
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
              onClick={() => onStartBreak('eye-break')}
            >
              Start Break Now
            </button>
          </div>

          {/* 2. Posture Stretch */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(45, 212, 191, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2dd4bf',
                  fontSize: 18,
                }}
              >
                🧘
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>Posture & Neck</h4>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Every {settings.postureStretch.intervalMinutes}m • 45s
                </span>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--accent-teal-light)',
                marginBottom: 14,
              }}
            >
              {formatMinutesSeconds(getReminderItem('posture-stretch')?.secondsRemaining ?? 0)}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
              onClick={() => onStartBreak('posture-stretch')}
            >
              Start Stretch
            </button>
          </div>

          {/* 3. Stand Up */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  fontSize: 18,
                }}
              >
                🚶
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>Stand Up & Move</h4>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Every {settings.standMove.intervalMinutes}m • 60s</span>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 700,
                color: '#34d399',
                marginBottom: 14,
              }}
            >
              {formatMinutesSeconds(getReminderItem('stand-move')?.secondsRemaining ?? 0)}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
              onClick={() => onStartBreak('stand-move')}
            >
              Stand & Reset
            </button>
          </div>

          {/* 4. Walking Break */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  fontSize: 18,
                }}
              >
                🌿
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>Walking Refresh</h4>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Every {settings.walking.intervalMinutes}m • 3m</span>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 700,
                color: '#fbbf24',
                marginBottom: 14,
              }}
            >
              {formatMinutesSeconds(getReminderItem('walking')?.secondsRemaining ?? 0)}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
              onClick={() => onStartBreak('walking')}
            >
              Start Walk
            </button>
          </div>
        </div>
      </div>

      {/* Ergonomic Posture Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(13, 148, 136, 0.12) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            📏
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              Ergonomic Viewing Distance & Posture Check
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Keep your monitor at arm's length (50–70 cm) with the top line of text at eye level. Sit back, relax your
              shoulders, and keep wrists straight.
            </p>
          </div>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onStartBreak('posture-stretch')}
          style={{ whiteSpace: 'nowrap' }}
        >
          Check Posture
        </button>
      </div>

      {/* Recent Breaks Timeline */}
      <div className="glass-card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Today's Wellness Activity Timeline</h3>
        {state.recentLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            No breaks recorded yet today. Complete your first 20-20-20 eye break!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.recentLogs
              .slice(-5)
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16 }}>
                      {log.type === 'eye-break'
                        ? '👁️'
                        : log.type === 'posture-stretch'
                        ? '🧘'
                        : log.type === 'stand-move'
                        ? '🚶'
                        : '🌿'}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {log.type.replace('-', ' ').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div>
                    {log.action === 'completed' && (
                      <span className="badge badge-success">Completed ({log.durationSeconds}s)</span>
                    )}
                    {log.action === 'snoozed' && <span className="badge badge-warning">Snoozed</span>}
                    {log.action === 'skipped' && <span className="badge badge-danger">Skipped</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
