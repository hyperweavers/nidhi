import * as Sentry from '@sentry/angular';

export function initSentry(dsn: string, release?: string): void {
  Sentry.init({
    dsn,
    release,
    sendDefaultPii: false,
    sendClientReports: false,
    tracePropagationTargets: [],
    tracesSampleRate: 0.1,
    enableLogs: true,

    integrations: (integrations) =>
      integrations.filter((i) => i.name !== 'HttpContext'),

    beforeSend: (event) => {
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/\?.*$/, '')
          .replace(/#.*$/, '');
      }
      if (event.tags?.['url']) {
        event.tags['url'] = String(event.tags['url'])
          .replace(/\?.*$/, '')
          .replace(/#.*$/, '');
      }
      return event;
    },

    beforeSendLog: (log) => {
      if (log.attributes?.['url']) {
        log.attributes['url'] = String(log.attributes['url'])
          .replace(/\?.*$/, '')
          .replace(/#.*$/, '');
      }
      return log;
    },

    normalizeDepth: 2,
    maxValueLength: 500,
  });
}
