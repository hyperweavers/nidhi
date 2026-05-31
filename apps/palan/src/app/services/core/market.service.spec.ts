import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';

import { MarketService } from './market.service';
import { SettingsService } from './settings.service';
import { LOGGER } from '@nidhi/shared-logger';
import { Constants } from '../../constants';
import { Direction, Status } from '../../models/market';
import { ChartResponseStatus } from '../../models/vendor/mc';
import { ChartUtils } from '../../utils/chart.utils';
import { MarketUtils } from '../../utils/market.utils';

const STATUS_URL = Constants.api.MARKET_STATUS + 'CAT:US';

/**
 * Test helper – primes marketStatus$ so it has already emitted OPEN via
 * shareReplay(1).  After this call any subscriber to poll$ will immediately
 * receive the cached OPEN status and the poll$ inner merge will be wired.
 */
function primeMarketOpen(
  service: MarketService,
  httpMock: HttpTestingController,
): void {
  const sub = service.marketStatus$.subscribe();
  service.refresh();
  httpMock
    .expectOne(STATUS_URL)
    .flush({
      data: { lastupd_epoch: 1609459200000, market_state: 'OPEN' },
    } as any);
  sub.unsubscribe();
}

describe('MarketService', () => {
  let service: MarketService;
  let httpMock: HttpTestingController;
  let mockSettings$: BehaviorSubject<{ refreshInterval: number }>;
  let mockLogger: {
    captureException: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
    log: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(() => {
    mockSettings$ = new BehaviorSubject({ refreshInterval: 30000 });
    mockLogger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: SettingsService,
          useValue: { settings$: mockSettings$.asObservable() },
        },
        { provide: LOGGER, useValue: mockLogger },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(MarketService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /* ================================================================== */
  /*  marketStatus$                                                      */
  /* ================================================================== */
  describe('marketStatus$', () => {
    it('should emit Status.OPEN when market_state is LIVE', (done) => {
      service.marketStatus$.subscribe((ms) => {
        expect(ms.status).toBe(Status.OPEN);
        expect(ms.lastUpdated).toBe(1609459200000);
        done();
      });

      service.refresh();
      httpMock.expectOne(STATUS_URL).flush({
        data: { lastupd_epoch: 1609459200000, market_state: 'OPEN' },
      } as any);
    });

    it('should emit Status.CLOSED when market_state is not LIVE', (done) => {
      service.marketStatus$.subscribe((ms) => {
        expect(ms.status).toBe(Status.CLOSED);
        done();
      });

      service.refresh();
      httpMock.expectOne(STATUS_URL).flush({
        data: { lastupd_epoch: 1609459200000, market_state: 'CLOSED' },
      } as any);
    });
  });

  /* ================================================================== */
  /*  search                                                             */
  /* ================================================================== */
  describe('search', () => {
    it('should return empty array for empty query', (done) => {
      service.search('').subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('should return mapped stocks for valid query', (done) => {
      const query = 'AAPL';
      const mockResponse = [
        {
          sc_id: 'AAPL:US',
          stock_name: 'Apple Inc',
          pdt_dis_nm: '<span>US0378331005, AAPL:US</span>',
        },
      ];

      service.search(query).subscribe((stocks) => {
        expect(stocks).toHaveLength(1);
        expect(stocks[0].name).toBe('Apple Inc');
        expect(stocks[0].scripCode.isin).toBe('US0378331005');
        expect(stocks[0].scripCode.ticker).toBe('AAPL');
        expect(stocks[0].scripCode.country).toBe('US');
        expect(stocks[0].vendorCode).toEqual({ mc: { primary: 'AAPL:US' } });
        done();
      });

      const req = httpMock.expectOne(
        Constants.api.STOCK_SEARCH + encodeURIComponent(query),
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should fallback to empty scripCode when MarketUtils returns null', (done) => {
      jest
        .spyOn(MarketUtils, 'extractScripCodesFromMcSearchResult')
        .mockReturnValue(null);

      const query = 'AAPL';
      const mockResponse = [
        {
          sc_id: 'AAPL:US',
          stock_name: 'Apple Inc',
          pdt_dis_ns: '<span></span>',
        },
      ];

      service.search(query).subscribe((stocks) => {
        expect(stocks).toHaveLength(1);
        expect(stocks[0].scripCode).toEqual({});
        done();
      });

      const req = httpMock.expectOne(
        Constants.api.STOCK_SEARCH + encodeURIComponent(query),
      );
      req.flush(mockResponse);
    });

    it('should propagate error when extractScripCodesFromMcSearchResult throws', (done) => {
      jest
        .spyOn(MarketUtils, 'extractScripCodesFromMcSearchResult')
        .mockImplementation(() => {
          throw new Error('Unexpected error parsing HTML');
        });

      const query = 'AAPL';
      const mockResponse = [
        {
          sc_id: 'AAPL:US',
          stock_name: 'Apple Inc',
          pdt_dis_nm: '<span>BAD DATA</span>',
        },
      ];

      service.search(query).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe('Unexpected error parsing HTML');
          done();
        },
      });

      const req = httpMock.expectOne(
        Constants.api.STOCK_SEARCH + encodeURIComponent(query),
      );
      req.flush(mockResponse);
    });
  });

  /* ================================================================== */
  /*  getStock                                                           */
  /* ================================================================== */
  describe('getStock', () => {
    const stockData: Record<string, any> = {
      name: 'Apple Inc',
      symbol: 'AAPL:US',
      ticker: 'AAPL',
      lastupd_epoch: 1609459200000,
      current_price: '150.50',
      percent_change: '1.25',
      net_change: '+1.85',
      open: '148.75',
      prev_close: '148.65',
      low: '148.50',
      high: '151.00',
      '52wkLow': '100.00',
      '52wkHigh': '180.00',
      market_cap_billion: '2500.5',
      dy: '0.65',
      ytd_per_change: '5.2',
      ytd_change: '7.50',
      weekly_per_change: '0.8',
      weekly_change: '1.20',
      monthly_per_change: '-0.3',
      monthly_change: '-0.45',
      '3months_per_change': '2.1',
      '3months_change': '3.10',
      '6months_per_change': '4.5',
      '6months_change': '6.75',
      yearly_per_change: '12.3',
      yearly_change: '18.45',
      '2years_per_change': '25.0',
      '2years_change': '37.50',
      '3years_per_change': '40.0',
      '3years_change': '60.00',
      '5years_per_change': '80.0',
      '5years_change': '120.00',
      sector: 'Technology',
    };

    it('should return mapped Stock with all fields', (done) => {
      primeMarketOpen(service, httpMock);

      service.getStock('AAPL:US').subscribe((stock) => {
        expect(stock.name).toBe('Apple Inc');
        expect(stock.scripCode).toEqual({ ticker: 'AAPL', country: 'US' });
        expect(stock.vendorCode).toEqual({ mc: { primary: 'AAPL:US' } });
        expect(stock.details).toEqual({ sector: 'Technology' });
        expect(stock.quote!.lastUpdated).toBe(1609459200000);
        expect(stock.quote!.price).toBe(150.5);
        expect(stock.quote!.open).toBe(148.75);
        expect(stock.quote!.close).toBe(148.65);
        expect(stock.quote!.low).toBe(148.5);
        expect(stock.quote!.high).toBe(151);
        expect(stock.quote!.fiftyTwoWeekLow).toBe(100);
        expect(stock.quote!.fiftyTwoWeekHigh).toBe(180);
        expect(stock.metrics!.marketCap).toBe(2500.5);
        expect(stock.metrics!.dividendYield).toBe(0.65);
        done();
      });

      service.refresh();
      // refresh() triggers both marketStatus$ merge and poll$ merge.
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'AAPL:US')
        .flush({ data: stockData } as any);
    });

    it('should return Direction.UP for positive percent_change', (done) => {
      primeMarketOpen(service, httpMock);

      service.getStock('AAPL:US').subscribe((stock) => {
        expect(stock.quote!.change.direction).toBe(Direction.UP);
        expect(stock.quote!.change.percentage).toBe(1.25);
        expect(stock.quote!.change.value).toBe(1.85);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'AAPL:US')
        .flush({ data: stockData } as any);
    });

    it('should return Direction.DOWN for negative percent_change', (done) => {
      primeMarketOpen(service, httpMock);

      const negData = {
        ...stockData,
        percent_change: '-2.5',
        net_change: '-3.75',
      };

      service.getStock('AAPL:US').subscribe((stock) => {
        expect(stock.quote!.change.direction).toBe(Direction.DOWN);
        expect(stock.quote!.change.percentage).toBe(-2.5);
        expect(stock.quote!.change.value).toBe(-3.75);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'AAPL:US')
        .flush({ data: negData } as any);
    });

    it('should map all performance fields correctly', (done) => {
      primeMarketOpen(service, httpMock);

      service.getStock('AAPL:US').subscribe((stock) => {
        const p = stock.performance!;
        expect(p.yearToDate!.percentage).toBe(5.2);
        expect(p.yearToDate!.direction).toBe(Direction.UP);
        expect(p.weekly.percentage).toBe(0.8);
        expect(p.weekly.direction).toBe(Direction.UP);
        expect(p.monthly.percentage).toBe(-0.3);
        expect(p.monthly.direction).toBe(Direction.DOWN);
        expect(p.quarterly.percentage).toBe(2.1);
        expect(p.halfYearly.percentage).toBe(4.5);
        expect(p.yearly.one.percentage).toBe(12.3);
        expect(p.yearly.two.percentage).toBe(25.0);
        expect(p.yearly.three.percentage).toBe(40.0);
        expect(p.yearly.five.percentage).toBe(80.0);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'AAPL:US')
        .flush({ data: stockData } as any);
    });

    it('should handle falsy ticker and symbol without colon', (done) => {
      primeMarketOpen(service, httpMock);

      const edgeData = {
        ...stockData,
        ticker: '',
        symbol: 'XXX',
      };

      service.getStock('AAPL:US').subscribe((stock) => {
        expect(stock.scripCode.ticker).toBeUndefined();
        expect(stock.scripCode.country).toBeUndefined();
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'AAPL:US')
        .flush({ data: edgeData } as any);
    });
  });

  /* ================================================================== */
  /*  getHistoricalChart                                                  */
  /* ================================================================== */
  describe('getHistoricalChart', () => {
    it('should return chart data array for OK status', (done) => {
      const symbol = 'CAT:US';

      service.getHistoricalChart(symbol).subscribe((data) => {
        expect(data).toHaveLength(2);
        expect(data[0].open).toBe(100);
        expect(data[1].close).toBe(102);
        expect(data[1].previousDayClose).toBe(101);
        expect(data[1].change).toBeDefined();
        expect(data[1].change!.direction).toBe(Direction.UP);
        expect(data[1].lineColor).toBe('#22c55e');
        done();
      });

      const req = httpMock.expectOne((r) => {
        return (
          r.url.startsWith(Constants.api.STOCK_HISTORIC_CHART) &&
          r.url.includes(encodeURIComponent(symbol))
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush({
        s: ChartResponseStatus.OK,
        t: [1700000000000, 1700086400000],
        o: [100, 101],
        c: [101, 102],
        h: [102, 103],
        l: [99, 100],
      } as any);
    });

    it('should set red lineColor for DOWN direction', (done) => {
      const symbol = 'CAT:US';

      service.getHistoricalChart(symbol).subscribe((data) => {
        expect(data).toHaveLength(2);
        expect(data[1].change!.direction).toBe(Direction.DOWN);
        expect(data[1].lineColor).toBe('#ef4444');
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('history'));
      req.flush({
        s: ChartResponseStatus.OK,
        t: [1700000000000, 1700086400000],
        o: [101, 100],
        c: [101, 100],
        h: [102, 101],
        l: [100, 99],
      } as any);
    });

    it('should return empty array when status is not OK', (done) => {
      service.getHistoricalChart('CAT:US').subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('history'));
      req.flush({ s: ChartResponseStatus.NO_DATA, t: null } as any);
    });

    it('should return empty array when t array is empty', (done) => {
      service.getHistoricalChart('CAT:US').subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('history'));
      req.flush({
        s: ChartResponseStatus.OK,
        t: [],
        o: [],
        c: [],
        h: [],
        l: [],
      } as any);
    });

    it('should return empty array when symbol is empty and log error', (done) => {
      service.getHistoricalChart('').subscribe((data) => {
        expect(data).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid symbol: ');
        done();
      });
    });

    it('should return empty array when from <= 0', (done) => {
      jest.spyOn(ChartUtils, 'getTimestampSince').mockReturnValue(-1);

      service.getHistoricalChart('CAT:US').subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });
    });
  });

  /* ================================================================== */
  /*  getIntraDayChart                                                   */
  /* ================================================================== */
  describe('getIntraDayChart', () => {
    it('should return chart data array for OK status', (done) => {
      primeMarketOpen(service, httpMock);

      const symbol = 'AAPL:US';
      service.getIntraDayChart(symbol).subscribe((data) => {
        expect(data).toHaveLength(1);
        expect(data[0].time).toBe(1700000000);
        expect(data[0].value).toBe(150.5);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne((r) => r.url.includes('intra'))
        .flush({
          s: ChartResponseStatus.OK,
          data: [{ time: 1700000000, value: 150.5 }],
        } as any);
    });

    it('should return empty array when status is not OK', (done) => {
      primeMarketOpen(service, httpMock);

      const symbol = 'AAPL:US';
      service.getIntraDayChart(symbol).subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne((r) => r.url.includes('intra'))
        .flush({ s: ChartResponseStatus.ERROR, data: [] } as any);
    });

    it('should return empty array when data is empty', (done) => {
      primeMarketOpen(service, httpMock);

      const symbol = 'AAPL:US';
      service.getIntraDayChart(symbol).subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 0, market_state: 'OPEN' },
        } as any);
      httpMock
        .expectOne((r) => r.url.includes('intra'))
        .flush({ s: ChartResponseStatus.OK, data: [] } as any);
    });

    it('should return empty array when symbol is empty and log error', (done) => {
      service.getIntraDayChart('').subscribe((data) => {
        expect(data).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith('Invalid symbol: ');
        done();
      });
    });
  });

  /* ================================================================== */
  /*  refresh                                                            */
  /* ================================================================== */
  describe('refresh', () => {
    it('should cause marketStatus$ to re-emit when called', (done) => {
      const values: Status[] = [];
      service.marketStatus$.subscribe((ms) => {
        values.push(ms.status);
        if (values.length === 2) {
          expect(values).toEqual([Status.OPEN, Status.CLOSED]);
          done();
        }
      });

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 1609459200000, market_state: 'OPEN' },
        } as any);

      service.refresh();
      httpMock
        .expectOne(STATUS_URL)
        .flush({
          data: { lastupd_epoch: 1609459200001, market_state: 'CLOSED' },
        } as any);
    });
  });
});
