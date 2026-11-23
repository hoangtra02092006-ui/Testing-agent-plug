import 'fake-indexeddb/auto';
import { VocabularyDb } from './db';
import { DexieProgressRepository } from './progressRepository';
import { FsrsScheduler } from '../domain/scheduler';
import { buildSession } from '../domain/session';
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

  const scheduler = new FsrsScheduler();
  const NOW = new Date('2026-01-10T08:00:00Z');
  const createCard = (id: string) => scheduler.createCard(id, NOW);

  it('adds a custom word with trimmed fields (AC6)', async () => {
    const word = await repo.addCustomWord(
      {
        headword: '  serendipity ',
        pos: 'noun',
        definitionEn: ' a lucky discovery ',
        examples: ['It was pure serendipity.'],
      },
      createCard,
    );
    expect(word).toMatchObject({
      headword: 'serendipity',
      definitionEn: 'a lucky discovery',
      level: 'custom',
    });
    expect(word.id.startsWith('custom:')).toBe(true);
    expect(await repo.getCustomWords()).toHaveLength(1);
  });

  it('puts a custom word into the study queue like a level word (AC6)', async () => {
    const word = await repo.addCustomWord(
      { headword: 'gist', pos: 'noun', definitionEn: 'main point', examples: [] },
      createCard,
    );
    const plan = buildSession(NOW, await repo.getCards(), ['a1:hello'], { newWordsPerDay: 10 });
    expect(plan.queue).toEqual([word.id, 'a1:hello']);
  });

  it('rejects a custom word without headword or meaning and saves nothing', async () => {
    await expect(
      repo.addCustomWord(
        { headword: ' ', pos: 'noun', definitionEn: 'x', examples: [] },
        createCard,
      ),
    ).rejects.toThrow(/headword/);
    await expect(
      repo.addCustomWord(
        { headword: 'x', pos: 'noun', definitionEn: '', examples: [] },
        createCard,
      ),
    ).rejects.toThrow(/meaning/);
    expect(await repo.getCards()).toHaveLength(0);
  });

  it('saves neither word nor card when creating the card fails', async () => {
    const failing = () => {
      throw new Error('boom');
    };
    await expect(
      repo.addCustomWord({ headword: 'x', pos: 'noun', definitionEn: 'y', examples: [] }, failing),
    ).rejects.toThrow('boom');
    expect(await repo.getCustomWords()).toHaveLength(0);
  });
});
