import type { ReviewLog } from './types';

export interface StudyStats {
  reviewed: number;
  /** Share of reviews not rated "again", 0..1. Null when there is nothing to measure. */
  accuracy: number | null;
  /** Consecutive local days with at least one review, ending today or yesterday. */
  streakDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day number, so a streak follows the learner's own midnight. */
export function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY_MS);
}

export function computeStats(logs: ReviewLog[], now: Date): StudyStats {
  const reviewed = logs.length;
  const accuracy =
    reviewed === 0 ? null : logs.filter((l) => l.rating !== 'again').length / reviewed;

  const days = new Set(logs.map((l) => localDayNumber(l.reviewedAt)));
  const today = localDayNumber(now);
  let cursor = days.has(today) ? today : today - 1;
  let streakDays = 0;
  while (days.has(cursor)) {
    streakDays += 1;
    cursor -= 1;
  }

  return { reviewed, accuracy, streakDays };
}

/** Logs of the session that started at `since`. */
export function logsSince(logs: ReviewLog[], since: Date): ReviewLog[] {
  return logs.filter((l) => l.reviewedAt.getTime() >= since.getTime());
}
