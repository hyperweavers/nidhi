import { Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LOGGER } from '@nidhi/shared-logger';

export const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

export const loggerProvider: Provider = {
  provide: LOGGER,
  useValue: mockLogger,
};

export const commonTestProviders: Provider[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
  loggerProvider,
];

export function resetMockLogger(): void {
  jest.clearAllMocks();
}
