import type { Card, ReviewLog, Word } from '../domain/types';
import { SCHEMA_VERSION, type SettingRow, type VocabularyDb } from './db';

export interface BackupFile {
  app: 'vocabulary-trainer';
  schemaVersion: number;
  exportedAt: string;
  cards: Card[];
  reviewLogs: ReviewLog[];
  customWords: Word[];
  settings: SettingRow[];
}

export async function exportBackup(db: VocabularyDb, now: Date): Promise<BackupFile> {
  const [cards, logs, customWords, settings] = await Promise.all([
    db.cards.toArray(),
    db.reviewLogs.toArray(),
    db.customWords.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: 'vocabulary-trainer',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    cards,
    reviewLogs: logs.map(({ wordId, rating, reviewedAt }) => ({ wordId, rating, reviewedAt })),
    customWords,
    settings,
  };
}

/** Parses a backup produced by exportBackup (after JSON round-trip). Throws on invalid input. */
export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.app !== 'vocabulary-trainer') {
    throw new Error('This file is not a vocabulary trainer backup.');
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version ${String(raw.schemaVersion)}.`);
  }
  for (const key of ['cards', 'reviewLogs', 'customWords', 'settings'] as const) {
    if (!Array.isArray(raw[key])) throw new Error(`Backup is missing "${key}".`);
  }
  const file = raw as unknown as BackupFile;
  return {
    ...file,
    cards: file.cards.map((c) => ({
      ...c,
      due: new Date(c.due),
      lastReview: c.lastReview ? new Date(c.lastReview) : undefined,
    })),
    reviewLogs: file.reviewLogs.map((l) => ({ ...l, reviewedAt: new Date(l.reviewedAt) })),
  };
}

/** Replaces all local progress with the backup content, atomically. */
export async function importBackup(db: VocabularyDb, backup: BackupFile): Promise<void> {
  await db.transaction('rw', [db.cards, db.reviewLogs, db.customWords, db.settings], async () => {
    await Promise.all([
      db.cards.clear(),
      db.reviewLogs.clear(),
      db.customWords.clear(),
      db.settings.clear(),
    ]);
    await db.cards.bulkAdd(backup.cards);
    await db.reviewLogs.bulkAdd(backup.reviewLogs.map((l) => ({ ...l })));
    await db.customWords.bulkAdd(backup.customWords);
    await db.settings.bulkAdd(backup.settings);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
