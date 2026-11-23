/**
 * Errors the learner can be told about. `code` selects a translated message (errors.<code> in the
 * i18n files) and `params` fills it; `message` stays in English for logs and tests.
 */
export type ErrorCode =
  | 'backupNotJson'
  | 'backupWrongApp'
  | 'backupVersion'
  | 'backupMissingList'
  | 'backupInvalid'
  | 'backupDuplicate'
  | 'wordsLoad'
  | 'wordsFormat'
  | 'customWordIncomplete'
  | 'perDayRange';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params: Record<string, string | number>;

  constructor(code: ErrorCode, message: string, params: Record<string, string | number> = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.params = params;
  }
}
