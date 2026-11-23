import { services, AVAILABLE_LEVELS } from '../app/services';
import { buildSession, countNewWordsIntroducedToday, type SessionPlan } from '../domain/session';
import type { Card, CefrLevel, ReviewLog, StudySettings, Word } from '../domain/types';

export interface StudyData {
  plan: SessionPlan;
  cards: Map<string, Card>;
  words: Map<string, Word>;
  logs: ReviewLog[];
}

/** Loads everything needed to plan today's session; words without data are left out of the queue. */
export async function loadStudyData(settings: StudySettings, now: Date): Promise<StudyData> {
  const [cards, logs, customWords] = await Promise.all([
    services.progress.getCards(),
    services.progress.getReviewLogs(),
    services.progress.getCustomWords(),
  ]);
  const levelsInUse = new Set<CefrLevel>([settings.level]);
  for (const c of cards) {
    const prefix = c.wordId.split(':')[0].toUpperCase() as CefrLevel;
    if (AVAILABLE_LEVELS.includes(prefix)) levelsInUse.add(prefix);
  }
  const levelWords = await Promise.all(
    [...levelsInUse]
      .filter((l) => AVAILABLE_LEVELS.includes(l))
      .map((l) => services.words.getWordsByLevel(l)),
  );
  const words = new Map<string, Word>([...levelWords.flat(), ...customWords].map((w) => [w.id, w]));
  const candidates = (
    AVAILABLE_LEVELS.includes(settings.level)
      ? await services.words.getWordsByLevel(settings.level)
      : []
  ).map((w) => w.id);

  const studiable = cards.filter((c) => words.has(c.wordId));
  const plan = buildSession(
    now,
    studiable,
    candidates,
    settings,
    countNewWordsIntroducedToday(logs, now),
  );
  return { plan, cards: new Map(cards.map((c) => [c.wordId, c])), words, logs };
}
