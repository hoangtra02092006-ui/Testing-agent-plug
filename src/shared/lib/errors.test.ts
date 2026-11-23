import i18n from '../../i18n';
import { AppError } from '../../domain/errors';
import { describeError } from './errors';

const t = i18n.getFixedT('vi');

describe('describeError (AC9: errors in the interface language)', () => {
  it('translates app errors with their parameters', () => {
    const err = new AppError('backupInvalid', 'Invalid backup: cards[0].state', {
      where: 'cards[0].state',
    });
    expect(describeError(err, t)).toEqual({
      message: 'Bản sao lưu bị hỏng ở cards[0].state.',
      detail: 'AppError: Invalid backup: cards[0].state',
    });
  });

  it('recognises storage errors, also when wrapped by Dexie', () => {
    const quota = Object.assign(new Error('x'), { name: 'QuotaExceededError' });
    expect(describeError(quota, t).message).toMatch(/đầy/);
    const wrapped = Object.assign(new Error('y'), { name: 'AbortError', inner: quota });
    expect(describeError(wrapped, t).message).toMatch(/đầy/);
    const blocked = Object.assign(new Error('z'), { name: 'OpenFailedError' });
    expect(describeError(blocked, t).message).toMatch(/không cho ứng dụng lưu/);
  });

  it('falls back to a general message for anything else', () => {
    expect(describeError('boom', t)).toEqual({
      message: 'Có lỗi không mong muốn. Vui lòng thử lại.',
      detail: 'boom',
    });
  });
});
