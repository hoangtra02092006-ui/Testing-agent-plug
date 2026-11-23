import type { Card, ReviewLog, Word } from '../domain/types';
import type { VocabularyDb } from './db';
import type { ProgressRepository } from './repositories';

export class DexieProgressRepository implements ProgressRepository {
  constructor(
    private readonly db: VocabularyDb,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  getCards(): Promise<Card[]> {
    return this.db.cards.toArray();
  }

  async saveCard(card: Card): Promise<void> {
    await this.db.cards.put(card);
  }

  async addReviewLog(log: ReviewLog): Promise<void> {
    await this.db.reviewLogs.add({ ...log });
  }

  async getReviewLogs(): Promise<ReviewLog[]> {
    const rows = await this.db.reviewLogs.orderBy('reviewedAt').toArray();
    return rows.map(({ wordId, rating, reviewedAt }) => ({ wordId, rating, reviewedAt }));
  }

  async addCustomWord(input: Omit<Word, 'id' | 'level'>): Promise<Word> {
    const headword = input.headword.trim();
    const definitionEn = input.definitionEn.trim();
    if (!headword || !definitionEn) {
      throw new Error('A custom word needs a headword and a meaning.');
    }
    const word: Word = {
      ...input,
      headword,
      definitionEn,
      id: `custom:${this.newId()}`,
      level: 'custom',
    };
    await this.db.customWords.add(word);
    return word;
  }

  getCustomWords(): Promise<Word[]> {
    return this.db.customWords.toArray();
  }
}
