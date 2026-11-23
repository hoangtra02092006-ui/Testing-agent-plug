import { MAX_NEW_WORDS_PER_DAY } from '../domain/study';
import { CEFR_LEVELS, DEFAULT_SETTINGS, type StudySettings } from '../domain/types';
import type { VocabularyDb } from './db';
import type { SettingsRepository } from './repositories';

const KEY = 'studySettings';
const LAST_BACKUP_KEY = 'lastBackupAt';

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: VocabularyDb) {}

  async getSettings(): Promise<StudySettings> {
    const row = await this.db.settings.get(KEY);
    const stored = (row?.value ?? {}) as Partial<StudySettings>;
    return sanitize({ ...DEFAULT_SETTINGS, ...stored });
  }

  async saveSettings(changes: Partial<StudySettings>): Promise<StudySettings> {
    const next = sanitize({ ...(await this.getSettings()), ...changes });
    await this.db.settings.put({ key: KEY, value: next });
    return next;
  }

  async getLastBackupAt(): Promise<Date | undefined> {
    const row = await this.db.settings.get(LAST_BACKUP_KEY);
    const date = typeof row?.value === 'string' ? new Date(row.value) : undefined;
    return date && !Number.isNaN(date.getTime()) ? date : undefined;
  }

  async markBackedUp(at: Date): Promise<void> {
    await this.db.settings.put({ key: LAST_BACKUP_KEY, value: at.toISOString() });
  }
}

/** Falls back to defaults for any invalid value, so a bad stored value never breaks the app. */
function sanitize(s: StudySettings): StudySettings {
  const n = Math.round(Number(s.newWordsPerDay));
  return {
    level: CEFR_LEVELS.includes(s.level) ? s.level : DEFAULT_SETTINGS.level,
    newWordsPerDay:
      Number.isFinite(n) && n >= 1
        ? Math.min(n, MAX_NEW_WORDS_PER_DAY)
        : DEFAULT_SETTINGS.newWordsPerDay,
    uiLanguage:
      s.uiLanguage === 'en' || s.uiLanguage === 'vi' ? s.uiLanguage : DEFAULT_SETTINGS.uiLanguage,
  };
}
