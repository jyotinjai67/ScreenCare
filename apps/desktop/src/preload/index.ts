import { contextBridge, ipcRenderer } from 'electron';
import { ReminderType, UserSettings, AppStateSnapshot } from '../shared/types';

export const screenCareApi = {
  getState: (): Promise<AppStateSnapshot> => ipcRenderer.invoke('screencare:get-state'),
  updateSettings: (settings: UserSettings): Promise<void> =>
    ipcRenderer.invoke('screencare:update-settings', settings),
  startBreak: (type: ReminderType) => ipcRenderer.invoke('screencare:start-break', type),
  completeBreak: (type: ReminderType, durationSeconds?: number) =>
    ipcRenderer.invoke('screencare:complete-break', type, durationSeconds),
  snoozeBreak: (type: ReminderType) => ipcRenderer.invoke('screencare:snooze-break', type),
  skipBreak: (type: ReminderType) => ipcRenderer.invoke('screencare:skip-break', type),
  pause: (minutes?: number) => ipcRenderer.invoke('screencare:pause', minutes),
  resume: () => ipcRenderer.invoke('screencare:resume'),
  resetAllData: () => ipcRenderer.invoke('screencare:reset-all-data'),
  minimizeToTray: () => ipcRenderer.invoke('screencare:minimize-to-tray'),
  closeWindow: () => ipcRenderer.invoke('screencare:close-window'),
  getDatabasePath: () => ipcRenderer.invoke('screencare:get-database-path'),
  onStateUpdate: (callback: (state: AppStateSnapshot) => void) => {
    const handler = (_event: any, state: AppStateSnapshot) => callback(state);
    ipcRenderer.on('screencare:state-update', handler);
    return () => {
      ipcRenderer.removeListener('screencare:state-update', handler);
    };
  },
  onReminderTriggered: (callback: (event: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('screencare:reminder-triggered', handler);
    return () => {
      ipcRenderer.removeListener('screencare:reminder-triggered', handler);
    };
  },
};

contextBridge.exposeInMainWorld('screenCareApi', screenCareApi);