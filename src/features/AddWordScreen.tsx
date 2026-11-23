import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import { isInTodaysQueue } from '../domain/session';
import type { StudySettings, Word } from '../domain/types';
import { describeError } from '../shared/lib/errors';
import { Button, Card, Screen, StatusMessage, TextField } from '../shared/ui';
import { loadStudyData } from './loadStudyData';

export function AddWordScreen({
  settings,
  onBack,
}: {
  settings: StudySettings;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [headword, setHeadword] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!headword.trim() || !meaning.trim()) {
      setMessage({ ok: false, text: t('add.required') });
      return;
    }
    setSaving(true);
    let word;
    try {
      const now = new Date();
      word = await services.progress.addCustomWord(
        {
          headword,
          pos: '',
          definitionEn: meaning,
          examples: example.trim() ? [example.trim()] : [],
        },
        (id) => services.scheduler.createCard(id, now),
      );
    } catch (err) {
      setMessage({ ok: false, text: describeError(err, t).message });
      setSaving(false);
      return;
    }
    // Saved: clear the form at once so a second press cannot add a duplicate.
    setHeadword('');
    setMeaning('');
    setExample('');
    setMessage({ ok: true, text: await savedMessage(word) });
    setSaving(false);
  };

  /** Says whether the word is studied today; only picks the wording, so a failure is not an error. */
  const savedMessage = async (word: Word) => {
    try {
      const today = await loadStudyData(settings, new Date());
      if (!isInTodaysQueue(today.plan, word.id))
        return t('add.savedTomorrow', { word: word.headword });
    } catch {
      // Word files or progress could not be read (e.g. offline before the first load): the word
      // is saved either way, so fall back to the general message.
    }
    return t('add.saved', { word: word.headword });
  };

  return (
    <Screen title={t('add.title')} onBack={onBack}>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <TextField
            label={t('add.headword')}
            value={headword}
            onChange={(e) => setHeadword(e.target.value)}
            required
          />
          <TextField
            label={t('add.meaning')}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            required
          />
          <TextField
            label={t('add.example')}
            value={example}
            onChange={(e) => setExample(e.target.value)}
          />
          {message && <StatusMessage ok={message.ok}>{message.text}</StatusMessage>}
          <Button type="submit" disabled={saving}>
            {t('common.save')}
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
