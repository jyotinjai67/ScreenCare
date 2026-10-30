import React from 'react';
import { AppStateSnapshot } from '@shared/types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  state: AppStateSnapshot | null;
  onPause: (minutes?: number) => void;
  onResume: () => void;
  onToggleTheme: () => void;
  theme: string;
  onMinimizeToTray: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  state,
  onPause,
  onResume,
  onToggleTheme,
  theme,
  onMinimizeToTray,
}) => {
  const isIdle = state?.isIdle;
  const isPaused = state?.isPaused;

  return (
    <header className="navbar">
      <div className="nav-brand">
        <svg width="24" height="24" viewBox="0 0 256 256" fill="none">
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
        <span className="nav-tagline">• Mindful Screen Rest</span>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`nav-tab-btn ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentTab('overview')}
        >
          Overview
        </button>
        <button
          className={`nav-tab-btn ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Controls & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Status Indicator */}
        <div className={`status-pill ${isPaused ? 'paused' : isIdle ? 'idle' : 'active'}`}>
          <span className={`status-dot ${isPaused ? 'paused' : isIdle ? 'idle' : 'active'}`} />
          <span>{isPaused ? 'Paused' : isIdle ? 'Idle' : 'Active'}</span>
        </div>

        {/* Quick Pause / Resume Action */}
        {isPaused ? (
          <button className="btn btn-primary btn-sm" onClick={onResume} title="Resume reminders immediately">
            ▶ Resume
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onPause(60)}
            title="Pause reminders for 1 hour"
          >
            ⏸ Pause 1h
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{ padding: '5px 8px' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Minimize to Tray */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onMinimizeToTray}
          title="Minimize to System Tray"
          style={{ padding: '5px 8px' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
};
