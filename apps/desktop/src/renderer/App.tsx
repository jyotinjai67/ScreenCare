import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BreakModal } from './components/BreakModal';
import { StretchLibrary } from './components/StretchLibrary';
import { SettingsView } from './components/SettingsView';
import { PrivacyView } from './components/PrivacyView';
import { AppStateSnapshot, ReminderType, UserSettings, DEFAULT_SETTINGS } from '@shared/types';
import { getExerciseForReminder } from '@shared/stretches';

const FALLBACK_STATE: AppStateSnapshot = {
  activeScreenSeconds: 3600,
  currentContinuousSeconds: 1200,
  isIdle: false,
  isPaused: false,
  todaySummary: {
    date: new Date().toISOString().split('T')[0],
    totalScreenSeconds: 3600,
    totalIdleSeconds: 300,
    eyeBreaksCompleted: 3,
    movementBreaksCompleted: 1,
    remindersSkipped: 0,
    remindersSnoozed: 1,
    wellnessScore: 84,
  },
  recentLogs: [
    { id: '1', type: 'eye-break', timestamp: Date.now() - 3600000, action: 'completed', durationSeconds: 20 },
    { id: '2', type: 'posture-stretch', timestamp: Date.now() - 1800000, action: 'completed', durationSeconds: 45 },
  ],
  settings: DEFAULT_SETTINGS,
  activeBreak: null,
  nextReminders: [
    { type: 'eye-break', nextDueTimestamp: Date.now() + 450000, secondsRemaining: 450, status: 'scheduled', cycleId: 'eye-1' },
    { type: 'posture-stretch', nextDueTimestamp: Date.now() + 1200000, secondsRemaining: 1200, status: 'scheduled', cycleId: 'posture-1' },
    { type: 'stand-move', nextDueTimestamp: Date.now() + 2400000, secondsRemaining: 2400, status: 'scheduled', cycleId: 'stand-1' },
    { type: 'walking', nextDueTimestamp: Date.now() + 4200000, secondsRemaining: 4200, status: 'scheduled', cycleId: 'walk-1' },
  ],
};

declare global {
  interface Window {
    screenCareApi?: {
      getState: () => Promise<AppStateSnapshot>;
      updateSettings: (settings: UserSettings) => Promise<void>;
      startBreak: (type: ReminderType) => Promise<any>;
      completeBreak: (type: ReminderType, durationSeconds?: number) => Promise<void>;
      snoozeBreak: (type: ReminderType) => Promise<void>;
      skipBreak: (type: ReminderType) => Promise<void>;
      pause: (minutes?: number) => Promise<void>;
      resume: () => Promise<void>;
      resetAllData: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      closeWindow: () => Promise<void>;
      getDatabasePath: () => Promise<string>;
      onStateUpdate: (callback: (state: AppStateSnapshot) => void) => () => void;
      onReminderTriggered: (callback: (event: any) => void) => () => void;
      onOpenBreakScreen: (callback: (data: any) => void) => () => void;
    };
  }
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [state, setState] = useState<AppStateSnapshot>(FALLBACK_STATE);
  const [databasePath, setDatabasePath] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [localActiveBreak, setLocalActiveBreak] = useState<any>(null);

  // Initialize and connect to Electron Main process
  useEffect(() => {
    if (window.screenCareApi) {
      window.screenCareApi.getState().then((snap) => {
        setState(snap);
        if (snap.settings.theme === 'light') setTheme('light');
      });

      window.screenCareApi.getDatabasePath().then((p) => setDatabasePath(p));

      const unsubState = window.screenCareApi.onStateUpdate((snap) => {
        setState(snap);
        if (snap.activeBreak) {
          setLocalActiveBreak(snap.activeBreak);
        }
      });

      const unsubRemind = window.screenCareApi.onReminderTriggered((event) => {
        setLocalActiveBreak((prev: any) => {
          if (prev && prev.status === 'active') return prev;
          const ex = event.exercise || getExerciseForReminder(event.type);
          return {
            type: event.type,
            exercise: ex,
            remainingSeconds: ex.durationSeconds || 20,
            totalSeconds: ex.durationSeconds || 20,
            status: 'active',
            cycleId: event.cycleId,
          };
        });
      });

      const unsubOpen = window.screenCareApi.onOpenBreakScreen((data) => {
        const ex = data.exercise || getExerciseForReminder(data.type);
        setLocalActiveBreak({
          type: data.type,
          exercise: ex,
          remainingSeconds: ex.durationSeconds || 20,
          totalSeconds: ex.durationSeconds || 20,
          status: 'active',
          cycleId: data.cycleId,
        });
      });

      return () => {
        unsubState();
        unsubRemind();
        unsubOpen();
      };
    }
  }, []);

  // Theme application
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

  const handleStartBreak = async (type: ReminderType) => {
    if (window.screenCareApi) {
      const active = await window.screenCareApi.startBreak(type);
      setLocalActiveBreak(active);
    } else {
      const ex = getExerciseForReminder(type);
      setLocalActiveBreak({
        type,
        exercise: ex,
        remainingSeconds: ex.durationSeconds || 20,
        totalSeconds: ex.durationSeconds || 20,
        status: 'active',
      });
    }
  };

  const handleCompleteBreak = async () => {
    const breakObj = localActiveBreak || state.activeBreak;
    if (breakObj && window.screenCareApi) {
      await window.screenCareApi.completeBreak(breakObj.type, breakObj.totalSeconds);
    }
    setLocalActiveBreak(null);
  };

  const handleSnoozeBreak = async () => {
    const breakObj = localActiveBreak || state.activeBreak;
    if (breakObj && window.screenCareApi) {
      await window.screenCareApi.snoozeBreak(breakObj.type);
    }
    setLocalActiveBreak(null);
  };

  const handleSkipBreak = async () => {
    const breakObj = localActiveBreak || state.activeBreak;
    if (breakObj && window.screenCareApi) {
      await window.screenCareApi.skipBreak(breakObj.type);
    }
    setLocalActiveBreak(null);
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

  const handleSaveSettings = async (newSettings: UserSettings) => {
    if (window.screenCareApi) {
      await window.screenCareApi.updateSettings(newSettings);
    }
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

  const activeBreakDisplay = localActiveBreak || state.activeBreak;

  return (
    <div className="app-container">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        state={state}
        onTakeQuickBreak={() => handleStartBreak('eye-break')}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        onMinimizeToTray={handleMinimizeToTray}
      />

      <main className="main-content">
        {currentTab === 'dashboard' && (
          <Dashboard
            state={state}
            onStartBreak={handleStartBreak}
            onPause={handlePause}
            onResume={handleResume}
          />
        )}
        {currentTab === 'stretches' && (
          <StretchLibrary onStartRoutine={handleStartBreak} />
        )}
        {currentTab === 'settings' && (
          <SettingsView
            settings={state.settings}
            onSaveSettings={handleSaveSettings}
            onResetAllData={handleResetData}
            databasePath={databasePath}
          />
        )}
        {currentTab === 'privacy' && (
          <PrivacyView databasePath={databasePath} onResetData={handleResetData} />
        )}
      </main>

      {/* Break Overlay Screen */}
      {activeBreakDisplay && activeBreakDisplay.status === 'active' && (
        <BreakModal
          activeBreak={activeBreakDisplay}
          onComplete={handleCompleteBreak}
          onSnooze={handleSnoozeBreak}
          onSkip={handleSkipBreak}
        />
      )}
    </div>
  );
};
