import { FsrsScheduler } from './scheduler';

const NOW = new Date('2026-01-10T08:00:00Z');
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('FsrsScheduler', () => {
  const scheduler = new FsrsScheduler();

  it('creates a new card that is due immediately', () => {
    const card = scheduler.createCard('w1', NOW);
    expect(card).toMatchObject({ wordId: 'w1', state: 'new', reps: 0, lapses: 0 });
    expect(card.due.getTime()).toBe(NOW.getTime());
  });

  it('shows a forgotten new card again within the same session (AC3)', () => {
    const card = scheduler.review(scheduler.createCard('w1', NOW), 'again', NOW);
    expect(card.state).toBe('learning');
    expect(card.due.getTime() - NOW.getTime()).toBeLessThanOrEqual(10 * MINUTE);
  });

  it('spaces an "easy" answer further than a "good" one (AC3)', () => {
    const fresh = scheduler.createCard('w1', NOW);
    const good = scheduler.review(fresh, 'good', NOW);
    const easy = scheduler.review(fresh, 'easy', NOW);
    expect(easy.due.getTime()).toBeGreaterThan(good.due.getTime());
    expect(easy.due.getTime() - NOW.getTime()).toBeGreaterThanOrEqual(DAY);
  });

  it('orders intervals again < hard < good < easy for a card in review', () => {
    let card = scheduler.review(scheduler.createCard('w1', NOW), 'easy', NOW);
    const later = card.due;
    const next = (['again', 'hard', 'good', 'easy'] as const).map((r) =>
      scheduler.review(card, r, later).due.getTime(),
    );
    expect(next).toEqual([...next].sort((a, b) => a - b));
    card = scheduler.review(card, 'again', later);
    expect(card).toMatchObject({ state: 'relearning', lapses: 1 });
  });

  it('keeps its own state in schedulerData so a stored card can continue', () => {
    const reviewed = scheduler.review(scheduler.createCard('w1', NOW), 'good', NOW);
    const restored = JSON.parse(JSON.stringify(reviewed));
    restored.due = new Date(restored.due);
    restored.lastReview = new Date(restored.lastReview);
    const a = scheduler.review(reviewed, 'good', reviewed.due);
    const b = scheduler.review(restored, 'good', restored.due);
    expect(b.due.getTime()).toBe(a.due.getTime());
    expect(reviewed.schedulerData).toHaveProperty('stability');
  });

  it('grows the interval after repeated correct answers', () => {
    let card = scheduler.createCard('w1', NOW);
    const intervals: number[] = [];
    let at = NOW;
    for (let i = 0; i < 5; i += 1) {
      card = scheduler.review(card, 'good', at);
      intervals.push(card.due.getTime() - at.getTime());
      at = card.due;
    }
    expect(intervals.at(-1)!).toBeGreaterThan(intervals[1]);
  });

  it('validates its own scheduler data', () => {
    const card = scheduler.review(scheduler.createCard('w1', NOW), 'good', NOW);
    expect(scheduler.isValidCard(card)).toBe(true);
    expect(scheduler.isValidCard(scheduler.createCard('w2', NOW))).toBe(true);
    expect(
      scheduler.isValidCard({ ...card, schedulerData: { ...card.schedulerData, stability: 'x' } }),
    ).toBe(false);
    expect(
      scheduler.isValidCard({ ...card, schedulerData: { ...card.schedulerData, state: 42 } }),
    ).toBe(false);
    expect(scheduler.isValidCard({ ...card, state: 'review' })).toBe(false);
  });
});
