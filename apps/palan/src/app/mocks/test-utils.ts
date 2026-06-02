import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { LOGGER } from '@nidhi/shared-logger';
import { setupServer } from 'msw/node';
import { errorHandlers, handlers } from './handlers';

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

export const server = setupServer(...handlers);

export function setupTestServer(): void {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

export function useErrorHandlers(): void {
  server.use(...errorHandlers);
}

export function resetMockLogger(): void {
  jest.clearAllMocks();
}
