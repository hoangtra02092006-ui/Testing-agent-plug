import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import { advanceQueue } from '../domain/session';
import { computeStats, logsSince } from '../domain/stats';
import { answerCard } from '../domain/study';
import { RATINGS, type Rating, type ReviewLog, type StudySettings } from '../domain/types';
import { speak, useEnglishVoice } from '../shared/lib/speech';
import { useAsync } from '../shared/lib/useAsync';
import { Button, Card, ErrorView, Loading, Screen, SpeakButton } from '../shared/ui';
import { loadStudyData, type StudyData } from './loadStudyData';

export function StudyScreen({ settings, onExit }: { settings: StudySettings; onExit: () => void }) {
  const { t } = useTranslation();
  const { state, reload } = useAsync(() => loadStudyData(settings, new Date()));

  return (
    <Screen title={t('app.title')} onBack={onExit}>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorView error={state.error} onRetry={reload} />}
      {state.status === 'ready' && <Session data={state.data} onExit={onExit} />}
    </Screen>
  );
}

function Session({ data, onExit }: { data: StudyData; onExit: () => void }) {
  const { t } = useTranslation();
  const voice = useEnglishVoice();
  const [startedAt] = useState(() => new Date());
  const [queue, setQueue] = useState(() => data.plan.queue.filter((id) => data.words.has(id)));
  const [cards] = useState(() => new Map(data.cards));
  const [sessionLogs, setSessionLogs] = useState<ReviewLog[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  if (queue.length === 0) {
    const session = computeStats(logsSince(sessionLogs, startedAt), new Date());
    const overall = computeStats([...data.logs, ...sessionLogs], new Date());
    return (
      <Card className="mt-4 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="mt-2 text-2xl font-bold">{t('done.title')}</h2>
        <dl className="mt-6 grid grid-cols-3 gap-2">
          <Result label={t('done.words')} value={String(session.reviewedWords)} />
          <Result
            label={t('done.accuracy')}
            value={session.accuracy === null ? '–' : `${Math.round(session.accuracy * 100)}%`}
          />
          <Result label={t('home.streak')} value={t('home.days', { count: overall.streakDays })} />
        </dl>
        <Button className="mt-6 w-full" onClick={onExit}>
          {t('done.home')}
        </Button>
      </Card>
    );
  }

  const wordId = queue[0];
  const word = data.words.get(wordId)!;

  const rate = async (rating: Rating) => {
    setSaving(true);
    setError(null);
    try {
      const { card, log } = answerCard(
        services.scheduler,
        cards.get(wordId),
        wordId,
        rating,
        new Date(),
      );
      await services.progress.saveCard(card);
      await services.progress.addReviewLog(log);
      cards.set(wordId, card);
      setSessionLogs((logs) => [...logs, log]);
      setQueue((q) => advanceQueue(q, wordId, rating));
      setRevealed(false);
      setTyped('');
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="text-sm text-slate-500" aria-live="polite">
        {t('study.remaining', { count: queue.length })}
      </p>
      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        {word.level === 'custom' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            {t('study.custom')}
          </span>
        )}
        <div className="flex items-center gap-1">
          <h2 className="text-4xl font-bold break-all">{word.headword}</h2>
          <SpeakButton text={word.headword} available={voice} onSpeak={speak} />
        </div>
        {word.pos && <p className="text-slate-500 italic">{word.pos}</p>}
      </Card>

      {!revealed ? (
        <>
          <label className="block">
            <span className="text-sm text-slate-600">{t('study.typeHint')}</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setRevealed(true)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <Button className="min-h-14 text-lg" onClick={() => setRevealed(true)}>
            {t('study.reveal')}
          </Button>
        </>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            {typed.trim() && (
              <p className="text-sm text-slate-500">
                {t('study.yourAnswer')}: <span className="text-slate-800">{typed}</span>
              </p>
            )}
            {word.meaningVi && (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {t('study.meaningVi')}
                </h3>
                <p className="text-lg">{word.meaningVi}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {t('study.definition')}
              </h3>
              <p className="text-lg">{word.definitionEn}</p>
            </div>
            {word.examples.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {t('study.examples')}
                </h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {word.examples.map((ex) => (
                    <li key={ex} className="flex items-start gap-1">
                      <span className="flex-1 pt-2 italic">“{ex}”</span>
                      <SpeakButton text={ex} available={voice} onSpeak={speak} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          {error && <ErrorView error={error} onRetry={() => setError(null)} />}
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((rating) => (
              <Button
                key={rating}
                variant={rating === 'good' ? 'primary' : 'secondary'}
                disabled={saving}
                onClick={() => rate(rating)}
                className="px-1 text-sm sm:text-base"
              >
                {t(`study.rate.${rating}`)}
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}
