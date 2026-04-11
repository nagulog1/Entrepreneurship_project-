/**
 * Unit tests for monitoring/error capture utilities.
 */

import { captureError, captureMessage, serverLogger } from '@/lib/monitoring';

describe('Monitoring', () => {
  const consoleSpy = {
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    info: jest.spyOn(console, 'info').mockImplementation(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.info.mockRestore();
  });

  describe('captureError', () => {
    it('logs errors to console', async () => {
      await captureError(new Error('test error'), { component: 'TestComponent' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('handles non-Error objects', async () => {
      await captureError('string error', { component: 'TestComponent' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('logs warnings with warning severity', async () => {
      await captureError(new Error('test warning'), { component: 'TestComponent' }, 'warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('captureMessage', () => {
    it('logs info messages', async () => {
      await captureMessage('test info', { component: 'Test' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('logs error-level messages', async () => {
      await captureMessage('test error msg', { component: 'Test' }, 'error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('serverLogger', () => {
    it('logs info', () => {
      serverLogger.info('test', { key: 'value' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('logs warnings', () => {
      serverLogger.warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('logs errors', () => {
      serverLogger.error('test error', new Error('err'));
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});
