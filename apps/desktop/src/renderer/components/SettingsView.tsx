import React, { useState } from 'react';
import { UserSettings, DEFAULT_SETTINGS, AppStateSnapshot } from '@shared/types';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => Promise<AppStateSnapshot | null | void> | void;
  onResetAllData: () => void;
  databasePath?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetAllData,
  databasePath,
}) => {
  // Local settings object
  const [localSettings, setLocalSettings] = useState<UserSettings>(() =>
    JSON.parse(JSON.stringify(settings || DEFAULT_SETTINGS))
  );

  // Dedicated string state for all numeric inputs to allow natural typing/backspacing without auto-revert
  const [eyeIntervalStr, setEyeIntervalStr] = useState<string>(() =>
    String(settings.eyeBreak?.intervalMinutes || 20)
  );
  const [postureIntervalStr, setPostureIntervalStr] = useState<string>(() =>
    String(settings.postureStretch?.intervalMinutes || 45)
  );
  const [standIntervalStr, setStandIntervalStr] = useState<string>(() =>
    String(settings.standMove?.intervalMinutes || 60)
  );
  const [walkIntervalStr, setWalkIntervalStr] = useState<string>(() =>
    String(settings.walking?.intervalMinutes || 90)
  );
  const [idleThresholdStr, setIdleThresholdStr] = useState<string>(() =>
    String(settings.idleThresholdMinutes || 3)
  );
  const [goalHoursStr, setGoalHoursStr] = useState<string>(() =>
    String(settings.dailyScreenTimeGoalHours || 6)
  );
  const initialAdaptive = settings.adaptive || DEFAULT_SETTINGS.adaptive;
  const [longAbsenceStr, setLongAbsenceStr] = useState<string>(() => String(initialAdaptive.longAbsenceMinutes));
  const [settlingStr, setSettlingStr] = useState<string>(() => String(initialAdaptive.settlingMinutes));
  const [nearlyDueStr, setNearlyDueStr] = useState<string>(() => String(initialAdaptive.nearlyDuePercent));
  const [groupingWindowStr, setGroupingWindowStr] = useState<string>(() => String(initialAdaptive.groupingWindowSeconds));

  const [saveStatus, setSaveStatus] = useState<string>('');

  const flashStatus = (message: string) => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  /** Re-sync every local field from the authoritative settings the main process actually applied. */
  const syncFromAuthoritative = (applied: UserSettings) => {
    setLocalSettings(JSON.parse(JSON.stringify(applied)));
    setEyeIntervalStr(String(applied.eyeBreak.intervalMinutes));
    setPostureIntervalStr(String(applied.postureStretch.intervalMinutes));
    setStandIntervalStr(String(applied.standMove.intervalMinutes));
    setWalkIntervalStr(String(applied.walking.intervalMinutes));
    setIdleThresholdStr(String(applied.idleThresholdMinutes));
    setGoalHoursStr(String(applied.dailyScreenTimeGoalHours));
    const a = applied.adaptive || DEFAULT_SETTINGS.adaptive;
    setLongAbsenceStr(String(a.longAbsenceMinutes));
    setSettlingStr(String(a.settlingMinutes));
    setNearlyDueStr(String(a.nearlyDuePercent));
    setGroupingWindowStr(String(a.groupingWindowSeconds));
  };

  const persist = async (next: UserSettings, successMessage: string) => {
    try {
      const snap = await onSaveSettings(next);
      if (snap && (snap as AppStateSnapshot).settings) {
        syncFromAuthoritative((snap as AppStateSnapshot).settings);
      }
      flashStatus(successMessage);
    } catch (err) {
      console.error('Saving preferences failed:', err);
      flashStatus('Could not save preferences — please try again.');
    }
  };

  const handleToggle = (path: string, checked: boolean) => {
    setLocalSettings((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let target = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (target[parts[i]] === undefined) {
          target[parts[i]] = parts[i] === 'adaptive' ? { ...DEFAULT_SETTINGS.adaptive } : {};
        }
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = checked;
      return copy;
    });
  };

  const handlePauseToggle = (path: string, paused: boolean) => {
    const copy = JSON.parse(JSON.stringify(localSettings));
    const parts = path.split('.');
    let target: any = copy;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = paused;
    // Pause/resume applies immediately, but must not silently apply unsaved interval edits
    // or overwrite settings changed elsewhere (e.g. theme): start from the latest applied settings.
    const base = JSON.parse(JSON.stringify(settings || DEFAULT_SETTINGS));
    const reminderKey = parts[0] as 'eyeBreak' | 'postureStretch' | 'standMove' | 'walking';
    base[reminderKey].paused = paused;
    setLocalSettings(copy);
    void (async () => {
      try {
        await onSaveSettings(base);
        flashStatus(paused ? 'Reminder paused' : 'Reminder resumed');
      } catch (err) {
        console.error('Pause toggle failed:', err);
        flashStatus('Could not update reminder — please try again.');
      }
    })();
  };

  const handleStopApplication = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to stop ScreenCare?\n\nThis will completely close ScreenCare and terminate all background processes from Windows Task Manager.'
    );
    if (confirmed) {
      if (window.screenCareApi && (window.screenCareApi as any).stopApplication) {
        await (window.screenCareApi as any).stopApplication();
      } else {
        window.close();
      }
    }
  };

  const handleSave = () => {
    const eyeMin = Math.max(1, parseInt(eyeIntervalStr, 10) || 1);
    const postureMin = Math.max(1, parseInt(postureIntervalStr, 10) || 1);
    const standMin = Math.max(1, parseInt(standIntervalStr, 10) || 1);
    const walkMin = Math.max(1, parseInt(walkIntervalStr, 10) || 1);
    const idleMin = Math.max(1, parseInt(idleThresholdStr, 10) || 3);
    const goalHrs = Math.max(1, parseInt(goalHoursStr, 10) || 6);

    // Normalize input string display
    setEyeIntervalStr(String(eyeMin));
    setPostureIntervalStr(String(postureMin));
    setStandIntervalStr(String(standMin));
    setWalkIntervalStr(String(walkMin));
    setIdleThresholdStr(String(idleMin));
    setGoalHoursStr(String(goalHrs));

    const parseOr = (str: string, fallback: number) => {
      const n = parseInt(str, 10);
      return Number.isFinite(n) ? n : fallback;
    };
    const localAdaptive = localSettings.adaptive || DEFAULT_SETTINGS.adaptive;
    const adaptive = {
      enabled: localAdaptive.enabled,
      learnFromPatterns: localAdaptive.learnFromPatterns,
      longAbsenceMinutes: Math.max(2, parseOr(longAbsenceStr, localAdaptive.longAbsenceMinutes)),
      settlingMinutes: Math.max(0, parseOr(settlingStr, localAdaptive.settlingMinutes)),
      nearlyDuePercent: Math.max(5, parseOr(nearlyDueStr, localAdaptive.nearlyDuePercent)),
      groupingWindowSeconds: Math.max(0, parseOr(groupingWindowStr, localAdaptive.groupingWindowSeconds)),
    };
    setLongAbsenceStr(String(adaptive.longAbsenceMinutes));
    setSettlingStr(String(adaptive.settlingMinutes));
    setNearlyDueStr(String(adaptive.nearlyDuePercent));
    setGroupingWindowStr(String(adaptive.groupingWindowSeconds));

    // Start from the LATEST applied settings and overlay only the fields this form edits, so stale local
    // state can never overwrite values changed elsewhere (theme from the navbar, per-reminder pause, …).
    const applied: UserSettings = JSON.parse(JSON.stringify(settings || DEFAULT_SETTINGS));
    const overlay = (key: 'eyeBreak' | 'postureStretch' | 'standMove' | 'walking', minutes: number) => ({
      ...applied[key],
      enabled: localSettings[key].enabled,
      soundEnabled: localSettings[key].soundEnabled,
      intervalMinutes: minutes,
    });
    const finalSettings: UserSettings = {
      ...applied,
      eyeBreak: overlay('eyeBreak', eyeMin),
      postureStretch: overlay('postureStretch', postureMin),
      standMove: overlay('standMove', standMin),
      walking: overlay('walking', walkMin),
      startAtLogin: localSettings.startAtLogin,
      minimizeToTray: localSettings.minimizeToTray,
      devTestMode: localSettings.devTestMode,
      idleThresholdMinutes: idleMin,
      dailyScreenTimeGoalHours: goalHrs,
      adaptive,
    };

    setLocalSettings(finalSettings);
    void persist(finalSettings, 'Preferences saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Reset all ScreenCare settings and historical logs?')) {
      onResetAllData();
      setEyeIntervalStr('20');
      setPostureIntervalStr('45');
      setStandIntervalStr('60');
      setWalkIntervalStr('90');
      setIdleThresholdStr('3');
      setGoalHoursStr('6');
      setLongAbsenceStr(String(DEFAULT_SETTINGS.adaptive.longAbsenceMinutes));
      setSettlingStr(String(DEFAULT_SETTINGS.adaptive.settlingMinutes));
      setNearlyDueStr(String(DEFAULT_SETTINGS.adaptive.nearlyDuePercent));
      setGroupingWindowStr(String(DEFAULT_SETTINGS.adaptive.groupingWindowSeconds));
      setLocalSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
      setSaveStatus('All application data reset.');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Preferences & Schedules</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Configure reminder frequencies and background monitoring behavior.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveStatus && (
            <span style={{ fontSize: 13, color: 'var(--accent-emerald-light)', fontWeight: 600 }}>{saveStatus}</span>
          )}
          <button className="btn btn-primary" onClick={handleSave} type="button">
            Save Preferences
          </button>
        </div>
      </div>

      {/* Reminder Schedules Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Reminder Intervals</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {/* Eye Break */}
          <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>👁️ Eye Rest (20-20-20)</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={localSettings.eyeBreak.enabled}
                  onChange={(e) => handleToggle('eyeBreak.enabled', e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={eyeIntervalStr}
                onChange={(e) => setEyeIntervalStr(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: localSettings.eyeBreak.paused ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  }}
                >
                  {localSettings.eyeBreak.paused ? '⏸ Paused' : '✓ Active'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handlePauseToggle('eyeBreak.paused', !localSettings.eyeBreak.paused)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  background: localSettings.eyeBreak.paused ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${localSettings.eyeBreak.paused ? '#eab308' : 'var(--border-subtle)'}`,
                  color: localSettings.eyeBreak.paused ? '#fde047' : 'var(--text-secondary)',
                }}
              >
                {localSettings.eyeBreak.paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>

          {/* Posture Stretch */}
          <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>🧘 Posture & Spine</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={localSettings.postureStretch.enabled}
                  onChange={(e) => handleToggle('postureStretch.enabled', e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={postureIntervalStr}
                onChange={(e) => setPostureIntervalStr(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: localSettings.postureStretch.paused ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  }}
                >
                  {localSettings.postureStretch.paused ? '⏸ Paused' : '✓ Active'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handlePauseToggle('postureStretch.paused', !localSettings.postureStretch.paused)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  background: localSettings.postureStretch.paused ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${localSettings.postureStretch.paused ? '#eab308' : 'var(--border-subtle)'}`,
                  color: localSettings.postureStretch.paused ? '#fde047' : 'var(--text-secondary)',
                }}
              >
                {localSettings.postureStretch.paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>

          {/* Stand & Move */}
          <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>🚶 Stand & Stretch</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={localSettings.standMove.enabled}
                  onChange={(e) => handleToggle('standMove.enabled', e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="240"
                value={standIntervalStr}
                onChange={(e) => setStandIntervalStr(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: localSettings.standMove.paused ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  }}
                >
                  {localSettings.standMove.paused ? '⏸ Paused' : '✓ Active'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handlePauseToggle('standMove.paused', !localSettings.standMove.paused)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  background: localSettings.standMove.paused ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${localSettings.standMove.paused ? '#eab308' : 'var(--border-subtle)'}`,
                  color: localSettings.standMove.paused ? '#fde047' : 'var(--text-secondary)',
                }}
              >
                {localSettings.standMove.paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>

          {/* Walking Refresh */}
          <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>🌿 Walking Refresh</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={localSettings.walking.enabled}
                  onChange={(e) => handleToggle('walking.enabled', e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={walkIntervalStr}
                onChange={(e) => setWalkIntervalStr(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: localSettings.walking.paused ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  }}
                >
                  {localSettings.walking.paused ? '⏸ Paused' : '✓ Active'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handlePauseToggle('walking.paused', !localSettings.walking.paused)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  background: localSettings.walking.paused ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${localSettings.walking.paused ? '#eab308' : 'var(--border-subtle)'}`,
                  color: localSettings.walking.paused ? '#fde047' : 'var(--text-secondary)',
                }}
              >
                {localSettings.walking.paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Startup & Background Behavior */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Background & System Behavior</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localSettings.startAtLogin}
              onChange={(e) => handleToggle('startAtLogin', e.target.checked)}
            />
            <span>Start ScreenCare on Windows login</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localSettings.minimizeToTray}
              onChange={(e) => handleToggle('minimizeToTray', e.target.checked)}
            />
            <span>Minimize to system tray on close or minimize</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localSettings.eyeBreak.soundEnabled}
              onChange={(e) => handleToggle('eyeBreak.soundEnabled', e.target.checked)}
            />
            <span>Play subtle audio chime with notifications</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={localSettings.devTestMode}
              onChange={(e) => handleToggle('devTestMode', e.target.checked)}
            />
            <span style={{ color: localSettings.devTestMode ? 'var(--accent-amber)' : 'inherit' }}>
              ⚡ Rapid Test Mode (accelerated 20s–60s intervals)
            </span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 4 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Inactivity Idle Detection Threshold (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={idleThresholdStr}
              onChange={(e) => setIdleThresholdStr(e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              Stops screen-time accumulation after this much inactivity.
            </span>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Daily Screen Time Goal (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="16"
              value={goalHoursStr}
              onChange={(e) => setGoalHoursStr(e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              Reference threshold for daily active screen time.
            </span>
          </div>
        </div>
      </div>

      {/* Adaptive Reminders */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Adaptive Reminders</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            Uses only lock, sleep and inactivity timing on this computer. Your intervals above are never changed —
            this only decides when a due reminder is shown, and combines compatible reminders into one break.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={(localSettings.adaptive || DEFAULT_SETTINGS.adaptive).enabled}
              onChange={(e) => handleToggle('adaptive.enabled', e.target.checked)}
            />
            <span>Smart return-from-break & grouping</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={(localSettings.adaptive || DEFAULT_SETTINGS.adaptive).learnFromPatterns}
              onChange={(e) => handleToggle('adaptive.learnFromPatterns', e.target.checked)}
            />
            <span>Learn timing from my lock / idle patterns (stored locally)</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Long absence after (Minutes)
            </label>
            <input type="number" min="2" max="240" value={longAbsenceStr} onChange={(e) => setLongAbsenceStr(e.target.value)} style={{ width: '100%' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              Shorter absences keep the exact remaining countdown.
            </span>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Settling period after a long absence (Minutes)
            </label>
            <input type="number" min="0" max="30" value={settlingStr} onChange={(e) => setSettlingStr(e.target.value)} style={{ width: '100%' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              Nearly-due reminders wait this long (never longer than their own interval).
            </span>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              “Nearly due” threshold (% of each reminder's interval)
            </label>
            <input type="number" min="5" max="50" value={nearlyDueStr} onChange={(e) => setNearlyDueStr(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Combine reminders due within (Seconds)
            </label>
            <input type="number" min="0" max="600" value={groupingWindowStr} onChange={(e) => setGroupingWindowStr(e.target.value)} style={{ width: '100%' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              Also capped at 10% of the waiting reminder's interval. 0 turns look-ahead off.
            </span>
          </div>
        </div>
      </div>

      {/* Local Storage & Privacy */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Local Storage & Privacy</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          All data is stored locally in plain JSON format. No accounts, zero analytics, zero telemetry, and zero network calls.
        </p>
        <code
          style={{
            padding: '8px 12px',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            wordBreak: 'break-all',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {databasePath || 'Local file storage active'}
        </code>
        <div style={{ marginTop: 4 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{ color: 'var(--accent-rose)' }} type="button">
            Reset All Application Data
          </button>
        </div>
      </div>

      {/* Stop Application / Complete Exit */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: '1px solid rgba(239, 68, 68, 0.4)',
          background: 'rgba(239, 68, 68, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-rose)' }}>
              Stop Application
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 520, lineHeight: 1.4 }}>
              Completely terminate ScreenCare and all background monitoring. ScreenCare will exit immediately and be completely removed from Windows Task Manager.
            </p>
          </div>
          <button
            className="btn"
            type="button"
            onClick={handleStopApplication}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              padding: '9px 18px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
            }}
          >
            🛑 Stop ScreenCare (Exit)
          </button>
        </div>
      </div>
    </div>
  );
};
