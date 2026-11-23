import type { Card, CefrLevel, ReviewLog, Word } from '../domain/types';

export interface WordRepository {
  getWordsByLevel(level: CefrLevel): Promise<Word[]>;
}

export interface ProgressRepository {
  getCards(): Promise<Card[]>;
  saveCard(card: Card): Promise<void>;
  addReviewLog(log: ReviewLog): Promise<void>;
  getReviewLogs(): Promise<ReviewLog[]>;
  addCustomWord(word: Omit<Word, 'id' | 'level'>): Promise<Word>;
  getCustomWords(): Promise<Word[]>;
}
