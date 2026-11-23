import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import type { View } from '../app/App';
import { computeStats } from '../domain/stats';
import { needsBackupReminder } from '../domain/study';
import type { StudySettings } from '../domain/types';
import { useAsync } from '../shared/lib/useAsync';
import { Button, Card, ErrorView, Loading, Screen } from '../shared/ui';
import { loadStudyData } from './loadStudyData';

export function HomeScreen({
  settings,
  onNavigate,
}: {
  settings: StudySettings;
  onNavigate: (v: View) => void;
}) {
  const { t } = useTranslation();
  const { state, reload } = useAsync(async () => {
    const now = new Date();
    const [data, lastBackupAt] = await Promise.all([
      loadStudyData(settings, now),
      services.settings.getLastBackupAt(),
    ]);
    return {
      ...data,
      stats: computeStats(data.logs, now),
      remindBackup: needsBackupReminder(data.logs[0]?.reviewedAt, lastBackupAt, now),
    };
  }, [settings.level, settings.newWordsPerDay]);

  return (
    <Screen
      title={t('app.title')}
      actions={
        <nav className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('add')}>
            + {t('nav.addWord')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('nav.settings')}
            onClick={() => onNavigate('settings')}
          >
            ⚙
          </Button>
        </nav>
      }
    >
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorView error={state.error} onRetry={reload} />}
      {state.status === 'ready' && (
        <>
          {state.data.remindBackup && (
            <Card tone="warning">
              <p className="text-sm text-amber-900">{t('home.backupReminder')}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => onNavigate('settings')}
              >
                {t('home.backupNow')}
              </Button>
            </Card>
          )}
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{t('home.level')}</p>
              <p className="text-3xl font-bold text-indigo-700">{settings.level}</p>
            </div>
            <Button variant="secondary" onClick={() => onNavigate('levels')}>
              {t('home.changeLevel')}
            </Button>
          </Card>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('home.due')} value={state.data.plan.dueCount} />
            <Stat label={t('home.new')} value={state.data.plan.newCount} />
            <Stat
              label={t('home.streak')}
              value={t('home.days', { count: state.data.stats.streakDays })}
            />
          </div>
          {state.data.plan.queue.length > 0 ? (
            <Button size="lg" className="mt-2" onClick={() => onNavigate('study')}>
              {t('home.start')}
            </Button>
          ) : (
            <Card className="text-center text-slate-600">{t('home.doneToday')}</Card>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-auto self-center"
            onClick={() => onNavigate('about')}
          >
            {t('nav.about')}
          </Button>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="compact" className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs leading-tight text-slate-500">{label}</p>
    </Card>
  );
}
