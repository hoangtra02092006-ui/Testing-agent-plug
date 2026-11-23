import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import type { StudySettings } from '../domain/types';
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
    try {
      const now = new Date();
      const word = await services.progress.addCustomWord(
        {
          headword,
          pos: '',
          definitionEn: meaning,
          examples: example.trim() ? [example.trim()] : [],
        },
        (id) => services.scheduler.createCard(id, now),
      );
      // A new word only enters today's queue while the daily new-word limit allows it.
      const today = await loadStudyData(settings, new Date());
      const key = today.plan.queue.includes(word.id) ? 'add.saved' : 'add.savedTomorrow';
      setMessage({ ok: true, text: t(key, { word: word.headword }) });
      setHeadword('');
      setMeaning('');
      setExample('');
    } catch (err) {
      setMessage({ ok: false, text: describeError(err, t).message });
    } finally {
      setSaving(false);
    }
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
