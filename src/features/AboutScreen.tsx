import { useTranslation } from 'react-i18next';
import { Card, Screen } from '../shared/ui';

const SOURCES = [
  {
    name: 'CEFR-J Wordlist Version 1.5',
    detail: 'Compiled by Yukio Tono, Tokyo University of Foreign Studies (Tono Laboratory).',
    url: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
  },
  {
    name: 'Octanove Vocabulary Profile C1/C2 1.0',
    detail: 'Octanove Labs — CC BY-SA 4.0.',
    url: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
  },
  {
    name: 'Open English WordNet 2024',
    detail: 'Definitions and examples — CC BY 4.0.',
    url: 'https://github.com/globalwordnet/english-wordnet',
  },
  {
    name: 'Wiktionary (English)',
    detail: 'Definitions and examples for words WordNet does not cover — CC BY-SA 4.0.',
    url: 'https://en.wiktionary.org/',
  },
];

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <Screen title={t('about.title')} onBack={onBack}>
      <Card>
        <p>{t('about.body')}</p>
        <p className="mt-3 text-sm text-slate-600">{t('about.missing')}</p>
      </Card>
      <Card>
        <h2 className="font-semibold">{t('about.sources')}</h2>
        <ul className="mt-2 flex flex-col gap-3 text-sm">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-700 underline"
              >
                {s.name}
              </a>
              <p className="text-slate-600">{s.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">public/words/*.json: CC BY-SA 4.0.</p>
      </Card>
    </Screen>
  );
}
