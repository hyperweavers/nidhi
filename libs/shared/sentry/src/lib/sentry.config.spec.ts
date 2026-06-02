import { initSentry } from './sentry.config';

jest.mock('@sentry/angular', () => ({
  init: jest.fn(),
}));

import * as Sentry from '@sentry/angular';

describe('initSentry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call Sentry.init with the provided DSN', () => {
    const dsn = 'https://key@sentry.io/project';
    initSentry(dsn);
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn }));
  });

  it('should pass release when provided', () => {
    initSentry('https://key@sentry.io/project', '1.0.0');
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ release: '1.0.0' }),
    );
  });

  it('should set sendDefaultPii to false', () => {
    initSentry('https://key@sentry.io/project');
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ sendDefaultPii: false }),
    );
  });

  it('should strip query string and hash from event request url in beforeSend', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const event = {
      request: { url: 'https://example.com/path?q=1#hash' },
    };
    const result = config.beforeSend(event);
    expect(result.request.url).toBe('https://example.com/path');
  });

  it('should strip query string and hash from event tags url in beforeSend', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const event = {
      tags: { url: 'https://example.com/path?q=1#hash' },
    };
    const result = config.beforeSend(event);
    expect(result.tags['url']).toBe('https://example.com/path');
  });

  it('should return event unchanged when no request url', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const event = { request: {} };
    const result = config.beforeSend(event);
    expect(result).toBe(event);
  });

  it('should strip query string and hash from log attributes url in beforeSendLog', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const log = {
      attributes: { url: 'https://example.com/path?q=1#hash' },
    };
    const result = config.beforeSendLog(log);
    expect(result.attributes['url']).toBe('https://example.com/path');
  });

  it('should return log unchanged when no attributes url', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const log = { attributes: {} };
    const result = config.beforeSendLog(log);
    expect(result).toBe(log);
  });

  it('should handle event without request property in beforeSend', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const event = { extra: 'data' };
    const result = config.beforeSend(event);
    expect(result).toBe(event);
  });

  it('should handle event without tags property in beforeSend', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const event = { request: {} };
    const result = config.beforeSend(event);
    expect(result).toBe(event);
  });

  it('should handle log without attributes property in beforeSendLog', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const log = { message: 'test' };
    const result = config.beforeSendLog(log);
    expect(result).toBe(log);
  });

  it('should filter out HttpContext integration', () => {
    initSentry('https://key@sentry.io/project');
    const config = (Sentry.init as jest.Mock).mock.calls[0][0];
    const integrations = [
      { name: 'HttpContext' },
      { name: 'HttpClient' },
      { name: 'BrowserTracing' },
    ];
    const result = config.integrations(integrations);
    expect(result).toHaveLength(2);
    expect(result.find((i: any) => i.name === 'HttpContext')).toBeUndefined();
  });
});
