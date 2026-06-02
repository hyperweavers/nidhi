import { ConsoleLogger } from './console-logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(logger).toBeTruthy();
  });

  it('captureException should log error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.captureException(new Error('test'), 'ctx');
    expect(spy).toHaveBeenCalledWith('[Exception]', new Error('test'), 'ctx');
  });

  it('error should log error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('err msg');
    expect(spy).toHaveBeenCalledWith('[Error]', 'err msg');
  });

  it('warn should log warning', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    logger.warn('warn msg');
    expect(spy).toHaveBeenCalledWith('[Warn]', 'warn msg');
  });

  it('info should log info', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation();
    logger.info('info msg');
    expect(spy).toHaveBeenCalledWith('[Info]', 'info msg');
  });
});
