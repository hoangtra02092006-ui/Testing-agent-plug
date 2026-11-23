import type { Scheduler } from './scheduler';
import type { Card, Rating, ReviewLog } from './types';

/** Applies an answer: creates the card on first sight, schedules it and returns the log to store. */
export function answerCard(
  scheduler: Scheduler,
  existing: Card | undefined,
  wordId: string,
  rating: Rating,
  now: Date,
): { card: Card; log: ReviewLog } {
  const card = scheduler.review(existing ?? scheduler.createCard(wordId, now), rating, now);
  return { card, log: { wordId, rating, reviewedAt: now } };
}

const BACKUP_REMINDER_DAYS = 7;

/**
 * True when progress exists that has not been backed up for 7 days: counted from the last backup,
 * or from the first review when the learner never exported one.
 */
export function needsBackupReminder(
  firstReviewAt: Date | undefined,
  lastBackupAt: Date | undefined,
  now: Date,
): boolean {
  const since = lastBackupAt ?? firstReviewAt;
  if (!since) return false;
  return now.getTime() - since.getTime() > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}

export const MAX_NEW_WORDS_PER_DAY = 100;

/** Parses the "new words per day" field: a whole number from 1 to 100, otherwise null. */
export function parseNewWordsPerDay(input: string): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= MAX_NEW_WORDS_PER_DAY ? n : null;
}
