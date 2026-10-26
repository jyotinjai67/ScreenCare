import React, { useState } from 'react';
import { UserSettings } from '@shared/types';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetAllData: () => void;
  databasePath?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
  databasePath,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>({ ...settings });
  const [saveStatus, setSaveStatus] = useState<string>('');

  const handleChange = (path: string, value: any) => {
    setLocalSettings((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let target = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveStatus('Settings saved successfully!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete all historical logs and reset settings to default?')) {
      onResetAllData();
      setSaveStatus('All application data has been wiped.');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Configuration & Preferences</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Personalize intervals, sound notifications, quiet hours, and privacy controls.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveStatus && (
            <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>{saveStatus}</span>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>

      {/* Developer Test Mode Warning Box */}
      <div
        className="glass-card"
        style={{
          background: localSettings.devTestMode ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface)',
          borderColor: localSettings.devTestMode ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              ⚡ Developer Rapid Testing Mode
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Scales reminder intervals down to 20s–60s so you can rapidly verify timers, notifications, and popups.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localSettings.devTestMode}
              onChange={(e) => handleChange('devTestMode', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Enable Test Mode</span>
          </label>
        </div>
      </div>

      {/* Reminder Intervals Grid */}
      <div className="glass-card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Screen Break Schedules</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {/* Eye Break */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>👁️ 20-20-20 Eye Break</span>
              <input
                type="checkbox"
                checked={localSettings.eyeBreak.enabled}
                onChange={(e) => handleChange('eyeBreak.enabled', e.target.checked)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interval (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={localSettings.eyeBreak.intervalMinutes}
                  onChange={(e) => handleChange('eyeBreak.intervalMinutes', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duration (Seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="60"
                  value={localSettings.eyeBreak.durationSeconds}
                  onChange={(e) => handleChange('eyeBreak.durationSeconds', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Posture Stretch */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>🧘 Posture & Neck Stretch</span>
              <input
                type="checkbox"
                checked={localSettings.postureStretch.enabled}
                onChange={(e) => handleChange('postureStretch.enabled', e.target.checked)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interval (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={localSettings.postureStretch.intervalMinutes}
                  onChange={(e) => handleChange('postureStretch.intervalMinutes', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duration (Seconds)</label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={localSettings.postureStretch.durationSeconds}
                  onChange={(e) => handleChange('postureStretch.durationSeconds', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stand Up */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>🚶 Stand Up & Reset</span>
              <input
                type="checkbox"
                checked={localSettings.standMove.enabled}
                onChange={(e) => handleChange('standMove.enabled', e.target.checked)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interval (Minutes)</label>
                <input
                  type="number"
                  min="20"
                  max="240"
                  value={localSettings.standMove.intervalMinutes}
                  onChange={(e) => handleChange('standMove.intervalMinutes', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duration (Seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={localSettings.standMove.durationSeconds}
                  onChange={(e) => handleChange('standMove.durationSeconds', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Walking */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>🌿 Walking Refresh</span>
              <input
                type="checkbox"
                checked={localSettings.walking.enabled}
                onChange={(e) => handleChange('walking.enabled', e.target.checked)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interval (Minutes)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={localSettings.walking.intervalMinutes}
                  onChange={(e) => handleChange('walking.intervalMinutes', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Duration (Seconds)</label>
                <input
                  type="number"
                  min="60"
                  max="600"
                  value={localSettings.walking.durationSeconds}
                  onChange={(e) => handleChange('walking.durationSeconds', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System & General Options */}
      <div className="glass-card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>System & Ergonomic Options</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Daily Screen Time Goal (Hours)</label>
            <input
              type="number"
              min="1"
              max="16"
              value={localSettings.dailyScreenTimeGoalHours}
              onChange={(e) => handleChange('dailyScreenTimeGoalHours', Number(e.target.value))}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 10px',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Idle Inactivity Threshold (Minutes)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={localSettings.idleThresholdMinutes}
              onChange={(e) => handleChange('idleThresholdMinutes', Number(e.target.value))}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 10px',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Quiet Hours */}
          <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.12)', padding: 14, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>🌙 Quiet Hours (Do Not Disturb)</span>
              <input
                type="checkbox"
                checked={localSettings.quietHours.enabled}
                onChange={(e) => handleChange('quietHours.enabled', e.target.checked)}
              />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start Time</label>
                <input
                  type="time"
                  value={localSettings.quietHours.start}
                  onChange={(e) => handleChange('quietHours.start', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>End Time</label>
                <input
                  type="time"
                  value={localSettings.quietHours.end}
                  onChange={(e) => handleChange('quietHours.end', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Windows Startup & Tray */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={localSettings.startAtLogin}
                onChange={(e) => handleChange('startAtLogin', e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Launch ScreenCare at Windows Startup (Disabled by default)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={localSettings.minimizeToTray}
                onChange={(e) => handleChange('minimizeToTray', e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Minimize to System Tray when closing window</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={localSettings.eyeBreak.soundEnabled}
                onChange={(e) => handleChange('eyeBreak.soundEnabled', e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Enable gentle notification sounds</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={localSettings.viewingDistanceReminder}
                onChange={(e) => handleChange('viewingDistanceReminder', e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Remind about monitor viewing distance (50-70cm)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Local Storage & Wipe Data */}
      <div className="glass-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: '#fb7185' }}>
          Data Privacy & Local Storage
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          ScreenCare is strictly local-first. All configuration and break records are stored only on your personal
          machine at:
        </p>
        <code
          style={{
            display: 'block',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            marginBottom: 16,
            wordBreak: 'break-all',
          }}
        >
          {databasePath || 'Local App Data Folder (screencare-data.json)'}
        </code>
        <button className="btn btn-secondary" onClick={handleReset} style={{ color: '#fb7185', borderColor: '#fb7185' }}>
          🗑️ Delete All Local Data & Reset Defaults
        </button>
      </div>
    </div>
  );
};
