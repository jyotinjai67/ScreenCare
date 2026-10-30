import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SettingsView } from './components/SettingsView';
import { AppStateSnapshot, UserSettings, DEFAULT_SETTINGS, ReminderType } from '@shared/types';

const FALLBACK_STATE: AppStateSnapshot = {
  activeScreenSeconds: 0,
  currentContinuousSeconds: 0,
  isIdle: false,
  isPaused: false,
  todaySummary: {
    date: new Date().toISOString().split('T')[0],
    totalScreenSeconds: 0,
    totalIdleSeconds: 0,
    eyeBreaksCompleted: 0,
    movementBreaksCompleted: 0,
    remindersSkipped: 0,
    remindersSnoozed: 0,
    wellnessScore: 85,
  },
  recentLogs: [],
  settings: DEFAULT_SETTINGS,
  activeBreak: null,
  nextReminders: [
    { type: 'eye-break', nextDueTimestamp: Date.now() + 1200000, secondsRemaining: 1200, status: 'scheduled', cycleId: 'eye-1' },
    { type: 'posture-stretch', nextDueTimestamp: Date.now() + 2700000, secondsRemaining: 2700, status: 'scheduled', cycleId: 'posture-1' },
    { type: 'stand-move', nextDueTimestamp: Date.now() + 3600000, secondsRemaining: 3600, status: 'scheduled', cycleId: 'stand-1' },
    { type: 'walking', nextDueTimestamp: Date.now() + 5400000, secondsRemaining: 5400, status: 'scheduled', cycleId: 'walk-1' },
  ],
};

declare global {
  interface Window {
    screenCareApi?: {
      getState: () => Promise<AppStateSnapshot>;
      updateSettings: (settings: UserSettings) => Promise<AppStateSnapshot | void>;
      pause: (minutes?: number) => Promise<void>;
      resume: () => Promise<void>;
      resetAllData: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      closeWindow: () => Promise<void>;
      stopApplication: () => Promise<void>;
      getDatabasePath: () => Promise<string>;
      previewNotification?: (type: ReminderType) => Promise<any>;
      onStateUpdate: (callback: (state: AppStateSnapshot) => void) => () => void;
    };
  }
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [state, setState] = useState<AppStateSnapshot>(FALLBACK_STATE);
  const [databasePath, setDatabasePath] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (window.screenCareApi) {
      window.screenCareApi.getState().then((snap) => {
        setState(snap);
        if (snap.settings.theme === 'light') setTheme('light');
      });

      window.screenCareApi.getDatabasePath().then((p) => setDatabasePath(p));

      const unsubState = window.screenCareApi.onStateUpdate((snap) => {
        setState(snap);
      });

      return () => {
        unsubState();
      };
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (window.screenCareApi) {
      window.screenCareApi.updateSettings({ ...state.settings, theme: nextTheme });
    }
  };

  const handlePause = async (minutes?: number) => {
    if (window.screenCareApi) {
      await window.screenCareApi.pause(minutes);
    }
  };

  const handleResume = async () => {
    if (window.screenCareApi) {
      await window.screenCareApi.resume();
    }
  };

  // Saves through the main process and immediately renders the authoritative snapshot it returns
  // (validated settings + recalculated countdowns), instead of waiting for the next periodic update.
  const handleSaveSettings = async (newSettings: UserSettings): Promise<AppStateSnapshot | null> => {
    if (!window.screenCareApi) return null;
    const snap = await window.screenCareApi.updateSettings(newSettings);
    if (snap) {
      setState(snap);
      return snap;
    }
    const fresh = await window.screenCareApi.getState();
    setState(fresh);
    return fresh;
  };

  const handleResetData = async () => {
    if (window.screenCareApi) {
      await window.screenCareApi.resetAllData();
    }
  };

  const handleMinimizeToTray = async () => {
    if (window.screenCareApi) {
      await window.screenCareApi.minimizeToTray();
    }
  };

  return (
    <div className="app-container">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        state={state}
        onPause={handlePause}
        onResume={handleResume}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        onMinimizeToTray={handleMinimizeToTray}
      />

      <main className="main-content">
        {currentTab === 'overview' && (
          <Dashboard
            state={state}
            onPause={handlePause}
            onResume={handleResume}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsView
            settings={state.settings}
            onSaveSettings={handleSaveSettings}
            onResetAllData={handleResetData}
            databasePath={databasePath}
          />
        )}
      </main>
    </div>
  );
};
