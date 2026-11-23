import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { describeError } from '../lib/errors';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 disabled:text-slate-400',
  ghost: 'text-indigo-700 hover:bg-indigo-50',
};

const SIZES = {
  md: 'min-h-12 px-4 text-base',
  sm: 'min-h-10 px-2 text-sm',
  lg: 'min-h-14 px-4 text-lg',
  /** Narrow buttons in a row of four (rating buttons at 360px). */
  tight: 'min-h-12 px-1 text-sm sm:text-base',
} as const;

/** Variant and size are props so screens never override the base classes; className is layout only. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

const CARD_TONES = {
  default: 'bg-white ring-slate-200',
  warning: 'bg-amber-50 ring-amber-200',
} as const;
const CARD_PADDING = { normal: 'p-5', compact: 'p-3', tall: 'px-5 py-8' } as const;

/**
 * Surface for grouped content. Colour and padding are props (not className) so a screen never
 * fights the base classes; long words or URLs wrap instead of widening the page.
 */
export function Card({
  children,
  tone = 'default',
  padding = 'normal',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof CARD_TONES;
  padding?: keyof typeof CARD_PADDING;
  /** Layout only (flex, text alignment, margins); not colour or padding. */
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl shadow-sm ring-1 [overflow-wrap:anywhere] ${CARD_TONES[tone]} ${CARD_PADDING[padding]} ${className}`}
    >
      {children}
    </section>
  );
}

const INPUT_WIDTH = { full: 'w-full', short: 'w-24' } as const;

/** Text input with the app's shared look. */
export function Input({
  width = 'full',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'width'> & {
  width?: keyof typeof INPUT_WIDTH;
}) {
  return (
    <input
      className={`min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-indigo-500 focus:outline-none ${INPUT_WIDTH[width]}`}
      {...props}
    />
  );
}

/** Labelled text input. */
export function TextField({
  label,
  required,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'width'> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <span className="mt-1 block">
        <Input required={required} {...props} />
      </span>
    </label>
  );
}

/** Result line under a form: green on success, red on failure. */
export function StatusMessage({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`[overflow-wrap:anywhere] ${ok ? 'text-green-700' : 'text-red-700'}`}
    >
      {children}
    </p>
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

/** Error explained in the interface language, with the technical text folded away. */
export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { message, detail } = describeError(error, t);
  return (
    <Card className="text-center">
      <p className="font-semibold text-red-700">{t('common.error')}</p>
      <p className="mt-1 text-sm text-slate-700">{message}</p>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">{t('errors.details')}</summary>
        <p className="mt-1">{detail}</p>
      </details>
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
