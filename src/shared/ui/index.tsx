import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 disabled:text-slate-400',
  ghost: 'text-indigo-700 hover:bg-indigo-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}

/** Page frame: header with optional back button, centred column that works from 360px up. */
export function Screen({
  title,
  onBack,
  actions,
  children,
}: {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8">
      <header className="flex min-h-16 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('nav.back')}
            className="-ml-2 rounded-lg p-2 text-2xl leading-none text-slate-600 hover:bg-slate-200"
          >
            ←
          </button>
        )}
        <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
        {actions}
      </header>
      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <p role="status" className="py-12 text-center text-slate-500">
      {t('common.loading')}
    </p>
  );
}

export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="text-center">
      <p className="font-semibold text-red-700">{t('common.error')}</p>
      <p className="mt-1 text-sm break-words text-slate-600">{error.message}</p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </Card>
  );
}

export function SpeakButton({
  text,
  available,
  onSpeak,
}: {
  text: string;
  available: boolean;
  onSpeak: (t: string) => void;
}) {
  const { t } = useTranslation();
  const label = available ? t('study.speak') : t('study.noVoice');
  return (
    <button
      type="button"
      onClick={() => onSpeak(text)}
      disabled={!available}
      aria-label={label}
      title={label}
      className="rounded-full p-2 text-xl text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      🔊
    </button>
  );
}
