import { Injectable } from '@angular/core';
import { LoggerAdapter } from './logger-adapter';

@Injectable()
export class ConsoleLogger implements LoggerAdapter {
  captureException(error: unknown, ...context: unknown[]): void {
    console.error('[Exception]', error, ...context);
  }

  error(message: unknown, ...args: unknown[]): void {
    console.error('[Error]', message, ...args);
  }

  warn(message: unknown, ...args: unknown[]): void {
    console.warn('[Warn]', message, ...args);
  }

  info(message: unknown, ...args: unknown[]): void {
    console.info('[Info]', message, ...args);
  }
}
