const mockInject = jest.fn();
const mockCreateErrorHandler = jest.fn(() => 'error-handler' as any);
const mockTraceService = {};

jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  inject: mockInject,
  provideAppInitializer: jest.fn((fn: () => void) => {
    fn();
    return { provide: 'APP_INITIALIZER', useFactory: fn, multi: true };
  }),
}));

jest.mock('@sentry/angular', () => ({
  createErrorHandler: mockCreateErrorHandler,
  TraceService: mockTraceService,
}));

import { ErrorHandler } from '@angular/core';
import { provideSentry } from './sentry.providers';

describe('provideSentry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an array of providers', () => {
    const providers = provideSentry();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBe(3);
  });

  it('should provide ErrorHandler using Sentry.createErrorHandler', () => {
    const providers = provideSentry();
    const errorHandlerProvider = providers[0];
    expect(errorHandlerProvider.provide).toBe(ErrorHandler);
    expect(errorHandlerProvider.useValue).toBe('error-handler');
    expect(mockCreateErrorHandler).toHaveBeenCalled();
  });

  it('should provide TraceService with Router dependency', () => {
    const providers = provideSentry();
    const traceProvider = providers[1];
    expect(traceProvider.provide).toBe(mockTraceService);
    expect(traceProvider.deps).toBeDefined();
  });

  it('should call inject(TraceService) in app initializer', () => {
    provideSentry();
    expect(mockInject).toHaveBeenCalledWith(mockTraceService);
  });
});
