import { TestBed } from '@angular/core/testing';
import { SentryLogger } from './sentry-logger';

jest.mock('@sentry/angular', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
  return {
    captureException: jest.fn(),
    logger: mockLogger,
  };
});

import * as Sentry from '@sentry/angular';

describe('SentryLogger', () => {
  let logger: SentryLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [SentryLogger],
    });
    logger = TestBed.inject(SentryLogger);
  });

  it('should implement LoggerAdapter', () => {
    expect(logger).toBeTruthy();
    expect(typeof logger.captureException).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
  });

  it('captureException should call Sentry.captureException', () => {
    const error = new Error('test error');
    logger.captureException(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('error should call Sentry.logger.error', () => {
    logger.error('err msg');
    expect(Sentry.logger.error).toHaveBeenCalledWith('err msg');
  });

  it('warn should call Sentry.logger.warn', () => {
    logger.warn('warn msg');
    expect(Sentry.logger.warn).toHaveBeenCalledWith('warn msg');
  });

  it('info should call Sentry.logger.info', () => {
    logger.info('info msg');
    expect(Sentry.logger.info).toHaveBeenCalledWith('info msg');
  });
});
