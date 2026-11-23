import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CefrLevel, StudySettings } from '../domain/types';
import { setLanguage } from '../i18n';
import { AboutScreen } from '../features/AboutScreen';
import { AddWordScreen } from '../features/AddWordScreen';
import { HomeScreen } from '../features/HomeScreen';
import { LevelsScreen } from '../features/LevelsScreen';
import { SettingsScreen } from '../features/SettingsScreen';
import { StudyScreen } from '../features/StudyScreen';
import { toError } from '../shared/lib/errors';
import { ErrorView, Loading, Screen } from '../shared/ui';
import { services } from './services';

export type View = 'home' | 'levels' | 'study' | 'add' | 'settings' | 'about';

export function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState<StudySettings | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoadError(null);
    services.settings.getSettings().then(
      (s) => {
        setLanguage(s.uiLanguage);
        setSettings(s);
      },
      (err: unknown) => setLoadError(toError(err)),
    );
  }, [attempt]);

  if (!settings) {
    return (
      <Screen title={t('app.title')}>
        {loadError ? (
          <ErrorView error={loadError} onRetry={() => setAttempt((a) => a + 1)} />
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  /** Saves settings; rejects on a storage error so the calling screen can show it. */
  const updateSettings = async (changes: Partial<StudySettings>) => {
    const next = await services.settings.saveSettings(changes);
    setLanguage(next.uiLanguage);
    setSettings(next);
    return next;
  };
  const home = () => setView('home');

  switch (view) {
    case 'levels':
      return (
        <LevelsScreen
          settings={settings}
          onBack={home}
          onChoose={async (level: CefrLevel) => {
            await updateSettings({ level });
            home();
          }}
        />
      );
    case 'study':
      return <StudyScreen settings={settings} onExit={home} />;
    case 'add':
      return <AddWordScreen settings={settings} onBack={home} />;
    case 'settings':
      return <SettingsScreen settings={settings} onBack={home} onChange={updateSettings} />;
    case 'about':
      return <AboutScreen onBack={home} />;
    default:
      return <HomeScreen settings={settings} onNavigate={setView} />;
  }
}
