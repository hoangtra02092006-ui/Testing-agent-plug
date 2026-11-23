import { createEmptyCard, fsrs, Rating as FsrsRating, State, type Card as FsrsCard } from 'ts-fsrs';
import type { Card, CardState, Rating } from './types';

export interface Scheduler {
  createCard(wordId: string, now: Date): Card;
  review(card: Card, rating: Rating, now: Date): Card;
}

const RATING_MAP: Record<
  Rating,
  FsrsRating.Again | FsrsRating.Hard | FsrsRating.Good | FsrsRating.Easy
> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

const STATE_MAP: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

/** Spaced-repetition scheduler backed by FSRS (see docs/thiet-ke). */
export class FsrsScheduler implements Scheduler {
  private readonly engine;

  constructor(requestRetention = 0.9) {
    this.engine = fsrs({ request_retention: requestRetention, enable_fuzz: false });
  }

  createCard(wordId: string, now: Date): Card {
    return toCard(wordId, createEmptyCard(now));
  }

  review(card: Card, rating: Rating, now: Date): Card {
    const result = this.engine.next(toFsrsCard(card), now, RATING_MAP[rating]);
    return toCard(card.wordId, result.card);
  }
}

function toCard(wordId: string, fsrsCard: FsrsCard): Card {
  return {
    wordId,
    due: fsrsCard.due,
    state: STATE_MAP[fsrsCard.state],
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    lastReview: fsrsCard.last_review,
    schedulerData: {
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsed_days: fsrsCard.elapsed_days,
      scheduled_days: fsrsCard.scheduled_days,
      learning_steps: fsrsCard.learning_steps,
      state: fsrsCard.state,
    },
  };
}

function toFsrsCard(card: Card): FsrsCard {
  const data = card.schedulerData as Partial<FsrsCard>;
  return {
    ...createEmptyCard(card.due),
    ...data,
    due: card.due,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.lastReview,
  };
}
