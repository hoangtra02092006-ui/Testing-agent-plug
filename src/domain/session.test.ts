import { FsrsScheduler } from './scheduler';
import {
  advanceQueue,
  buildSession,
  countNewWordsIntroducedToday,
  isInTodaysQueue,
  levelOfWordId,
  levelsToLoad,
  planToday,
} from './session';
import type { Card, ReviewLog } from './types';

const NOW = new Date('2026-01-10T08:00:00Z');
const card = (wordId: string, due: string, state: Card['state'] = 'review'): Card => ({
  wordId,
  due: new Date(due),
  state,
  reps: 1,
  lapses: 0,
  schedulerData: {},
});

describe('buildSession', () => {
  it('puts due cards first, earliest due first, and counts them (AC1)', () => {
    const cards = [
      card('late', '2026-01-10T07:00:00Z'),
      card('early', '2026-01-09T07:00:00Z'),
      card('future', '2026-01-11T07:00:00Z'),
    ];
    const plan = buildSession(NOW, cards, [], { newWordsPerDay: 10 });
    expect(plan.queue).toEqual(['early', 'late']);
    expect(plan.dueCount).toBe(2);
  });

  it('adds new words up to the daily limit, skipping words already studied (AC5)', () => {
    const cards = [card('a', '2026-01-20T00:00:00Z')];
    const plan = buildSession(NOW, cards, ['a', 'b', 'c', 'd'], { newWordsPerDay: 2 });
    expect(plan.queue).toEqual(['b', 'c']);
    expect(plan.newCount).toBe(2);
  });

  it('counts new words already introduced today toward the limit', () => {
    expect(buildSession(NOW, [], ['a', 'b', 'c'], { newWordsPerDay: 2 }, 1).queue).toEqual(['a']);
    expect(buildSession(NOW, [], ['a', 'b'], { newWordsPerDay: 2 }, 5).queue).toEqual([]);
  });

  it('includes a learning card that is due now', () => {
    const plan = buildSession(NOW, [card('l', '2026-01-10T08:00:00Z', 'learning')], [], {
      newWordsPerDay: 0,
    });
    expect(plan.queue).toEqual(['l']);
  });
});

describe('buildSession with stored new cards', () => {
  const scheduler = new FsrsScheduler();

  it('treats a stored card in state "new" (e.g. a custom word) as a new word (AC6)', () => {
    const custom = scheduler.createCard('custom:1', NOW);
    const plan = buildSession(NOW, [custom], ['custom:1', 'b'], { newWordsPerDay: 10 });
    expect(plan.queue).toEqual(['custom:1', 'b']);
    expect(plan.newCount).toBe(2);
  });

  it('puts stored new cards before level words and keeps the daily limit', () => {
    const plan = buildSession(
      NOW,
      [scheduler.createCard('custom:1', NOW)],
      ['b', 'c'],
      { newWordsPerDay: 2 },
      1,
    );
    expect(plan.queue).toEqual(['custom:1']);
  });
});

describe('countNewWordsIntroducedToday (AC5)', () => {
  // Local-time dates: the test setup runs in Asia/Ho_Chi_Minh.
  const log = (wordId: string, reviewedAt: Date): ReviewLog => ({
    wordId,
    rating: 'good',
    reviewedAt,
  });
  const now = new Date(2026, 0, 10, 9);

  it('counts distinct words first reviewed today', () => {
    const logs = [
      log('a', new Date(2026, 0, 10, 0, 5)),
      log('a', new Date(2026, 0, 10, 8)),
      log('b', new Date(2026, 0, 10, 8)),
      log('old', new Date(2026, 0, 9, 23, 55)),
      log('old', new Date(2026, 0, 10, 8)),
    ];
    expect(countNewWordsIntroducedToday(logs, now)).toBe(2);
  });

  it('is zero when nothing was studied today', () => {
    expect(countNewWordsIntroducedToday([log('a', new Date(2026, 0, 9, 12))], now)).toBe(0);
  });

  it('stops a second session the same day from adding more new words', () => {
    const logs = ['a', 'b'].map((id) => log(id, new Date(2026, 0, 10, 7)));
    const plan = buildSession(
      now,
      [],
      ['c', 'd', 'e'],
      { newWordsPerDay: 2 },
      countNewWordsIntroducedToday(logs, now),
    );
    expect(plan.newCount).toBe(0);
  });
});

describe('advanceQueue', () => {
  it('moves a forgotten word to the end of the session', () => {
    expect(advanceQueue(['a', 'b', 'c'], 'a', 'again')).toEqual(['b', 'c', 'a']);
  });

  it('removes a word answered correctly', () => {
    expect(advanceQueue(['a', 'b'], 'a', 'good')).toEqual(['b']);
  });

  it('leaves the queue unchanged for a word that is not in it', () => {
    const queue = ['a'];
    expect(advanceQueue(queue, 'x', 'again')).toBe(queue);
  });

  it('removes only the first occurrence', () => {
    expect(advanceQueue(['a', 'b', 'a'], 'a', 'easy')).toEqual(['b', 'a']);
  });
});

describe('levelOfWordId / levelsToLoad', () => {
  it('reads the level from the word id', () => {
    expect(levelOfWordId('a1:cat:noun')).toBe('A1');
    expect(levelOfWordId('custom:123')).toBeUndefined();
  });

  it('loads the chosen level and levels already studied, only when published', () => {
    const cards = [
      card('b1:x:noun', '2026-01-01'),
      card('a1:y:noun', '2026-01-01'),
      card('custom:1', '2026-01-01'),
    ];
    expect(levelsToLoad('A2', cards, ['A1', 'A2'])).toEqual(['A2', 'A1']);
    expect(levelsToLoad('C1', [], ['A1'])).toEqual([]);
  });
});

describe('planToday', () => {
  it('leaves out cards without word data and counts new words met today', () => {
    const cards = [
      card('a1:gone:noun', '2026-01-09T08:00:00Z'),
      card('a1:due:noun', '2026-01-09T08:00:00Z'),
    ];
    const logs: ReviewLog[] = [
      { wordId: 'a1:old:noun', rating: 'good', reviewedAt: new Date('2026-01-10T07:00:00Z') },
    ];
    const plan = planToday(
      NOW,
      cards,
      new Set(['a1:due:noun', 'a1:n1:noun', 'a1:n2:noun']),
      ['a1:n1:noun', 'a1:n2:noun'],
      { newWordsPerDay: 2 },
      logs,
    );
    expect(plan.queue).toEqual(['a1:due:noun', 'a1:n1:noun']);
  });
});

describe('isInTodaysQueue', () => {
  it('tells whether a word is studied today', () => {
    const plan = { queue: ['a', 'b'], dueCount: 1, newCount: 1 };
    expect(isInTodaysQueue(plan, 'b')).toBe(true);
    expect(isInTodaysQueue(plan, 'c')).toBe(false);
  });
});
