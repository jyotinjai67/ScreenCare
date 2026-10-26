import React, { useState } from 'react';
import { STRETCH_CATALOG } from '@shared/stretches';
import { StretchExercise, ReminderType } from '@shared/types';

interface StretchLibraryProps {
  onStartRoutine: (type: ReminderType) => void;
}

function renderExerciseVector(category: string, title: string) {
  if (category === 'eye') {
    return (
      <svg viewBox="0 0 100 60" style={{ width: 64, height: 42 }}>
        <path d="M 10 30 Q 50 5 90 30 Q 50 55 10 30 Z" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="2.5" />
        <circle cx="50" cy="30" r="14" fill="#0284c7" />
        <circle cx="50" cy="30" r="7" fill="#090d16" />
        <circle cx="47" cy="27" r="2.5" fill="#ffffff" />
      </svg>
    );
  }
  if (title.toLowerCase().includes('neck') || title.toLowerCase().includes('cervical')) {
    return (
      <svg viewBox="0 0 100 60" style={{ width: 64, height: 42 }}>
        <circle cx="50" cy="18" r="12" fill="#38bdf8" opacity="0.8" />
        <path d="M 50 30 L 50 48" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 28 48 Q 50 42 72 48" stroke="#2dd4bf" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Curving arrow for neck tilt */}
        <path d="M 32 18 Q 42 6 58 10" stroke="#fbbf24" strokeWidth="2" fill="none" strokeDasharray="3,2" />
        <polygon points="60,8 58,14 64,12" fill="#fbbf24" />
      </svg>
    );
  }
  if (category === 'posture' || title.toLowerCase().includes('shoulder') || title.toLowerCase().includes('chest')) {
    return (
      <svg viewBox="0 0 100 60" style={{ width: 64, height: 42 }}>
        <circle cx="50" cy="14" r="8" fill="#2dd4bf" />
        {/* Torso & open chest */}
        <path d="M 50 22 L 50 48" stroke="#2dd4bf" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 24 30 L 50 24 L 76 30" stroke="#2dd4bf" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="30" r="3.5" fill="#ffffff" />
        <circle cx="76" cy="30" r="3.5" fill="#ffffff" />
        {/* Spine dots */}
        <circle cx="50" cy="30" r="2" fill="#ffffff" />
        <circle cx="50" cy="38" r="2" fill="#ffffff" />
      </svg>
    );
  }
  if (title.toLowerCase().includes('walk')) {
    return (
      <svg viewBox="0 0 100 60" style={{ width: 64, height: 42 }}>
        <path d="M 10 52 Q 50 35 90 52" stroke="#a78bfa" strokeWidth="8" fill="none" opacity="0.4" />
        <circle cx="48" cy="16" r="7" fill="#ffffff" />
        <path d="M 48 23 L 48 38" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M 48 38 L 38 52" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 48 38 L 58 50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  // Standing movement default
  return (
    <svg viewBox="0 0 100 60" style={{ width: 64, height: 42 }}>
      <circle cx="50" cy="14" r="7" fill="#fbbf24" />
      <path d="M 50 21 L 50 42" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <path d="M 34 10 L 50 24 L 66 10" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 50 42 L 40 56" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 50 42 L 60 56" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export const StretchLibrary: React.FC<StretchLibraryProps> = ({ onStartRoutine }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered =
    activeCategory === 'all'
      ? STRETCH_CATALOG
      : STRETCH_CATALOG.filter((item) => item.category === activeCategory);

  const mapCategoryToType = (ex: StretchExercise): ReminderType => {
    if (ex.category === 'eye') return 'eye-break';
    if (ex.category === 'posture') return 'posture-stretch';
    if (ex.category === 'movement') return ex.id.includes('walk') ? 'walking' : 'stand-move';
    return 'posture-stretch';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
            Ergonomic Exercises & Stretch Library
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Medically guided micro-routines to relieve screen fatigue, ocular strain, and postural tension.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'eye', 'posture', 'stretch', 'movement'].map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategory(cat)}
              style={{ textTransform: 'capitalize' }}
            >
              {cat === 'all' ? 'All Routines' : cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span
                  className={`badge ${
                    ex.category === 'eye'
                      ? 'badge-info'
                      : ex.category === 'posture'
                      ? 'badge-success'
                      : ex.category === 'movement'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                  style={{ textTransform: 'uppercase', marginBottom: 8, fontSize: 11 }}
                >
                  {ex.category} • {ex.durationSeconds}s
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{ex.title}</h3>
              </div>

              {/* Graphical Vector Illustration */}
              <div
                style={{
                  background: 'rgba(2, 6, 23, 0.5)',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {renderExerciseVector(ex.category, ex.title)}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--accent-teal-light)', fontWeight: 600, marginBottom: 8 }}>
              🎯 Target: {ex.targetArea}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{ex.description}</p>

            {/* Visual Step Pills */}
            <div
              style={{
                background: 'rgba(2, 6, 23, 0.45)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: 16,
                flex: 1,
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                STEP-BY-STEP GUIDANCE:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ex.steps.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#f1f5f9' }}>
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 12,
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                💡 {ex.benefits.slice(0, 48)}...
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStartRoutine(mapCategoryToType(ex))}
              >
                Start Routine ({ex.durationSeconds}s)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
