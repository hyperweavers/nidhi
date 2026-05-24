import { ErrorHandler, inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

export function provideSentry() {
  return [
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    { provide: Sentry.TraceService, deps: [Router] },
    provideAppInitializer(() => {
      inject(Sentry.TraceService);
    }),
  ];
}
