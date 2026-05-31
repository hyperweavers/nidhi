import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { firstValueFrom, skip, take, timeout } from 'rxjs';
import { LOGGER } from '@nidhi/shared-logger';

import { DataService } from './data.service';
import { Constants } from '../../constants';
import {
  mockGoldRateResponse,
  mockPostOfficeSavingsSchemes,
  mockRbiPolicyRates,
  mockBanksInIndia,
  mockIbjaGoldRates,
} from '../../mocks/data';

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: LOGGER, useValue: mockLogger },
      ],
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('goldRate$', () => {
    it('should emit parsed gold rate as a number', (done) => {
      service.goldRate$.pipe(take(1)).subscribe((rate) => {
        expect(rate).toBe(7250);
        expect(typeof rate).toBe('number');
        done();
      });

      const req = httpMock.expectOne(Constants.api.GOLD_PRICE);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
      req.flush(mockGoldRateResponse);
    });

    it('should emit 0 on HTTP error', (done) => {
      service.goldRate$.pipe(take(1)).subscribe((rate) => {
        expect(rate).toBe(0);
        expect(mockLogger.error).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(Constants.api.GOLD_PRICE);
      req.error(new ProgressEvent('Network error'));
    });

    it('should emit 0 when gold rate response has unexpected format', (done) => {
      service.goldRate$.pipe(take(1)).subscribe((rate) => {
        expect(rate).toBe(0);
        done();
      });

      httpMock.expectOne(Constants.api.GOLD_PRICE).flush({ unexpected: 'format' });
    });
  });

  describe('postOfficeSavingsSchemes$', () => {
    it('should emit post office savings schemes data', (done) => {
      service.postOfficeSavingsSchemes$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeTruthy();
        expect(data!.ppf.currentRate).toBe(7.1);
        done();
      });

      const req = httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.POST_OFFICE_SAVINGS_SCHEMES}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPostOfficeSavingsSchemes);
    });

    it('should emit null on HTTP error', (done) => {
      service.postOfficeSavingsSchemes$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.POST_OFFICE_SAVINGS_SCHEMES}`,
      ).error(new ProgressEvent('Network error'));
    });
  });

  describe('rbiPolicyRates$', () => {
    it('should emit RBI policy rates data', (done) => {
      service.rbiPolicyRates$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeTruthy();
        expect(data!.repoRate).toBe(6.5);
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.RBI_POLICY_RATES}`,
      ).flush(mockRbiPolicyRates);
    });

    it('should emit null on HTTP error', (done) => {
      service.rbiPolicyRates$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.RBI_POLICY_RATES}`,
      ).error(new ProgressEvent('Network error'));
    });
  });

  describe('banksInIndia$', () => {
    it('should emit banks in India data', (done) => {
      service.banksInIndia$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeTruthy();
        expect(Array.isArray(data)).toBe(true);
        expect(data!.length).toBe(2);
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.BANKS_IN_INDIA_JSON_BLOB}`,
      ).flush(mockBanksInIndia);
    });

    it('should emit null on HTTP error', (done) => {
      service.banksInIndia$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.BANKS_IN_INDIA_JSON_BLOB}`,
      ).error(new ProgressEvent('Network error'));
    });
  });

  describe('ibjaGoldRates$', () => {
    it('should emit IBJA gold rates data', (done) => {
      service.ibjaGoldRates$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeTruthy();
        expect(data!['24K']['999']).toBe(7350);
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.IBJA_GOLD_RATES_JSON_BLOB}`,
      ).flush(mockIbjaGoldRates);
    });

    it('should emit null on HTTP error', (done) => {
      service.ibjaGoldRates$.pipe(take(1)).subscribe((data) => {
        expect(data).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
        done();
      });

      httpMock.expectOne(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.IBJA_GOLD_RATES_JSON_BLOB}`,
      ).error(new ProgressEvent('Network error'));
    });
  });

  describe('replay and distinct behavior', () => {
    it('should emit same gold rate value on resubscription via shareReplay', (done) => {
      let emissionCount = 0;
      service.goldRate$.subscribe((rate) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(rate).toBe(7250);
          service.goldRate$.pipe(take(1)).subscribe((rate2) => {
            expect(rate2).toBe(7250);
            done();
          });
        }
      });

      httpMock.expectOne(Constants.api.GOLD_PRICE).flush(mockGoldRateResponse);
    });
  });
});
