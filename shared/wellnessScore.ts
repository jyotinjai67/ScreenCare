import { BreakLogEntry } from './types';

export interface ScoreBreakdown {
  score: number;
  rating: 'Exceptional' | 'Great' | 'Fair' | 'Needs Attention';
  breakAdherencePct: number;
  eyeCareIndex: number;
  movementIndex: number;
  screenTimeStatus: 'Optimal' | 'Acceptable' | 'High' | 'Excessive';
  recommendation: string;
}

export function calculateWellnessScore(
  totalScreenSeconds: number,
  goalHours: number,
  logs: BreakLogEntry[]
): ScoreBreakdown {
  const completedEye = logs.filter((l) => l.action === 'completed' && l.type === 'eye-break').length;
  const completedMove = logs.filter(
    (l) => l.action === 'completed' && (l.type === 'stand-move' || l.type === 'walking' || l.type === 'posture-stretch')
  ).length;
  const skipped = logs.filter((l) => l.action === 'skipped').length;

  const totalOffered = completedEye + completedMove + skipped;
  const adherence = totalOffered > 0 ? (completedEye + completedMove) / totalOffered : 1;
  const breakAdherencePct = Math.round(adherence * 100);

  const screenHours = totalScreenSeconds / 3600;

  // Expected eye breaks: ~2 per active hour
  const expectedEyeBreaks = Math.max(1, Math.round(screenHours * 2.0));
  const eyeCareIndex = Math.min(100, Math.round((completedEye / expectedEyeBreaks) * 100));

  // Expected movement breaks: ~1 per active hour
  const expectedMovement = Math.max(1, Math.round(screenHours * 1.0));
  const movementIndex = Math.min(100, Math.round((completedMove / expectedMovement) * 100));

  let screenScore = 30;
  let screenTimeStatus: ScoreBreakdown['screenTimeStatus'] = 'Optimal';

  if (screenHours <= goalHours) {
    screenScore = 30;
    screenTimeStatus = 'Optimal';
  } else if (screenHours <= goalHours + 1.5) {
    screenScore = 22;
    screenTimeStatus = 'Acceptable';
  } else if (screenHours <= goalHours + 3.0) {
    screenScore = 14;
    screenTimeStatus = 'High';
  } else {
    screenScore = 5;
    screenTimeStatus = 'Excessive';
  }

  const rawScore = screenScore + (eyeCareIndex / 100) * 40 + (movementIndex / 100) * 30;
  const finalScore = Math.max(10, Math.min(100, Math.round(rawScore)));

  let rating: ScoreBreakdown['rating'] = 'Fair';
  let recommendation = 'Keep taking regular short breaks every 20-30 minutes.';

  if (finalScore >= 80) {
    rating = 'Exceptional';
    recommendation = 'Outstanding screen wellness routine! Your eyes and posture are well protected.';
  } else if (finalScore >= 65) {
    rating = 'Great';
    recommendation = 'Solid ergonomic balance. Try to honor movement breaks whenever prompted.';
  } else if (finalScore >= 50) {
    rating = 'Fair';
    recommendation = 'Several eye or stretch breaks were postponed. Stand up and reset your posture.';
  } else {
    rating = 'Needs Attention';
    recommendation = 'Prolonged static screen time detected. Step away, do eye palming, and take a 5-minute walk.';
  }

  return {
    score: finalScore,
    rating,
    breakAdherencePct,
    eyeCareIndex,
    movementIndex,
    screenTimeStatus,
    recommendation,
  };
}
