"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
    eyeBreak: {
        enabled: true,
        intervalMinutes: 20,
        durationSeconds: 20,
        snoozeMinutes: 5,
        soundEnabled: true,
    },
    postureStretch: {
        enabled: true,
        intervalMinutes: 45,
        durationSeconds: 45,
        snoozeMinutes: 10,
        soundEnabled: true,
    },
    standMove: {
        enabled: true,
        intervalMinutes: 60,
        durationSeconds: 60,
        snoozeMinutes: 10,
        soundEnabled: true,
    },
    walking: {
        enabled: true,
        intervalMinutes: 90,
        durationSeconds: 180, // 3 minutes
        snoozeMinutes: 15,
        soundEnabled: true,
    },
    viewingDistanceReminder: true,
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
    },
    dailyScreenTimeGoalHours: 6,
    idleThresholdMinutes: 3,
    startAtLogin: false,
    minimizeToTray: true,
    theme: 'system',
    devTestMode: false,
    cameraDistanceEnabled: false,
};
