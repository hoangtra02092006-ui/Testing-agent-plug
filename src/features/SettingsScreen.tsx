import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import { exportBackup, importBackup, parseBackup, type BackupFile } from '../data/backup';
import { AppError } from '../domain/errors';
import { parseNewWordsPerDay } from '../domain/study';
import type { StudySettings } from '../domain/types';
import { describeError } from '../shared/lib/errors';
import { Button, Card, Input, Screen, StatusMessage } from '../shared/ui';

export function SettingsScreen({
  settings,
  onBack,
  onChange,
}: {
  settings: StudySettings;
  onBack: () => void;
  onChange: (changes: Partial<StudySettings>) => Promise<StudySettings>;
}) {
  const { t } = useTranslation();
  const [perDay, setPerDay] = useState(String(settings.newWordsPerDay));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const report = (ok: boolean, text: string) => setMessage({ ok, text });
  /** Runs an action and reports any failure in the interface language. */
  const attempt = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (err) {
      report(false, describeError(err, t).message);
    }
  };

  const savePerDay = () =>
    attempt(async () => {
      const value = parseNewWordsPerDay(perDay);
      if (value === null) throw new AppError('perDayRange', `Invalid new words per day: ${perDay}`);
      const saved = await onChange({ newWordsPerDay: value });
      setPerDay(String(saved.newWordsPerDay));
      report(true, t('settings.saved'));
    });

  const changeLanguage = (uiLanguage: StudySettings['uiLanguage']) =>
    attempt(async () => {
      await onChange({ uiLanguage });
      setMessage(null);
    });

  const download = () =>
    attempt(async () => {
      const now = new Date();
      const backup = await exportBackup(services.db, now);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocab-backup-${now.toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await services.settings.markBackedUp(now);
    });

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await attempt(async () => {
      setPending(parseBackup(await file.text(), services.scheduler));
      setMessage(null);
    });
  };

  const confirmImport = async () => {
    if (!pending) return;
    await attempt(async () => {
      await importBackup(services.db, pending);
      setPending(null);
      // The progress now matches a backup file, so the reminder restarts from today.
      await services.settings.markBackedUp(new Date());
      const restored = await onChange(await services.settings.getSettings());
      setPerDay(String(restored.newWordsPerDay));
      report(true, t('settings.importDone'));
    });
  };

  return (
    <Screen title={t('settings.title')} onBack={onBack}>
      <Card>
        <h2 className="font-semibold">{t('settings.language')}</h2>
        <div
          className="mt-3 grid grid-cols-2 gap-2"
          role="group"
          aria-label={t('settings.language')}
        >
          {(['vi', 'en'] as const).map((lang) => (
            <Button
              key={lang}
              variant={settings.uiLanguage === lang ? 'primary' : 'secondary'}
              aria-pressed={settings.uiLanguage === lang}
              onClick={() => changeLanguage(lang)}
            >
              {lang === 'vi' ? 'Tiếng Việt' : 'English'}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <label htmlFor="per-day" className="font-semibold">
          {t('settings.newPerDay')}
        </label>
        <div className="mt-3 flex gap-2">
          <Input
            id="per-day"
            width="short"
            type="number"
            min={1}
            max={100}
            inputMode="numeric"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
          <Button variant="secondary" onClick={savePerDay}>
            {t('common.save')}
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">{t('settings.backup')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('settings.backupHint')}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={download}>
            {t('settings.export')}
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            {t('settings.import')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={chooseFile}
          />
        </div>
        {pending && (
          <div
            className="mt-4 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200"
            role="alertdialog"
            aria-label={t('settings.import')}
          >
            <p className="text-sm text-amber-900">{t('settings.importConfirm')}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={confirmImport}>{t('settings.import')}</Button>
              <Button variant="secondary" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>
      {message && <StatusMessage ok={message.ok}>{message.text}</StatusMessage>}
    </Screen>
  );
}
