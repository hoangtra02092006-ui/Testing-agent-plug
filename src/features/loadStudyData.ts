import { services, AVAILABLE_LEVELS } from '../app/services';
import { levelsToLoad, planToday, type SessionPlan } from '../domain/session';
import type { Card, ReviewLog, StudySettings, Word } from '../domain/types';

export interface StudyData {
  plan: SessionPlan;
  cards: Map<string, Card>;
  words: Map<string, Word>;
  logs: ReviewLog[];
}

/** Reads stored progress and word files, then lets the domain plan today's session. */
export async function loadStudyData(settings: StudySettings, now: Date): Promise<StudyData> {
  const [cards, logs, customWords] = await Promise.all([
    services.progress.getCards(),
    services.progress.getReviewLogs(),
    services.progress.getCustomWords(),
  ]);
  const levels = levelsToLoad(settings.level, cards, AVAILABLE_LEVELS);
  const byLevel = await Promise.all(levels.map((l) => services.words.getWordsByLevel(l)));
  const words = new Map<string, Word>([...byLevel.flat(), ...customWords].map((w) => [w.id, w]));
  const candidates = byLevel[levels.indexOf(settings.level)]?.map((w) => w.id) ?? [];
  const plan = planToday(now, cards, new Set(words.keys()), candidates, settings, logs);
  return { plan, cards: new Map(cards.map((c) => [c.wordId, c])), words, logs };
}
