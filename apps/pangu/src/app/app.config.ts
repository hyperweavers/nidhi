import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import {
  ApplicationConfig,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { ArcElement, DoughnutController, Legend, Tooltip } from 'chart.js';
import { provideCharts } from 'ng2-charts';

import { HTTP_REQUEST_TIMEOUT, timeoutInterceptor } from '@nidhi/shared-http';
import { ConsoleLogger, LOGGER } from '@nidhi/shared-logger';
import { provideSentry, SentryLogger } from '@nidhi/shared-sentry';
import { TOAST_DISMISS_TIMEOUT } from '@nidhi/shared-toast';
import { appRoutes } from './app.routes';
import { Constants } from './constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(withXhr(), withInterceptors([timeoutInterceptor])),
    {
      provide: HTTP_REQUEST_TIMEOUT,
      useValue: Constants.configs.defaults.HTTP_REQUEST_TIMEOUT,
    },
    {
      provide: TOAST_DISMISS_TIMEOUT,
      useValue: Constants.configs.defaults.TOAST_DISMISS_TIMEOUT,
    },
    provideCharts({
      registerables: [DoughnutController, ArcElement, Legend, Tooltip],
    }),
    ...(!isDevMode() ? provideSentry() : []),
    {
      provide: LOGGER,
      useClass: isDevMode() ? ConsoleLogger : SentryLogger,
    },
  ],
};
