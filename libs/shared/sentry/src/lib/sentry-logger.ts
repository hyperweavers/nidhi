import { Injectable } from '@angular/core';
import { LoggerAdapter } from '@nidhi/shared-logger';
import * as Sentry from '@sentry/angular';

@Injectable()
export class SentryLogger implements LoggerAdapter {
  captureException(error: unknown): void {
    Sentry.captureException(error);
  }

  error(message: unknown): void {
    Sentry.logger.error(String(message));
  }

  warn(message: unknown): void {
    Sentry.logger.warn(String(message));
  }

  info(message: unknown): void {
    Sentry.logger.info(String(message));
  }
}
