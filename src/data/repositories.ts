import type { Card, CefrLevel, ReviewLog, StudySettings, Word } from '../domain/types';

export interface WordRepository {
  getWordsByLevel(level: CefrLevel): Promise<Word[]>;
}

export type NewCustomWord = Omit<Word, 'id' | 'level'>;

export interface ProgressRepository {
  getCards(): Promise<Card[]>;
  saveCard(card: Card): Promise<void>;
  addReviewLog(log: ReviewLog): Promise<void>;
  getReviewLogs(): Promise<ReviewLog[]>;
  /** Saves the word and its first card together, so the word enters the study queue (AC6). */
  addCustomWord(word: NewCustomWord, createCard: (wordId: string) => Card): Promise<Word>;
  getCustomWords(): Promise<Word[]>;
}

export interface SettingsRepository {
  getSettings(): Promise<StudySettings>;
  saveSettings(changes: Partial<StudySettings>): Promise<StudySettings>;
  getLastBackupAt(): Promise<Date | undefined>;
  markBackedUp(at: Date): Promise<void>;
}
