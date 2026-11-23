import 'fake-indexeddb/auto';
import { VocabularyDb } from './db';
import { DexieSettingsRepository } from './settingsRepository';

let db: VocabularyDb;
let n = 0;
beforeEach(() => {
  db = new VocabularyDb(`settings-${n++}`);
});
afterEach(async () => {
  await db.delete();
});

describe('DexieSettingsRepository', () => {
  it('returns defaults when nothing is stored (AC5: 10 new words a day)', async () => {
    expect(await new DexieSettingsRepository(db).getSettings()).toEqual({
      level: 'A1',
      newWordsPerDay: 10,
      uiLanguage: 'vi',
    });
  });

  it('saves changes and remembers them after reopening (AC9)', async () => {
    await new DexieSettingsRepository(db).saveSettings({
      uiLanguage: 'en',
      level: 'B2',
      newWordsPerDay: 15,
    });
    const reopened = new DexieSettingsRepository(new VocabularyDb(db.name));
    expect(await reopened.getSettings()).toEqual({
      level: 'B2',
      newWordsPerDay: 15,
      uiLanguage: 'en',
    });
  });

  it('falls back to defaults for invalid stored values', async () => {
    await db.settings.put({
      key: 'studySettings',
      value: { level: 'Z9', newWordsPerDay: -3, uiLanguage: 'fr' },
    });
    expect(await new DexieSettingsRepository(db).getSettings()).toEqual({
      level: 'A1',
      newWordsPerDay: 10,
      uiLanguage: 'vi',
    });
  });

  it('caps and rounds the daily new-word count', async () => {
    const repo = new DexieSettingsRepository(db);
    expect((await repo.saveSettings({ newWordsPerDay: 500 })).newWordsPerDay).toBe(100);
    expect((await repo.saveSettings({ newWordsPerDay: 7.6 })).newWordsPerDay).toBe(8);
  });

  it('remembers when the last backup was made', async () => {
    const repo = new DexieSettingsRepository(db);
    expect(await repo.getLastBackupAt()).toBeUndefined();
    const at = new Date('2026-01-10T08:00:00Z');
    await repo.markBackedUp(at);
    expect(await repo.getLastBackupAt()).toEqual(at);
  });

  it('ignores an invalid stored backup date', async () => {
    await db.settings.put({ key: 'lastBackupAt', value: 'nope' });
    expect(await new DexieSettingsRepository(db).getLastBackupAt()).toBeUndefined();
  });
});
