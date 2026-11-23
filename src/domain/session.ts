import type { Card, Rating } from './types';

export interface SessionPlan {
  /** Word ids in the order they should be shown. */
  queue: string[];
  dueCount: number;
  newCount: number;
}

/**
 * Builds today's study queue: due cards first (earliest due first), then new words
 * until the daily limit is reached. New words already introduced today count toward the limit.
 */
export function buildSession(
  now: Date,
  cards: Card[],
  candidateNewWordIds: string[],
  newWordsPerDay: number,
  newWordsIntroducedToday = 0,
): SessionPlan {
  const known = new Set(cards.map((c) => c.wordId));
  const due = cards
    .filter((c) => c.state !== 'new' && c.due.getTime() <= now.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map((c) => c.wordId);

  const remainingNew = Math.max(0, newWordsPerDay - newWordsIntroducedToday);
  const fresh = candidateNewWordIds.filter((id) => !known.has(id)).slice(0, remainingNew);

  return { queue: [...due, ...fresh], dueCount: due.length, newCount: fresh.length };
}

/** A forgotten card goes back to the end of the current session; others leave the queue. */
export function advanceQueue(queue: string[], wordId: string, rating: Rating): string[] {
  const rest = queue.filter((id, index) => !(id === wordId && index === queue.indexOf(wordId)));
  return rating === 'again' ? [...rest, wordId] : rest;
}
