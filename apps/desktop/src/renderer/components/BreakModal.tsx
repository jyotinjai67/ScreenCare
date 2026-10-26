import React, { useEffect, useState } from 'react';
import { ActiveBreakState } from '@shared/types';

interface BreakModalProps {
  activeBreak: ActiveBreakState;
  onComplete: () => void;
  onSnooze: () => void;
  onSkip: () => void;
}

export const BreakModal: React.FC<BreakModalProps> = ({
  activeBreak,
  onComplete,
  onSnooze,
  onSkip,
}) => {
  const [remaining, setRemaining] = useState(activeBreak.remainingSeconds);
  const [breathingText, setBreathingText] = useState('Inhale gently...');

  useEffect(() => {
    setRemaining(activeBreak.remainingSeconds);
  }, [activeBreak.remainingSeconds]);

  // Breathing guide cycle (4s inhale, 4s exhale)
  useEffect(() => {
    const cycle = setInterval(() => {
      setBreathingText((prev) => (prev.startsWith('Inhale') ? 'Exhale smoothly...' : 'Inhale gently...'));
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  const total = activeBreak.totalSeconds || 20;
  const progressPct = ((total - remaining) / total) * 100;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progressPct / 100) * circumference;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(11, 15, 25, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 620,
          width: '100%',
          padding: 36,
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span
          className="badge badge-info"
          style={{ marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.8px' }}
        >
          {activeBreak.exercise.category} Routine • {activeBreak.exercise.targetArea}
        </span>

        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>
          {activeBreak.exercise.title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 480 }}>
          {activeBreak.exercise.description}
        </p>

        {/* Big Circular Countdown with Breathing Guide */}
        <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 24 }}>
          {/* Animated breathing glow background */}
          <div
            className="pulse-circle"
            style={{
              position: 'absolute',
              inset: 16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(45, 212, 191, 0.1) 70%, transparent 100%)',
            }}
          />

          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="url(#breakGrad)"
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear' }}
            />
            <defs>
              <linearGradient id="breakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                fontSize: 44,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              {remaining}
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent-teal-light)', marginTop: 4 }}>seconds</span>
          </div>
        </div>

        {/* Breathing Rhythm Text */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-blue-light)',
            marginBottom: 20,
            letterSpacing: '0.4px',
          }}
        >
          {breathingText}
        </div>

        {/* Exercise Steps */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            textAlign: 'left',
            width: '100%',
            marginBottom: 24,
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
            GUIDED STEPS:
          </div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {activeBreak.exercise.steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={onSkip}
            title="Dismiss reminder"
          >
            Skip for Now
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onSnooze}
            title="Remind again in 5 minutes"
          >
            Snooze 5m
          </button>
          <button
            className="btn btn-primary btn-lg"
            style={{ flex: 1.4 }}
            onClick={onComplete}
            title="Complete this break"
          >
            ✓ Complete Break
          </button>
        </div>
      </div>
    </div>
  );
};
