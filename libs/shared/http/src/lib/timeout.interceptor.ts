import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { TimeoutError, tap, timeout } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';
import { ToastService, ToastType } from '@nidhi/shared-toast';

/** App-wide default deadline in ms; override via DI in app.config.ts. */
export const HTTP_REQUEST_TIMEOUT = new InjectionToken<number>(
  'HTTP_REQUEST_TIMEOUT',
  { factory: () => 10_000 },
);

/** Per-request override; set on HttpContext, 0 falls back to the DI default. */
export const HTTP_REQUEST_TIMEOUT_OVERRIDE = new HttpContextToken<number>(
  () => 0,
);

const GENERIC_TIMEOUT_MESSAGE = 'Request timed out. Please try again later.';
const TOAST_THROTTLE_MS = 10_000;

let lastTimeoutToastAt = 0;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const logger = inject(LOGGER);
  const defaultTimeout = inject(HTTP_REQUEST_TIMEOUT);

  const timeoutMs =
    req.context.get(HTTP_REQUEST_TIMEOUT_OVERRIDE) || defaultTimeout;

  return next(req).pipe(
    timeout(timeoutMs),
    tap({
      error: (error) => {
        if (!(error instanceof TimeoutError)) return;

        logger.warn(
          `Request timed out after ${timeoutMs}ms: ${req.method} ${req.urlWithParams}`,
        );

        const now = Date.now();

        if (now - lastTimeoutToastAt >= TOAST_THROTTLE_MS) {
          lastTimeoutToastAt = now;

          toastService.show(GENERIC_TIMEOUT_MESSAGE, ToastType.ERROR);
        }
      },
    }),
  );
};
