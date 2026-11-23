import { localDayNumber } from './stats';
import {
  CEFR_LEVELS,
  type Card,
  type CefrLevel,
  type Rating,
  type ReviewLog,
  type StudySettings,
} from './types';

export interface SessionPlan {
  /** Word ids in the order they should be shown. */
  queue: string[];
  dueCount: number;
  newCount: number;
}

/**
 * Builds today's study queue:
 * 1. cards already studied and due now (earliest due first);
 * 2. new words: stored cards still in state "new" (e.g. custom words) first, then words of the
 *    chosen level never studied before, until the daily limit is reached.
 * New words already introduced today count toward the limit.
 */
export function buildSession(
  now: Date,
  cards: Card[],
  candidateNewWordIds: string[],
  settings: Pick<StudySettings, 'newWordsPerDay'>,
  newWordsIntroducedToday = 0,
): SessionPlan {
  const known = new Set(cards.map((c) => c.wordId));
  const due = cards
    .filter((c) => c.state !== 'new' && c.due.getTime() <= now.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map((c) => c.wordId);

  const storedNew = cards.filter((c) => c.state === 'new').map((c) => c.wordId);
  const neverStudied = candidateNewWordIds.filter((id) => !known.has(id));
  const remainingNew = Math.max(0, settings.newWordsPerDay - newWordsIntroducedToday);
  const fresh = [...storedNew, ...neverStudied].slice(0, remainingNew);

  return { queue: [...due, ...fresh], dueCount: due.length, newCount: fresh.length };
}

/** Number of distinct words whose first ever review happened today (learner's local day). */
export function countNewWordsIntroducedToday(logs: ReviewLog[], now: Date): number {
  const firstReviewDay = new Map<string, number>();
  for (const log of logs) {
    const day = localDayNumber(log.reviewedAt);
    const seen = firstReviewDay.get(log.wordId);
    if (seen === undefined || day < seen) firstReviewDay.set(log.wordId, day);
  }
  const today = localDayNumber(now);
  return [...firstReviewDay.values()].filter((day) => day === today).length;
}

/** A forgotten card goes back to the end of the current session; others leave the queue. */
export function advanceQueue(queue: string[], wordId: string, rating: Rating): string[] {
  const index = queue.indexOf(wordId);
  if (index === -1) return queue;
  const rest = [...queue.slice(0, index), ...queue.slice(index + 1)];
  return rating === 'again' ? [...rest, wordId] : rest;
}

/** CEFR level encoded in a word id ("a1:cat:noun" → "A1"); undefined for custom words. */
export function levelOfWordId(wordId: string): CefrLevel | undefined {
  const prefix = wordId.split(':')[0].toUpperCase();
  return (CEFR_LEVELS as readonly string[]).includes(prefix) ? (prefix as CefrLevel) : undefined;
}

/** Word files to load: the chosen level plus the levels of words already studied, if published. */
export function levelsToLoad(
  chosen: CefrLevel,
  cards: Card[],
  available: readonly CefrLevel[],
): CefrLevel[] {
  const levels = new Set<CefrLevel>([chosen]);
  for (const c of cards) {
    const level = levelOfWordId(c.wordId);
    if (level) levels.add(level);
  }
  return [...levels].filter((l) => available.includes(l));
}

/** Today's plan from stored progress. Cards whose word data is no longer available are left out. */
export function planToday(
  now: Date,
  cards: Card[],
  wordIds: ReadonlySet<string>,
  candidateNewWordIds: string[],
  settings: Pick<StudySettings, 'newWordsPerDay'>,
  logs: ReviewLog[],
): SessionPlan {
  return buildSession(
    now,
    cards.filter((c) => wordIds.has(c.wordId)),
    candidateNewWordIds,
    settings,
    countNewWordsIntroducedToday(logs, now),
  );
}

/** Whether a word is studied today, or waits (e.g. a custom word added after the daily limit). */
export function isInTodaysQueue(plan: SessionPlan, wordId: string): boolean {
  return plan.queue.includes(wordId);
}
