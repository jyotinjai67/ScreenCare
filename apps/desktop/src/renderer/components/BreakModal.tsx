import React, { useEffect, useState, useRef } from 'react';
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
  const [remaining, setRemaining] = useState<number>(activeBreak.remainingSeconds || 20);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = activeBreak.totalSeconds || 20;

  // Local tick countdown if renderer is driving it or keeping in sync
  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, remaining]);

  // Sync when activeBreak remaining updates from main process
  useEffect(() => {
    if (activeBreak.remainingSeconds !== undefined && Math.abs(activeBreak.remainingSeconds - remaining) > 2) {
      setRemaining(activeBreak.remainingSeconds);
    }
  }, [activeBreak.remainingSeconds]);

  // Breathing cycle: 4s Inhale, 2s Hold, 4s Exhale
  useEffect(() => {
    const cycle = setInterval(() => {
      setBreathingPhase((prev) => {
        if (prev === 'inhale') return 'hold';
        if (prev === 'hold') return 'exhale';
        return 'inhale';
      });
    }, 3500);
    return () => clearInterval(cycle);
  }, []);

  const progressPct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const isFinished = remaining === 0;

  // Circular progress math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progressPct / 100) * circumference;

  // Keyboard shortcut support: Esc to skip, Space to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === ' ' && !isFinished) {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (e.key === 'Enter' && isFinished) {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, onSkip, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(7, 11, 20, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Floating Ambient Background Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, transparent 70%)',
          top: '10%',
          left: '12%',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.16) 0%, transparent 70%)',
          bottom: '10%',
          right: '12%',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />

      <div
        className="glass-card"
        style={{
          maxWidth: 820,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px 36px',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.25)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          background: 'linear-gradient(170deg, rgba(15, 23, 42, 0.95) 0%, rgba(11, 15, 25, 0.98) 100%)',
        }}
      >
        {/* Top Header Tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="badge badge-info"
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.8px',
                padding: '5px 14px',
                textTransform: 'uppercase',
              }}
            >
              {activeBreak.type === 'eye-break'
                ? '👁️ 20-20-20 Eye Care Protocol'
                : activeBreak.type === 'posture-stretch'
                ? '🧘 Ergonomic Spine & Neck Reset'
                : activeBreak.type === 'stand-move'
                ? '🚶 Stand Up & Circulation Boost'
                : '🌿 Refreshing Walking Break'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {isFinished ? 'Routine Complete' : isRunning ? 'In Progress' : 'Paused'}
            </span>
          </div>

          <button
            onClick={onSkip}
            title="Dismiss break (Esc)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Eye Break Dedicated Pictorial Experience */}
        {activeBreak.type === 'eye-break' ? (
          <div>
            {/* Visual Scenic Window & Eye Illustration Duo */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: 24,
                alignItems: 'center',
                marginBottom: 24,
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid rgba(56, 189, 248, 0.18)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
              }}
            >
              {/* Window Looking Out to Scenery Illustration */}
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                <svg
                  viewBox="0 0 380 200"
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
                >
                  <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="60%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#bae6fd" />
                    </linearGradient>
                    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="mountainFar" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0f766e" />
                      <stop offset="100%" stopColor="#115e59" />
                    </linearGradient>
                    <linearGradient id="mountainNear" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#065f46" />
                    </linearGradient>
                    <linearGradient id="hillFront" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>

                  {/* Sky */}
                  <rect width="380" height="200" fill="url(#skyGrad)" />

                  {/* Golden Sun */}
                  <circle cx="280" cy="55" r="28" fill="url(#sunGrad)" opacity="0.9" />
                  <circle cx="280" cy="55" r="38" fill="#fef08a" opacity="0.25" />

                  {/* Clouds */}
                  <path
                    d="M 50 45 Q 65 30 85 45 Q 105 32 120 45 Q 130 55 110 58 L 50 58 Z"
                    fill="#ffffff"
                    opacity="0.8"
                  />
                  <path
                    d="M 180 35 Q 192 24 210 35 Q 225 25 240 35 Q 250 45 230 48 L 180 48 Z"
                    fill="#ffffff"
                    opacity="0.75"
                  />

                  {/* Distant Birds */}
                  <path d="M 130 75 Q 135 70 140 75 Q 145 70 150 75" stroke="#0f172a" strokeWidth="1.5" fill="none" opacity="0.6" />
                  <path d="M 155 68 Q 159 64 163 68 Q 167 64 171 68" stroke="#0f172a" strokeWidth="1.2" fill="none" opacity="0.5" />

                  {/* Distant Mountain Ridge (20+ feet distance) */}
                  <polygon points="40,200 130,80 210,200" fill="url(#mountainFar)" opacity="0.85" />
                  <polygon points="150,200 240,95 330,200" fill="url(#mountainFar)" opacity="0.8" />
                  <polygon points="260,200 330,110 380,200" fill="url(#mountainFar)" opacity="0.85" />

                  {/* Mid-ground Mountain & Forest */}
                  <polygon points="0,200 80,120 180,200" fill="url(#mountainNear)" />
                  <polygon points="120,200 200,130 280,200" fill="url(#mountainNear)" />

                  {/* Foreground Rolling Hills */}
                  <path d="M 0 160 Q 90 145 180 165 T 380 155 L 380 200 L 0 200 Z" fill="url(#hillFront)" />

                  {/* Evergreen Trees */}
                  <polygon points="65,160 55,185 75,185" fill="#064e3b" />
                  <polygon points="90,155 80,180 100,180" fill="#064e3b" />
                  <polygon points="220,165 210,190 230,190" fill="#064e3b" />
                  <polygon points="245,158 235,185 255,185" fill="#064e3b" />

                  {/* Person Silhouette Looking Out */}
                  <path
                    d="M 320 200 Q 320 170 335 160 Q 345 155 345 145 Q 345 135 337 135 Q 328 135 328 145 Q 328 152 322 155 Q 310 162 305 200 Z"
                    fill="#0f172a"
                    opacity="0.9"
                  />

                  {/* Modern Architectural Window Frame */}
                  <rect x="0" y="0" width="380" height="200" fill="none" stroke="#1e293b" strokeWidth="12" />
                  <line x1="190" y1="0" x2="190" y2="200" stroke="#1e293b" strokeWidth="8" />
                  <line x1="0" y1="100" x2="380" y2="100" stroke="#1e293b" strokeWidth="8" />
                  {/* Subtle glass reflection */}
                  <polygon points="20,10 70,10 40,90 10,90" fill="#ffffff" opacity="0.12" />
                  <polygon points="210,10 260,10 230,90 200,90" fill="#ffffff" opacity="0.12" />
                </svg>

                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 12,
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#38bdf8',
                  }}
                >
                  🏔️ Distant Horizon (~20 Feet / 6 Meters)
                </div>
              </div>

              {/* Glowing Eye Illustration & Vision Relaxer */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                }}
              >
                <div style={{ position: 'relative', width: 140, height: 90, marginBottom: 12 }}>
                  <svg viewBox="0 0 160 100" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="irisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                      <radialGradient id="pupilAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="70%" stopColor="#0284c7" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Sclera & Outer Eye Contour */}
                    <path
                      d="M 10 50 Q 80 5 150 50 Q 80 95 10 50 Z"
                      fill="#f8fafc"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />

                    {/* Iris with Luminous Gradient */}
                    <circle cx="80" cy="50" r="26" fill="url(#irisGrad)" />

                    {/* Pupil */}
                    <circle cx="80" cy="50" r="14" fill="#090d16" />

                    {/* Light Specular Highlights */}
                    <circle cx="73" cy="43" r="4.5" fill="#ffffff" />
                    <circle cx="86" cy="56" r="2" fill="#ffffff" opacity="0.8" />

                    {/* Upper Eyelash Accents */}
                    <path d="M 30 38 Q 32 30 35 25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 60 22 Q 62 14 65 10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 80 18 Q 80 10 80 6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 100 22 Q 98 14 95 10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 130 38 Q 128 30 125 25" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Eye Muscle Relaxation
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Looking into distance releases tension in your ciliary accommodating muscles.
                </div>
              </div>
            </div>

            {/* Central Prominent Countdown Ring */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 36,
                marginBottom: 28,
              }}
            >
              {/* Circular Gauge */}
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={isFinished ? '#10b981' : 'url(#breakCountdownGrad)'}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s ease-out, stroke 0.3s ease' }}
                  />
                  <defs>
                    <linearGradient id="breakCountdownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inner Counter Content */}
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
                  {isFinished ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 36, color: '#34d399', lineHeight: 1 }}>✓</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginTop: 4 }}>
                        DONE!
                      </span>
                    </div>
                  ) : (
                    <>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 48,
                          fontWeight: 800,
                          color: '#ffffff',
                          lineHeight: 1,
                        }}
                      >
                        {remaining}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--accent-teal-light)',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          marginTop: 4,
                        }}
                      >
                        Seconds
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Breathing Rhythm Guidance Card */}
              <div
                style={{
                  textAlign: 'left',
                  background: 'rgba(2, 6, 23, 0.45)',
                  padding: '16px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  minWidth: 260,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                  Rhythmic Breathing Guide
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: breathingPhase === 'inhale' ? '#38bdf8' : breathingPhase === 'hold' ? '#fbbf24' : '#2dd4bf',
                    marginBottom: 8,
                    transition: 'color 0.4s ease',
                  }}
                >
                  {breathingPhase === 'inhale' ? '🌬️ Inhale deeply...' : breathingPhase === 'hold' ? '✨ Hold gently...' : '💨 Exhale softly...'}
                </div>

                {/* Breathing progress animation bar */}
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: breathingPhase === 'inhale' ? '100%' : breathingPhase === 'hold' ? '100%' : '20%',
                      background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)',
                      borderRadius: 3,
                      transition: 'width 3.5s linear',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 4 }}>Space</kbd> to {isRunning ? 'pause' : 'resume'}
                </div>
              </div>
            </div>

            {/* Three Visual Steps with Icons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 28,
                textAlign: 'left',
              }}
            >
              {/* Step 1 */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(56, 189, 248, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    🖥️
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>STEP 1</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Look Away from Screen
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Avert your gaze completely from monitors, phone screens, and near objects.
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(45, 212, 191, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(45, 212, 191, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    🏔️
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#2dd4bf' }}>STEP 2</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Focus 20 Feet Away
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Find a distant tree, window horizon, or hallway landmark at least 6 meters away.
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(167, 139, 250, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(167, 139, 250, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    😌
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa' }}>STEP 3</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Blink & Relax Naturally
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Blink softly several times to re-moisten your eyes and breathe calmly.
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Posture / Stand / Walk Generic Pictorial Screen */
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 28,
              }}
            >
              <div style={{ fontSize: 64, flexShrink: 0 }}>
                {activeBreak.type === 'posture-stretch'
                  ? '🧘'
                  : activeBreak.type === 'stand-move'
                  ? '🚶'
                  : '🌿'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
                  {activeBreak.exercise.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {activeBreak.exercise.description}
                </p>
                <div style={{ fontSize: 13, color: 'var(--accent-teal-light)', fontWeight: 600 }}>
                  🎯 Target Area: {activeBreak.exercise.targetArea}
                </div>
              </div>
            </div>

            {/* Countdown for stretch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 52,
                  fontWeight: 800,
                  color: isFinished ? '#34d399' : '#38bdf8',
                }}
              >
                {isFinished ? 'Complete!' : `${remaining}s`}
              </div>
            </div>

            {/* Steps */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                textAlign: 'left',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.8px' }}>
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
          </div>
        )}

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
          {isFinished ? (
            <button
              className="btn btn-primary btn-lg"
              style={{
                flex: 1,
                maxWidth: 340,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              }}
              onClick={onComplete}
            >
              ✓ Complete Break & Return (Done)
            </button>
          ) : (
            <>
              <button
                className="btn btn-outline"
                style={{ minWidth: 120 }}
                onClick={onSkip}
                title="Skip this break"
              >
                Skip
              </button>
              <button
                className="btn btn-secondary"
                style={{ minWidth: 130 }}
                onClick={onSnooze}
                title="Remind again in 5 minutes"
              >
                Snooze 5m
              </button>
              <button
                className="btn btn-secondary"
                style={{ minWidth: 120 }}
                onClick={() => setIsRunning((prev) => !prev)}
              >
                {isRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                className="btn btn-primary"
                style={{ minWidth: 160 }}
                onClick={onComplete}
              >
                Mark as Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
