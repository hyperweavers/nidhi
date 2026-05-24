import { ConsoleLogger } from './console-logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  it('should be created', () => {
    expect(logger).toBeTruthy();
  });
});
