export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Self-assessment after revealing the answer: Forgot / Hard / Remembered / Easy. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Word {
  id: string;
  headword: string;
  pos: string;
  level: CefrLevel | 'custom';
  ipa?: string;
  meaningVi?: string;
  definitionEn: string;
  examples: string[];
}

/**
 * Study progress of one word. `schedulerData` is owned by the Scheduler implementation,
 * so the rest of the app never depends on a specific spaced-repetition algorithm.
 */
export interface Card {
  wordId: string;
  due: Date;
  state: CardState;
  reps: number;
  lapses: number;
  lastReview?: Date;
  schedulerData: Record<string, unknown>;
}

export interface ReviewLog {
  wordId: string;
  rating: Rating;
  reviewedAt: Date;
}

export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'];

export const CARD_STATES: readonly CardState[] = ['new', 'learning', 'review', 'relearning'];

export type UiLanguage = 'vi' | 'en';

export interface StudySettings {
  level: CefrLevel;
  newWordsPerDay: number;
  uiLanguage: UiLanguage;
}

export const DEFAULT_SETTINGS: StudySettings = {
  level: 'A1',
  newWordsPerDay: 10,
  uiLanguage: 'vi',
};
