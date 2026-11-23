import { useEffect, useState } from 'react';
import type { StudySettings } from '../domain/types';
import { initI18n } from '../i18n';
import { AboutScreen } from '../features/AboutScreen';
import { AddWordScreen } from '../features/AddWordScreen';
import { HomeScreen } from '../features/HomeScreen';
import { LevelsScreen } from '../features/LevelsScreen';
import { SettingsScreen } from '../features/SettingsScreen';
import { StudyScreen } from '../features/StudyScreen';
import { Loading } from '../shared/ui';
import { services } from './services';

export type View = 'home' | 'levels' | 'study' | 'add' | 'settings' | 'about';

export function App() {
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState<StudySettings | null>(null);

  useEffect(() => {
    void services.settings.getSettings().then((s) => {
      initI18n(s.uiLanguage);
      setSettings(s);
    });
  }, []);

  if (!settings) return <Loading />;

  const updateSettings = async (changes: Partial<StudySettings>) => {
    const next = await services.settings.saveSettings(changes);
    initI18n(next.uiLanguage);
    setSettings(next);
  };
  const home = () => setView('home');

  switch (view) {
    case 'levels':
      return (
        <LevelsScreen
          settings={settings}
          onBack={home}
          onChoose={(level) => updateSettings({ level }).then(home)}
        />
      );
    case 'study':
      return <StudyScreen settings={settings} onExit={home} />;
    case 'add':
      return <AddWordScreen onBack={home} />;
    case 'settings':
      return <SettingsScreen settings={settings} onBack={home} onChange={updateSettings} />;
    case 'about':
      return <AboutScreen onBack={home} />;
    default:
      return <HomeScreen settings={settings} onNavigate={setView} />;
  }
}
