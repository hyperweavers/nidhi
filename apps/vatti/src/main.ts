import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { initSentry } from '@nidhi/shared-sentry';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { SENTRY_DSN } from './generated/sentry-config';
import { APP_VERSION } from './generated/version';

if (!isDevMode()) {
  initSentry(SENTRY_DSN, APP_VERSION);
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  if (!isDevMode()) {
    Sentry.captureException(err);
  } else {
    console.error('Bootstrap error:', err);
  }
});
