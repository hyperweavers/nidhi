import { HttpContext, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, TimeoutError, map, of, throwError, timer } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';
import { ToastService, ToastType } from '@nidhi/shared-toast';

import {
  HTTP_REQUEST_TIMEOUT,
  HTTP_REQUEST_TIMEOUT_OVERRIDE,
  timeoutInterceptor,
} from './timeout.interceptor';

const createLoggerMock = () => ({
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
});

describe('timeoutInterceptor', () => {
  const request = new HttpRequest('GET', '/api/test');
  let toastShow: jest.SpyInstance;
  let loggerWarn: jest.SpyInstance;

  type RunResult = { events: unknown[]; errors: unknown[] };

  const run = (
    reqOverride: HttpRequest<unknown> = request,
    sourceFactory: () => Observable<HttpResponse<unknown>> = () =>
      of(new HttpResponse()),
  ): RunResult => {
    const result: RunResult = { events: [], errors: [] };

    TestBed.runInInjectionContext(() =>
      timeoutInterceptor(reqOverride, () => sourceFactory()),
    ).subscribe({
      next: (event) => result.events.push(event),
      error: (error) => result.errors.push(error),
    });

    return result;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOGGER, useValue: createLoggerMock() }],
    });
    toastShow = jest
      .spyOn(TestBed.inject(ToastService), 'show')
      .mockImplementation(() => undefined);
    loggerWarn = jest.spyOn(TestBed.inject(LOGGER), 'warn');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes through responses arriving before the deadline without toasting', () => {
    const { events, errors } = run();

    expect(events[0]).toBeInstanceOf(HttpResponse);
    expect(errors).toEqual([]);
    expect(toastShow).not.toHaveBeenCalled();
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it('emits TimeoutError and shows a generic error toast when the DI deadline lapses', fakeAsync(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const { events, errors } = run(request, () =>
      timer(10_001).pipe(map(() => new HttpResponse())),
    );

    tick(10_001);

    expect(events).toEqual([]);
    expect(errors[0]).toBeInstanceOf(TimeoutError);
    expect(toastShow).toHaveBeenCalledWith(
      'Request timed out. Please try again later.',
      ToastType.ERROR,
    );
    expect(loggerWarn).toHaveBeenCalledWith(
      'Request timed out after 10000ms: GET /api/test',
    );
  }));

  it('shows at most one toast per throttle window for repeated timeouts', fakeAsync(() => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const slowSource = () => timer(10_001).pipe(map(() => new HttpResponse()));

    run(request, slowSource);
    tick(10_001);
    expect(toastShow).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(2_000_000 + 5_000);
    const throttled = run(request, slowSource);
    tick(10_001);
    expect(throttled.errors[0]).toBeInstanceOf(TimeoutError);
    expect(toastShow).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(2_000_000 + 20_000);
    run(request, slowSource);
    tick(10_001);
    expect(toastShow).toHaveBeenCalledTimes(2);
    expect(loggerWarn).toHaveBeenCalledTimes(3);
  }));

  it('propagates non-timeout errors without toasting or logging', () => {
    const boom = new Error('boom');
    const { events, errors } = run(request, () => throwError(() => boom));

    expect(errors).toEqual([boom]);
    expect(events).toEqual([]);
    expect(toastShow).not.toHaveBeenCalled();
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it('honors a per-request override of the deadline', fakeAsync(() => {
    jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const overrideRequest = request.clone({
      context: new HttpContext().set(HTTP_REQUEST_TIMEOUT_OVERRIDE, 50),
    });
    const { events, errors } = run(overrideRequest, () =>
      timer(51).pipe(map(() => new HttpResponse())),
    );

    tick(51);

    expect(events).toEqual([]);
    expect(errors[0]).toBeInstanceOf(TimeoutError);
    expect(loggerWarn).toHaveBeenCalledWith(
      'Request timed out after 50ms: GET /api/test',
    );
  }));

  it('honors an app-provided DI default over the built-in one', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: HTTP_REQUEST_TIMEOUT, useValue: 100 },
        { provide: LOGGER, useValue: createLoggerMock() },
      ],
    });
    jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    jest
      .spyOn(TestBed.inject(ToastService), 'show')
      .mockImplementation(() => undefined);

    const { errors } = run(request, () =>
      timer(101).pipe(map(() => new HttpResponse())),
    );

    tick(101);

    expect(errors[0]).toBeInstanceOf(TimeoutError);
  }));
});
