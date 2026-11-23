import { computeStats, localDayNumber, logsSince } from './stats';
import type { Rating, ReviewLog } from './types';

// Local-time constructors keep these tests independent of the machine's time zone.
const at = (d: number, h: number, m = 0) => new Date(2026, 0, d, h, m);
const log = (reviewedAt: Date, rating: Rating = 'good'): ReviewLog => ({
  wordId: 'w',
  rating,
  reviewedAt,
});

describe('computeStats (AC7)', () => {
  it('returns empty stats without reviews', () => {
    expect(computeStats([], at(10, 9))).toEqual({
      reviewedWords: 0,
      reviews: 0,
      accuracy: null,
      streakDays: 0,
    });
  });

  it('computes accuracy as the share of non-"again" ratings', () => {
    const logs = [
      log(at(10, 8)),
      log(at(10, 8), 'again'),
      log(at(10, 8), 'hard'),
      log(at(10, 8), 'easy'),
    ];
    expect(computeStats(logs, at(10, 9)).accuracy).toBe(0.75);
  });

  it('counts a word answered twice once in reviewedWords but twice in reviews', () => {
    const logs: ReviewLog[] = [
      { wordId: 'a', rating: 'again', reviewedAt: at(10, 8) },
      { wordId: 'a', rating: 'good', reviewedAt: at(10, 8, 5) },
      { wordId: 'b', rating: 'good', reviewedAt: at(10, 8, 6) },
    ];
    expect(computeStats(logs, at(10, 9))).toMatchObject({ reviewedWords: 2, reviews: 3 });
  });

  it('runs in a non-UTC zone during tests', () => {
    expect(new Date(2026, 0, 10).getTimezoneOffset()).toBe(-420);
  });

  it('counts consecutive local days ending today', () => {
    const logs = [log(at(8, 20)), log(at(9, 7)), log(at(10, 6))];
    expect(computeStats(logs, at(10, 9)).streakDays).toBe(3);
  });

  it('keeps the streak alive when the learner has not studied yet today', () => {
    const logs = [log(at(8, 20)), log(at(9, 7))];
    expect(computeStats(logs, at(10, 9)).streakDays).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const logs = [log(at(7, 20)), log(at(9, 7))];
    expect(computeStats(logs, at(11, 9)).streakDays).toBe(0);
    expect(computeStats(logs, at(10, 9)).streakDays).toBe(1);
  });

  it('treats 23:59 and 00:01 as two different days', () => {
    expect(localDayNumber(at(10, 0, 1)) - localDayNumber(at(9, 23, 59))).toBe(1);
    expect(computeStats([log(at(9, 23, 59)), log(at(10, 0, 1))], at(10, 1)).streakDays).toBe(2);
  });
});

describe('logsSince', () => {
  it('keeps logs from the given moment on', () => {
    const logs = [log(at(10, 7)), log(at(10, 8)), log(at(10, 9))];
    expect(logsSince(logs, at(10, 8))).toHaveLength(2);
  });
});
