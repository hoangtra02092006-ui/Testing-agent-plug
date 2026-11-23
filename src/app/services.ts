import { VocabularyDb } from '../data/db';
import { DexieProgressRepository } from '../data/progressRepository';
import { DexieSettingsRepository } from '../data/settingsRepository';
import { StaticWordRepository } from '../data/staticWordRepository';
import { FsrsScheduler } from '../domain/scheduler';
import type { CefrLevel } from '../domain/types';

/** Levels whose word file is published in public/words. */
export const AVAILABLE_LEVELS: readonly CefrLevel[] = ['A1'];

const db = new VocabularyDb();

export const services = {
  db,
  scheduler: new FsrsScheduler(),
  progress: new DexieProgressRepository(db),
  settings: new DexieSettingsRepository(db),
  words: new StaticWordRepository(),
};
