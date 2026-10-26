import React from 'react';
import { AppStateSnapshot } from '@shared/types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  state: AppStateSnapshot | null;
  onTakeQuickBreak: () => void;
  onToggleTheme: () => void;
  theme: string;
  onMinimizeToTray: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  state,
  onTakeQuickBreak,
  onToggleTheme,
  theme,
  onMinimizeToTray,
}) => {
  const isIdle = state?.isIdle;
  const isPaused = state?.isPaused;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <svg width="28" height="28" viewBox="0 0 256 256" fill="none">
          <rect width="256" height="256" rx="56" fill="#0284c7" />
          <path
            d="M128 32 C176 48 208 56 208 104 C208 168 156 208 128 224 C100 208 48 168 48 104 C48 56 80 48 128 32 Z"
            fill="#0d9488"
          />
          <path
            d="M72 128 C88 96 112 84 128 84 C144 84 168 96 184 128 C168 160 144 172 128 172 C112 172 88 160 72 128 Z"
            fill="#ffffff"
          />
          <circle cx="128" cy="128" r="24" fill="#38bdf8" />
          <circle cx="128" cy="128" r="12" fill="#0f172a" />
        </svg>
        <span>ScreenCare</span>

        {isPaused ? (
          <span className="badge badge-warning" style={{ marginLeft: 8 }}>
            Paused
          </span>
        ) : isIdle ? (
          <span className="badge badge-info" style={{ marginLeft: 8 }}>
            Idle
          </span>
        ) : (
          <span className="badge badge-success" style={{ marginLeft: 8 }}>
            Active Monitoring
          </span>
        )}
      </div>

      <div className="nav-links">
        <button
          className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-link ${currentTab === 'stretches' ? 'active' : ''}`}
          onClick={() => setCurrentTab('stretches')}
        >
          Exercises & Stretches
        </button>
        <button
          className={`nav-link ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('settings')}
        >
          Settings
        </button>
        <button
          className={`nav-link ${currentTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setCurrentTab('privacy')}
        >
          Privacy & Security
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={onTakeQuickBreak}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          20-20-20 Break
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
          title="Toggle Theme"
          style={{ padding: '6px 10px' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onMinimizeToTray}
          title="Minimize to System Tray"
          style={{ padding: '6px 10px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </nav>
  );
};
