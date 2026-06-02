import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { initSentry } from '@nidhi/shared-sentry';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { handlers } from './app/mocks/handlers';
import { SENTRY_DSN } from './generated/sentry-config';
import { APP_VERSION } from './generated/version';

if (!isDevMode()) {
  initSentry(SENTRY_DSN, APP_VERSION);
}

async function prepareApp() {
  const { setupWorker } = await import('msw/browser');
  const worker = setupWorker(...handlers);
  return worker.start({ onUnhandledRequest: 'bypass' });
}

if (isDevMode()) {
  prepareApp()
    .then(() => bootstrapApplication(AppComponent, appConfig))
    .catch((err) => {
      console.error('MSW failed to start', err);
      return bootstrapApplication(AppComponent, appConfig);
    })
    .catch((err) => {
      console.error('Bootstrap error:', err);
    });
} else {
  bootstrapApplication(AppComponent, appConfig).catch((err) => {
    Sentry.captureException(err);
  });
}
