import { createEmptyCard, fsrs, Rating as FsrsRating, State, type Card as FsrsCard } from 'ts-fsrs';
import { RATINGS, type Card, type CardState, type Rating } from './types';

/** ts-fsrs default maximum interval (100 years). */
const MAX_STABILITY_DAYS = 36500;

export interface Scheduler {
  createCard(wordId: string, now: Date): Card;
  review(card: Card, rating: Rating, now: Date): Card;
  /** True when `card.schedulerData` is internally consistent and can be reviewed safely. */
  isValidCard(card: Card): boolean;
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

  isValidCard(card: Card): boolean {
    const d = card.schedulerData;
    const state = d.state;
    if (!Number.isInteger(state) || !((state as number) in STATE_MAP)) return false;
    if (STATE_MAP[state as State] !== card.state) return false;

    const finiteAtLeast = (v: unknown, min: number) =>
      typeof v === 'number' && Number.isFinite(v) && v >= min;
    if (!finiteAtLeast(d.elapsed_days, 0) || !finiteAtLeast(d.scheduled_days, 0)) return false;
    if (!Number.isInteger(d.learning_steps) || (d.learning_steps as number) < 0) return false;

    if (state !== State.New) {
      // FSRS memory model: stability > 0 (bounded by the maximum interval), difficulty in [1, 10].
      const stability = d.stability as number;
      const difficulty = d.difficulty as number;
      if (!finiteAtLeast(stability, Number.EPSILON) || stability > MAX_STABILITY_DAYS) return false;
      if (!finiteAtLeast(difficulty, 1) || difficulty > 10) return false;
    } else if (!finiteAtLeast(d.stability, 0) || !finiteAtLeast(d.difficulty, 0)) {
      return false;
    }

    // Final guard: every possible answer must produce a valid next due date.
    try {
      return RATINGS.every(
        (rating) => !Number.isNaN(this.review(card, rating, card.due).due.getTime()),
      );
    } catch {
      return false;
    }
  }

  review(card: Card, rating: Rating, now: Date): Card {
    // A device clock set backwards must not break reviews: never review before the last review.
    const at = card.lastReview && card.lastReview > now ? card.lastReview : now;
    const result = this.engine.next(toFsrsCard(card), at, RATING_MAP[rating]);
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
