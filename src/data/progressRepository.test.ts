import 'fake-indexeddb/auto';
import { VocabularyDb } from './db';
import { DexieProgressRepository } from './progressRepository';
import type { Card } from '../domain/types';

let db: VocabularyDb;
let repo: DexieProgressRepository;
let counter = 0;

beforeEach(() => {
  db = new VocabularyDb(`test-${counter++}`);
  repo = new DexieProgressRepository(db, () => `id${counter}`);
});
afterEach(async () => {
  await db.delete();
});

const card: Card = {
  wordId: 'w1',
  due: new Date('2026-01-10T08:00:00Z'),
  state: 'review',
  reps: 2,
  lapses: 0,
  schedulerData: { stability: 3 },
};

describe('DexieProgressRepository', () => {
  it('saves and updates cards (AC10: progress survives reopening)', async () => {
    await repo.saveCard(card);
    await repo.saveCard({ ...card, reps: 3 });
    const reopened = new DexieProgressRepository(new VocabularyDb(db.name));
    const cards = await reopened.getCards();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ wordId: 'w1', reps: 3 });
    expect(cards[0].due).toEqual(card.due);
  });

  it('stores review logs in time order', async () => {
    await repo.addReviewLog({
      wordId: 'b',
      rating: 'good',
      reviewedAt: new Date('2026-01-10T09:00:00Z'),
    });
    await repo.addReviewLog({
      wordId: 'a',
      rating: 'again',
      reviewedAt: new Date('2026-01-10T08:00:00Z'),
    });
    const logs = await repo.getReviewLogs();
    expect(logs.map((l) => l.wordId)).toEqual(['a', 'b']);
    expect(logs[0]).not.toHaveProperty('id');
  });

  it('adds a custom word with trimmed fields (AC6)', async () => {
    const word = await repo.addCustomWord({
      headword: '  serendipity ',
      pos: 'noun',
      definitionEn: ' a lucky discovery ',
      examples: ['It was pure serendipity.'],
    });
    expect(word).toMatchObject({
      headword: 'serendipity',
      definitionEn: 'a lucky discovery',
      level: 'custom',
    });
    expect(word.id.startsWith('custom:')).toBe(true);
    expect(await repo.getCustomWords()).toHaveLength(1);
  });

  it('rejects a custom word without headword or meaning', async () => {
    await expect(
      repo.addCustomWord({ headword: ' ', pos: 'noun', definitionEn: 'x', examples: [] }),
    ).rejects.toThrow(/headword/);
    await expect(
      repo.addCustomWord({ headword: 'x', pos: 'noun', definitionEn: '', examples: [] }),
    ).rejects.toThrow(/meaning/);
  });
});
