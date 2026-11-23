import { advanceQueue, buildSession } from './session';
import type { Card } from './types';

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
    const plan = buildSession(NOW, cards, [], 10);
    expect(plan.queue).toEqual(['early', 'late']);
    expect(plan.dueCount).toBe(2);
  });

  it('adds new words up to the daily limit, skipping words already studied (AC5)', () => {
    const cards = [card('a', '2026-01-20T00:00:00Z')];
    const plan = buildSession(NOW, cards, ['a', 'b', 'c', 'd'], 2);
    expect(plan.queue).toEqual(['b', 'c']);
    expect(plan.newCount).toBe(2);
  });

  it('counts new words already introduced today toward the limit', () => {
    expect(buildSession(NOW, [], ['a', 'b', 'c'], 2, 1).queue).toEqual(['a']);
    expect(buildSession(NOW, [], ['a', 'b'], 2, 5).queue).toEqual([]);
  });

  it('includes a learning card that is due now', () => {
    const plan = buildSession(NOW, [card('l', '2026-01-10T08:00:00Z', 'learning')], [], 0);
    expect(plan.queue).toEqual(['l']);
  });
});

describe('advanceQueue', () => {
  it('moves a forgotten word to the end of the session', () => {
    expect(advanceQueue(['a', 'b', 'c'], 'a', 'again')).toEqual(['b', 'c', 'a']);
  });

  it('removes a word answered correctly', () => {
    expect(advanceQueue(['a', 'b'], 'a', 'good')).toEqual(['b']);
  });

  it('removes only the first occurrence', () => {
    expect(advanceQueue(['a', 'b', 'a'], 'a', 'easy')).toEqual(['b', 'a']);
  });
});
