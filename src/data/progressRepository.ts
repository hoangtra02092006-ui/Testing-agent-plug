import { AppError } from '../domain/errors';
import type { Card, ReviewLog, Word } from '../domain/types';
import type { VocabularyDb } from './db';
import type { NewCustomWord, ProgressRepository } from './repositories';

export class DexieProgressRepository implements ProgressRepository {
  constructor(
    private readonly db: VocabularyDb,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  getCards(): Promise<Card[]> {
    return this.db.cards.toArray();
  }

  async recordReview(card: Card, log: ReviewLog): Promise<void> {
    await this.db.transaction('rw', [this.db.cards, this.db.reviewLogs], async () => {
      await this.db.cards.put(card);
      await this.db.reviewLogs.add({ ...log });
    });
  }

  async getReviewLogs(): Promise<ReviewLog[]> {
    const rows = await this.db.reviewLogs.orderBy('reviewedAt').toArray();
    return rows.map(({ wordId, rating, reviewedAt }) => ({ wordId, rating, reviewedAt }));
  }

  async addCustomWord(input: NewCustomWord, createCard: (wordId: string) => Card): Promise<Word> {
    const headword = input.headword.trim();
    const definitionEn = input.definitionEn.trim();
    if (!headword || !definitionEn) {
      throw new AppError('customWordIncomplete', 'A custom word needs a headword and a meaning.');
    }
    const word: Word = {
      ...input,
      headword,
      definitionEn,
      id: `custom:${this.newId()}`,
      level: 'custom',
    };
    await this.db.transaction('rw', [this.db.customWords, this.db.cards], async () => {
      await this.db.customWords.add(word);
      await this.db.cards.add(createCard(word.id));
    });
    return word;
  }

  getCustomWords(): Promise<Word[]> {
    return this.db.customWords.toArray();
  }
}
