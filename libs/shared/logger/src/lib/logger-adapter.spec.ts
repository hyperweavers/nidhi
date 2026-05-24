import { LOGGER } from './logger-adapter';

describe('LoggerAdapter', () => {
  it('should have LOGGER injection token defined', () => {
    expect(LOGGER).toBeDefined();
  });
});
