import { InjectionToken } from '@angular/core';

export interface LoggerAdapter {
  captureException(error: unknown, ...context: unknown[]): void;
  error(message: unknown, ...args: unknown[]): void;
  warn(message: unknown, ...args: unknown[]): void;
  info(message: unknown, ...args: unknown[]): void;
}

export const LOGGER = new InjectionToken<LoggerAdapter>('LOGGER');
