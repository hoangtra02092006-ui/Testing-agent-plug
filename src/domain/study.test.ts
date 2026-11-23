import { FsrsScheduler } from './scheduler';
import { answerCard, needsBackupReminder, parseNewWordsPerDay } from './study';

const NOW = new Date('2026-01-10T08:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('answerCard', () => {
  const scheduler = new FsrsScheduler();

  it('creates a card for a word seen for the first time and logs the answer', () => {
    const { card, log } = answerCard(scheduler, undefined, 'w1', 'good', NOW);
    expect(card).toMatchObject({ wordId: 'w1', reps: 1 });
    expect(log).toEqual({ wordId: 'w1', rating: 'good', reviewedAt: NOW });
  });

  it('continues an existing card', () => {
    const first = answerCard(scheduler, undefined, 'w1', 'easy', NOW).card;
    const { card } = answerCard(scheduler, first, 'w1', 'good', first.due);
    expect(card.reps).toBe(2);
    expect(card.due.getTime()).toBeGreaterThan(first.due.getTime());
  });
});

describe('needsBackupReminder', () => {
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

  it('stays quiet without progress', () => {
    expect(needsBackupReminder(undefined, undefined, NOW)).toBe(false);
  });

  it('does not nag right after the first session', () => {
    expect(needsBackupReminder(daysAgo(0), undefined, NOW)).toBe(false);
  });

  it('reminds 7 days after the first review when there was never a backup', () => {
    expect(needsBackupReminder(daysAgo(8), undefined, NOW)).toBe(true);
  });

  it('counts from the last backup when there is one', () => {
    expect(needsBackupReminder(daysAgo(30), daysAgo(6), NOW)).toBe(false);
    expect(needsBackupReminder(daysAgo(30), daysAgo(8), NOW)).toBe(true);
  });
});

describe('parseNewWordsPerDay', () => {
  it.each([
    ['10', 10],
    [' 1 ', 1],
    ['100', 100],
    ['0', null],
    ['101', null],
    ['', null],
    ['2.5', null],
    ['-3', null],
    ['abc', null],
  ])('parseNewWordsPerDay(%j) = %j', (input, expected) => {
    expect(parseNewWordsPerDay(input)).toBe(expected);
  });
});
