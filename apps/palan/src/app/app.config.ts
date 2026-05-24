import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { ConsoleLogger, LOGGER } from '@nidhi/shared-logger';
import { provideSentry, SentryLogger } from '@nidhi/shared-sentry';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(),
    ...(!isDevMode() ? provideSentry() : []),
    {
      provide: LOGGER,
      useClass: isDevMode() ? ConsoleLogger : SentryLogger,
    },
  ],
};
