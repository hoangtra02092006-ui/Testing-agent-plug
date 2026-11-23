import { CARD_STATES, RATINGS, type Card, type ReviewLog, type Word } from '../domain/types';
import type { Scheduler } from '../domain/scheduler';
import type { SettingRow, VocabularyDb } from './db';

/** Version of the backup file format (independent of the IndexedDB schema version). */
export const BACKUP_VERSION = 1;

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
    schemaVersion: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    cards,
    reviewLogs: logs.map(({ wordId, rating, reviewedAt }) => ({ wordId, rating, reviewedAt })),
    customWords,
    settings,
  };
}

/**
 * Parses and fully validates a backup file before anything is overwritten.
 * Throws an error naming the first invalid element.
 */
export function parseBackup(json: string, scheduler: Pick<Scheduler, 'isValidCard'>): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  if (!isRecord(raw) || raw.app !== 'vocabulary-trainer') {
    throw new Error('This file is not a vocabulary trainer backup.');
  }
  const version = raw.schemaVersion;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1 ||
    version > BACKUP_VERSION
  ) {
    throw new Error(`Unsupported backup version ${String(version)}.`);
  }
  const backup: BackupFile = {
    app: 'vocabulary-trainer',
    schemaVersion: version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    cards: list(raw, 'cards').map((item, i) => parseCard(item, `cards[${i}]`)),
    reviewLogs: list(raw, 'reviewLogs').map((item, i) => parseLog(item, `reviewLogs[${i}]`)),
    customWords: list(raw, 'customWords').map((item, i) => parseWord(item, `customWords[${i}]`)),
    settings: list(raw, 'settings').map((item, i) => parseSetting(item, `settings[${i}]`)),
  };
  backup.cards.forEach((card, i) => {
    if (!scheduler.isValidCard(card)) fail(`cards[${i}]`, 'schedulerData');
  });
  unique(
    backup.cards.map((c) => c.wordId),
    'cards',
    'wordId',
  );
  unique(
    backup.customWords.map((w) => w.id),
    'customWords',
    'id',
  );
  unique(
    backup.settings.map((s) => s.key),
    'settings',
    'key',
  );
  return backup;
}

function unique(keys: string[], listName: string, field: string): void {
  const seen = new Set<string>();
  keys.forEach((key, i) => {
    if (seen.has(key))
      throw new Error(`Invalid backup: ${listName}[${i}].${field} "${key}" is duplicated.`);
    seen.add(key);
  });
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

function list(raw: Record<string, unknown>, key: string): unknown[] {
  const value = raw[key];
  if (!Array.isArray(value)) throw new Error(`Backup is missing "${key}".`);
  return value;
}

function parseCard(item: unknown, where: string): Card {
  const r = record(item, where);
  if (!isRecord(r.schedulerData)) fail(where, 'schedulerData');
  if (!CARD_STATES.includes(r.state as Card['state'])) fail(where, 'state');
  return {
    wordId: text(r.wordId, where, 'wordId'),
    due: date(r.due, where, 'due'),
    state: r.state as Card['state'],
    reps: count(r.reps, where, 'reps'),
    lapses: count(r.lapses, where, 'lapses'),
    lastReview:
      r.lastReview === undefined || r.lastReview === null
        ? undefined
        : date(r.lastReview, where, 'lastReview'),
    schedulerData: r.schedulerData as Record<string, unknown>,
  };
}

function parseLog(item: unknown, where: string): ReviewLog {
  const r = record(item, where);
  if (!RATINGS.includes(r.rating as ReviewLog['rating'])) fail(where, 'rating');
  return {
    wordId: text(r.wordId, where, 'wordId'),
    rating: r.rating as ReviewLog['rating'],
    reviewedAt: date(r.reviewedAt, where, 'reviewedAt'),
  };
}

function parseWord(item: unknown, where: string): Word {
  const r = record(item, where);
  if (!Array.isArray(r.examples) || !r.examples.every((e) => typeof e === 'string'))
    fail(where, 'examples');
  return {
    id: text(r.id, where, 'id'),
    headword: text(r.headword, where, 'headword'),
    pos: typeof r.pos === 'string' ? r.pos : '',
    level: 'custom',
    ipa: optionalText(r.ipa, where, 'ipa'),
    meaningVi: optionalText(r.meaningVi, where, 'meaningVi'),
    definitionEn: text(r.definitionEn, where, 'definitionEn'),
    examples: r.examples as string[],
  };
}

function parseSetting(item: unknown, where: string): SettingRow {
  const r = record(item, where);
  return { key: text(r.key, where, 'key'), value: r.value };
}

function record(item: unknown, where: string): Record<string, unknown> {
  if (!isRecord(item)) throw new Error(`Invalid backup: ${where} is not an object.`);
  return item;
}

function text(value: unknown, where: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(where, field);
  return value as string;
}

function optionalText(value: unknown, where: string, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(where, field);
  return value as string;
}

function date(value: unknown, where: string, field: string): Date {
  const d = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date(NaN);
  if (Number.isNaN(d.getTime())) fail(where, field);
  return d;
}

function count(value: unknown, where: string, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) fail(where, field);
  return value as number;
}

function fail(where: string, field: string): never {
  throw new Error(`Invalid backup: ${where}.${field} is missing or invalid.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
