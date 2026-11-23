import type { TFunction } from 'i18next';
import { AppError } from '../../domain/errors';

/** Storage errors raised by IndexedDB / Dexie, by error name. */
const STORAGE_FULL = new Set(['QuotaExceededError']);
const STORAGE_UNAVAILABLE = new Set([
  'OpenFailedError',
  'MissingAPIError',
  'DatabaseClosedError',
  'InvalidStateError',
  'SecurityError',
  'UnknownError',
]);

function storageKind(err: unknown): 'storageFull' | 'storageUnavailable' | null {
  // Dexie wraps the browser error in `inner`; check both.
  for (let e = err as { name?: string; inner?: unknown } | undefined; e; e = e.inner as typeof e) {
    if (e.name && STORAGE_FULL.has(e.name)) return 'storageFull';
    if (e.name && STORAGE_UNAVAILABLE.has(e.name)) return 'storageUnavailable';
  }
  return null;
}

/** Message for the learner in the interface language; technical text only as detail. */
export function describeError(err: unknown, t: TFunction): { message: string; detail: string } {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  if (err instanceof AppError) return { message: t(`errors.${err.code}`, err.params), detail };
  const kind = storageKind(err);
  return { message: t(`errors.${kind ?? 'unknown'}`), detail };
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
