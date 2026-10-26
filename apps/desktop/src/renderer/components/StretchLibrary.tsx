import React, { useState } from 'react';
import { STRETCH_CATALOG } from '@shared/stretches';
import { StretchExercise, ReminderType } from '@shared/types';

interface StretchLibraryProps {
  onStartRoutine: (type: ReminderType) => void;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Ergonomic Exercises & Stretch Library</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Medically informed micro-routines to relieve screen fatigue, ocular strain, and musculoskeletal stiffness.
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
          <div key={ex.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
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
                  style={{ textTransform: 'uppercase', marginBottom: 6 }}
                >
                  {ex.category} • {ex.durationSeconds}s
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{ex.title}</h3>
              </div>
              <span style={{ fontSize: 28 }}>
                {ex.category === 'eye' ? '👁️' : ex.category === 'posture' ? '🧘' : ex.category === 'movement' ? '🚶' : '🤸'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--accent-teal-light)', fontWeight: 600, marginBottom: 8 }}>
              🎯 Target: {ex.targetArea}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{ex.description}</p>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: 16,
                flex: 1,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                INSTRUCTIONS:
              </div>
              <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {ex.steps.map((s, idx) => (
                  <li key={idx} style={{ marginBottom: 3 }}>
                    {s}
                  </li>
                ))}
              </ul>
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                💡 <em>{ex.benefits.slice(0, 55)}...</em>
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStartRoutine(mapCategoryToType(ex))}
              >
                Launch Routine
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
