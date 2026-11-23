import Dexie, { type EntityTable } from 'dexie';
import type { Card, ReviewLog, Word } from '../domain/types';

export interface StoredReviewLog extends ReviewLog {
  id?: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export const SCHEMA_VERSION = 1;

export class VocabularyDb extends Dexie {
  cards!: EntityTable<Card, 'wordId'>;
  reviewLogs!: EntityTable<StoredReviewLog, 'id'>;
  customWords!: EntityTable<Word, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'vocabulary-trainer') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      cards: 'wordId, due, state',
      reviewLogs: '++id, wordId, reviewedAt',
      customWords: 'id',
      settings: 'key',
    });
  }
}
