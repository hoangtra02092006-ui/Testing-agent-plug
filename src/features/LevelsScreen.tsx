import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_LEVELS, services } from '../app/services';
import { CEFR_LEVELS, type CefrLevel, type StudySettings } from '../domain/types';
import { useAsync } from '../shared/lib/useAsync';
import { ErrorView, Loading, Screen } from '../shared/ui';

export function LevelsScreen({
  settings,
  onBack,
  onChoose,
}: {
  settings: StudySettings;
  onBack: () => void;
  onChoose: (level: CefrLevel) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<{ error: unknown; level: CefrLevel } | null>(null);
  const choose = (level: CefrLevel) => {
    setFailed(null);
    onChoose(level).catch((error: unknown) => setFailed({ error, level }));
  };
  const { state, reload } = useAsync(async () => {
    const cards = await services.progress.getCards();
    const studied = new Set(cards.filter((c) => c.state !== 'new').map((c) => c.wordId));
    const counts = new Map<CefrLevel, { total: number; learned: number }>();
    for (const level of AVAILABLE_LEVELS) {
      const words = await services.words.getWordsByLevel(level);
      counts.set(level, {
        total: words.length,
        learned: words.filter((w) => studied.has(w.id)).length,
      });
    }
    return counts;
  });

  return (
    <Screen title={t('levels.title')} onBack={onBack}>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorView error={state.error} onRetry={reload} />}
      {failed && <ErrorView error={failed.error} onRetry={() => choose(failed.level)} />}
      {state.status === 'ready' && (
        <ul className="grid grid-cols-2 gap-3">
          {CEFR_LEVELS.map((level) => {
            const info = state.data.get(level);
            const selected = level === settings.level;
            return (
              <li key={level}>
                <button
                  type="button"
                  disabled={!info}
                  onClick={() => choose(level)}
                  aria-pressed={selected}
                  className={`flex w-full flex-col items-start rounded-2xl bg-white p-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'ring-2 ring-indigo-600' : 'ring-slate-200 hover:ring-indigo-300'}`}
                >
                  <span className="text-2xl font-bold">{level}</span>
                  {info ? (
                    <>
                      <span className="text-sm text-slate-600">
                        {t('levels.words', { count: info.total })}
                      </span>
                      {/* <progress> instead of an inline width style, which the CSP blocks */}
                      <progress
                        value={percent(info)}
                        max={100}
                        className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-indigo-500 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-indigo-500"
                      />
                      <span className="mt-1 text-xs text-slate-500">
                        {t('levels.progress', { percent: percent(info) })}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">{t('levels.comingSoon')}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}

const percent = ({ total, learned }: { total: number; learned: number }) =>
  total === 0 ? 0 : Math.round((learned / total) * 100);
