import { TestBed } from '@angular/core/testing';
import { SentryLogger } from './sentry-logger';

describe('SentryLogger', () => {
  let logger: SentryLogger;

  beforeEach(() => {
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
});
