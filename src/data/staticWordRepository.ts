import { AppError } from '../domain/errors';
import type { CefrLevel, Word } from '../domain/types';
import type { WordRepository } from './repositories';

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Loads one JSON file per CEFR level from /words and caches it in memory. */
export class StaticWordRepository implements WordRepository {
  private readonly cache = new Map<CefrLevel, Promise<Word[]>>();

  constructor(
    private readonly fetcher: Fetcher = (url) => fetch(url),
    private readonly baseUrl = '/words',
  ) {}

  getWordsByLevel(level: CefrLevel): Promise<Word[]> {
    let pending = this.cache.get(level);
    if (!pending) {
      pending = this.load(level);
      this.cache.set(level, pending);
      pending.catch(() => this.cache.delete(level));
    }
    return pending;
  }

  private async load(level: CefrLevel): Promise<Word[]> {
    const response = await this.fetcher(`${this.baseUrl}/${level}.json`);
    if (!response.ok) {
      throw new AppError(
        'wordsLoad',
        `Could not load words for level ${level} (HTTP ${response.status}).`,
        { level, status: response.status },
      );
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new AppError('wordsFormat', `Word file for level ${level} is not a list.`, { level });
    }
    return data as Word[];
  }
}
