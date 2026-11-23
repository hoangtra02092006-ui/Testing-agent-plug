import 'fake-indexeddb/auto';
import { exportBackup, importBackup, parseBackup } from './backup';
import { VocabularyDb } from './db';

let db: VocabularyDb;
let n = 0;
beforeEach(() => {
  db = new VocabularyDb(`backup-${n++}`);
});
afterEach(async () => {
  await db.delete();
});

const NOW = new Date('2026-01-10T08:00:00Z');

async function seed(target: VocabularyDb) {
  await target.cards.add({
    wordId: 'w1',
    due: NOW,
    state: 'review',
    reps: 1,
    lapses: 0,
    lastReview: NOW,
    schedulerData: { stability: 2 },
  });
  await target.reviewLogs.add({ wordId: 'w1', rating: 'good', reviewedAt: NOW });
  await target.customWords.add({
    id: 'custom:1',
    headword: 'x',
    pos: 'noun',
    level: 'custom',
    definitionEn: 'y',
    examples: [],
  });
  await target.settings.add({ key: 'uiLanguage', value: 'vi' });
}

describe('backup (AC10)', () => {
  it('round-trips all progress through a JSON file', async () => {
    await seed(db);
    const json = JSON.stringify(await exportBackup(db, NOW));

    const target = new VocabularyDb(`backup-target-${n++}`);
    await target.cards.add({
      wordId: 'old',
      due: NOW,
      state: 'new',
      reps: 0,
      lapses: 0,
      schedulerData: {},
    });
    await importBackup(target, parseBackup(json));

    const cards = await target.cards.toArray();
    expect(cards.map((c) => c.wordId)).toEqual(['w1']);
    expect(cards[0].due).toEqual(NOW);
    expect(cards[0].lastReview).toEqual(NOW);
    expect((await target.reviewLogs.toArray())[0].reviewedAt).toEqual(NOW);
    expect(await target.customWords.count()).toBe(1);
    expect(await target.settings.get('uiLanguage')).toEqual({ key: 'uiLanguage', value: 'vi' });
    await target.delete();
  });

  it('keeps a card without lastReview', async () => {
    await db.cards.add({
      wordId: 'n',
      due: NOW,
      state: 'new',
      reps: 0,
      lapses: 0,
      schedulerData: {},
    });
    const parsed = parseBackup(JSON.stringify(await exportBackup(db, NOW)));
    expect(parsed.cards[0].lastReview).toBeUndefined();
  });

  it.each([
    ['not json', /not valid JSON/],
    ['null', /not a vocabulary trainer backup/],
    ['{"app":"other"}', /not a vocabulary trainer backup/],
    ['{"app":"vocabulary-trainer","schemaVersion":99}', /Unsupported backup version/],
    ['{"app":"vocabulary-trainer","schemaVersion":1,"cards":[]}', /missing "reviewLogs"/],
  ])('rejects invalid file %s', (input, error) => {
    expect(() => parseBackup(input)).toThrow(error);
  });
});
