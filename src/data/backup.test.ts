import 'fake-indexeddb/auto';
import { exportBackup, importBackup, parseBackup } from './backup';
import { VocabularyDb } from './db';
import { FsrsScheduler } from '../domain/scheduler';

const scheduler = new FsrsScheduler();

let db: VocabularyDb;
let n = 0;
beforeEach(() => {
  db = new VocabularyDb(`backup-${n++}`);
});
afterEach(async () => {
  await db.delete();
});

const NOW = new Date('2026-01-10T08:00:00Z');
/** A card in review state with real scheduler data. */
const reviewCard = () => scheduler.review(scheduler.createCard('w1', NOW), 'easy', NOW);

async function seed(target: VocabularyDb) {
  await target.cards.add(reviewCard());
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
    await importBackup(target, parseBackup(json, scheduler));

    const cards = await target.cards.toArray();
    expect(cards.map((c) => c.wordId)).toEqual(['w1']);
    expect(cards[0]).toEqual(reviewCard());
    expect((await target.reviewLogs.toArray())[0].reviewedAt).toEqual(NOW);
    expect(await target.customWords.count()).toBe(1);
    expect(await target.settings.get('uiLanguage')).toEqual({ key: 'uiLanguage', value: 'vi' });
    await target.delete();
  });

  it('keeps a card without lastReview', async () => {
    await db.cards.add(scheduler.createCard('n', NOW));
    const parsed = parseBackup(JSON.stringify(await exportBackup(db, NOW)), scheduler);
    expect(parsed.cards[0].lastReview).toBeUndefined();
  });

  it.each([
    ['not json', /not valid JSON/],
    ['null', /not a vocabulary trainer backup/],
    ['{"app":"other"}', /not a vocabulary trainer backup/],
    ['{"app":"vocabulary-trainer","schemaVersion":99}', /Unsupported backup version/],
    ['{"app":"vocabulary-trainer","schemaVersion":"1"}', /Unsupported backup version/],
    ['{"app":"vocabulary-trainer","schemaVersion":1,"cards":[]}', /missing "reviewLogs"/],
  ])('rejects invalid file %s', (input, error) => {
    expect(() => parseBackup(input, scheduler)).toThrow(error);
  });

  const validCard = JSON.parse(JSON.stringify(reviewCard()));
  const file = (parts: Record<string, unknown>) =>
    JSON.stringify({
      app: 'vocabulary-trainer',
      schemaVersion: 1,
      cards: [],
      reviewLogs: [],
      customWords: [],
      settings: [],
      ...parts,
    });

  it.each([
    ['card with invalid due', { cards: [{ ...validCard, due: 'garbage' }] }, /cards\[0\]\.due/],
    [
      'card without schedulerData',
      { cards: [{ ...validCard, schedulerData: undefined }] },
      /cards\[0\]\.schedulerData/,
    ],
    ['card with unknown state', { cards: [{ ...validCard, state: 'done' }] }, /cards\[0\]\.state/],
    ['card with negative reps', { cards: [{ ...validCard, reps: -1 }] }, /cards\[0\]\.reps/],
    ['card without wordId', { cards: [{ ...validCard, wordId: '' }] }, /cards\[0\]\.wordId/],
    [
      'card with invalid lastReview',
      { cards: [{ ...validCard, lastReview: 'x' }] },
      /cards\[0\]\.lastReview/,
    ],
    ['null element', { cards: [validCard, null] }, /cards\[1\] is not an object/],
    [
      'log with invalid date',
      { reviewLogs: [{ wordId: 'w', rating: 'good', reviewedAt: 'nope' }] },
      /reviewLogs\[0\]\.reviewedAt/,
    ],
    [
      'log with unknown rating',
      { reviewLogs: [{ wordId: 'w', rating: 'bogus', reviewedAt: NOW.toISOString() }] },
      /reviewLogs\[0\]\.rating/,
    ],
    [
      'word without headword',
      { customWords: [{ id: 'custom:x', definitionEn: 'y', examples: [] }] },
      /customWords\[0\]\.headword/,
    ],
    [
      'word with bad examples',
      { customWords: [{ id: 'c', headword: 'h', definitionEn: 'd', examples: [1] }] },
      /customWords\[0\]\.examples/,
    ],
    ['setting without key', { settings: [{ value: 1 }] }, /settings\[0\]\.key/],
  ])('rejects a %s and names the element', (_, parts, error) => {
    expect(() => parseBackup(file(parts), scheduler)).toThrow(error);
  });

  it.each([
    ['non-numeric stability', { stability: 'abc' }],
    ['unknown FSRS state', { state: 99 }],
    ['FSRS state not matching the card state', { state: 1 }],
    ['negative difficulty', { difficulty: -1 }],
  ])('rejects scheduler data with %s', (_, patch) => {
    const card = { ...validCard, schedulerData: { ...validCard.schedulerData, ...patch } };
    expect(() => parseBackup(file({ cards: [card] }), scheduler)).toThrow(
      /cards\[0\]\.schedulerData/,
    );
  });

  it('rejects empty scheduler data on a reviewed card', () => {
    expect(() =>
      parseBackup(file({ cards: [{ ...validCard, schedulerData: {} }] }), scheduler),
    ).toThrow(/schedulerData/);
  });

  it.each([
    ['cards', [validCard, validCard], /cards\[1\]\.wordId "w1" is duplicated/],
    [
      'customWords',
      [
        { id: 'c', headword: 'h', definitionEn: 'd', examples: [] },
        { id: 'c', headword: 'h', definitionEn: 'd', examples: [] },
      ],
      /customWords\[1\]\.id/,
    ],
    [
      'settings',
      [
        { key: 'k', value: 1 },
        { key: 'k', value: 2 },
      ],
      /settings\[1\]\.key/,
    ],
  ])('rejects duplicated keys in %s', (key, items, error) => {
    expect(() => parseBackup(file({ [key]: items }), scheduler)).toThrow(error);
  });

  it('keeps only known word fields and rejects non-text ipa or meaning', () => {
    const word = { id: 'c', headword: 'h', definitionEn: 'd', examples: [], ipa: '/h/', evil: 'x' };
    const parsed = parseBackup(file({ customWords: [word] }), scheduler);
    expect(parsed.customWords[0]).not.toHaveProperty('evil');
    expect(parsed.customWords[0].ipa).toBe('/h/');
    expect(() =>
      parseBackup(file({ customWords: [{ ...word, ipa: { x: 1 } }] }), scheduler),
    ).toThrow(/ipa/);
    expect(() =>
      parseBackup(file({ customWords: [{ ...word, meaningVi: 5 }] }), scheduler),
    ).toThrow(/meaningVi/);
  });

  it('restores progress that can be reviewed exactly like before', () => {
    const parsed = parseBackup(file({ cards: [validCard] }), scheduler);
    const original = reviewCard();
    const later = original.due;
    expect(scheduler.review(parsed.cards[0], 'good', later).due).toEqual(
      scheduler.review(original, 'good', later).due,
    );
  });

  it('keeps old data when importing fails half-way', async () => {
    await seed(db);
    const broken = parseBackup(file({ cards: [validCard] }), scheduler);
    broken.cards.push(broken.cards[0]); // duplicate key slips past parsing only if constructed by hand
    await expect(importBackup(db, broken)).rejects.toThrow();
    expect(await db.cards.count()).toBe(1);
    expect(await db.customWords.count()).toBe(1);
  });

  it('leaves existing progress untouched when a file is rejected', async () => {
    await seed(db);
    expect(() =>
      parseBackup(file({ cards: [{ ...validCard, due: 'garbage' }] }), scheduler),
    ).toThrow();
    expect(await db.cards.count()).toBe(1);
  });
});
