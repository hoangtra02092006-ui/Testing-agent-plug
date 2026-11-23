import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { services } from '../app/services';
import { Button, Card, Screen } from '../shared/ui';

export function AddWordScreen({ onBack }: { onBack: () => void }) {
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
      setMessage({ ok: true, text: t('add.saved', { word: word.headword }) });
      setHeadword('');
      setMeaning('');
      setExample('');
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={t('add.title')} onBack={onBack}>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label={t('add.headword')} value={headword} onChange={setHeadword} required />
          <Field label={t('add.meaning')} value={meaning} onChange={setMeaning} required />
          <Field label={t('add.example')} value={example} onChange={setExample} />
          {message && (
            <p role="status" className={message.ok ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {t('common.save')}
          </Button>
        </form>
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:border-indigo-500 focus:outline-none"
      />
    </label>
  );
}
