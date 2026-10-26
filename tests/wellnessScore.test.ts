import { describe, test, expect } from 'vitest';
import { calculateWellnessScore } from '../shared/wellnessScore';
import { BreakLogEntry } from '../shared/types';

describe('calculateWellnessScore', () => {
  test('returns high score for regular breaks and moderate screen time', () => {
    const logs: BreakLogEntry[] = [
      { id: '1', type: 'eye-break', timestamp: 1, action: 'completed', durationSeconds: 20 },
      { id: '2', type: 'eye-break', timestamp: 2, action: 'completed', durationSeconds: 20 },
      { id: '3', type: 'eye-break', timestamp: 3, action: 'completed', durationSeconds: 20 },
      { id: '4', type: 'posture-stretch', timestamp: 4, action: 'completed', durationSeconds: 45 },
      { id: '5', type: 'stand-move', timestamp: 5, action: 'completed', durationSeconds: 60 },
    ];

    const result = calculateWellnessScore(7200, 6, logs);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.rating).toBe('Exceptional');
    expect(result.breakAdherencePct).toBe(100);
    expect(result.screenTimeStatus).toBe('Optimal');
  });

  test('penalizes skipped breaks and excessive screen time', () => {
    const logs: BreakLogEntry[] = [
      { id: '1', type: 'eye-break', timestamp: 1, action: 'skipped', durationSeconds: 0 },
      { id: '2', type: 'stand-move', timestamp: 2, action: 'skipped', durationSeconds: 0 },
      { id: '3', type: 'walking', timestamp: 3, action: 'skipped', durationSeconds: 0 },
    ];

    const result = calculateWellnessScore(36000, 6, logs);
    expect(result.score).toBeLessThanOrEqual(45);
    expect(result.breakAdherencePct).toBe(0);
    expect(result.screenTimeStatus).toBe('Excessive');
    expect(result.rating).toBe('Needs Attention');
  });
});
