import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { take } from 'rxjs';

import { Constants } from '../../constants';
import { mockCurrencyListResponse, mockForexResponse } from '../../mocks/data';
import { CurrencyService } from './currency.service';

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

describe('CurrencyService', () => {
  let service: CurrencyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: LOGGER, useValue: mockLogger },
      ],
    });
    service = TestBed.inject(CurrencyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrencyList', () => {
    it('should return mapped currency list', (done) => {
      service
        .getCurrencyList()
        .pipe(take(1))
        .subscribe((currencies) => {
          expect(currencies.length).toBe(4);
          expect(currencies[0].code).toBe('INR');
          expect(currencies[0].country).toBe('India');
          expect(currencies[0].icon).toContain('economictimes');
          done();
        });

      const req = httpMock.expectOne(Constants.api.CURRENCY_LIST);
      expect(req.request.method).toBe('GET');
      req.flush(mockCurrencyListResponse);
    });

    it('should return empty array on HTTP error', (done) => {
      service
        .getCurrencyList()
        .pipe(take(1))
        .subscribe((currencies) => {
          expect(currencies).toEqual([]);
          expect(mockLogger.error).toHaveBeenCalled();
          done();
        });

      const req = httpMock.expectOne(Constants.api.CURRENCY_LIST);
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('getForexRates', () => {
    it('should return mapped currency matrix on successful response', (done) => {
      service
        .getForexRates()
        .pipe(take(1))
        .subscribe((matrix) => {
          expect(Object.keys(matrix).length).toBeGreaterThan(0);
          expect(matrix['INR']).toBeDefined();
          expect(matrix['INR']['USD']).toBe(0.012);
          expect(matrix['USD']['INR']).toBe(83.5);
          done();
        });

      const req = httpMock.expectOne(Constants.api.FOREX);
      expect(req.request.method).toBe('GET');
      req.flush(mockForexResponse);
    });

    it('should log error and return empty object when success is not 1', (done) => {
      service
        .getForexRates()
        .pipe(take(1))
        .subscribe((matrix) => {
          expect(matrix).toEqual({});
          expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to fetch forex rates!',
          );
          done();
        });

      const req = httpMock.expectOne(Constants.api.FOREX);
      req.flush({ success: 0, data: { headers: [], flags: [], data: [] } });
    });

    it('should return empty object on HTTP error', (done) => {
      service
        .getForexRates()
        .pipe(take(1))
        .subscribe((matrix) => {
          expect(matrix).toEqual({});
          expect(mockLogger.error).toHaveBeenCalled();
          done();
        });

      const req = httpMock.expectOne(Constants.api.FOREX);
      req.error(new ProgressEvent('Network error'));
    });

    it('should skip unmapped currency codes in headers', (done) => {
      const forexWithUnknown = {
        success: 1,
        data: {
          headers: ['Rupee', 'USD', 'UnknownCurrency'],
          flags: ['in', 'us', 'xx'],
          data: [
            [1, 0.012, 0],
            [83.5, 1, 0],
            [0, 0, 1],
          ],
        },
      };

      service
        .getForexRates()
        .pipe(take(1))
        .subscribe((matrix) => {
          expect(matrix['INR']).toBeDefined();
          expect(matrix['UnknownCurrency']).toBeUndefined();
          done();
        });

      httpMock.expectOne(Constants.api.FOREX).flush(forexWithUnknown);
    });
  });
});
