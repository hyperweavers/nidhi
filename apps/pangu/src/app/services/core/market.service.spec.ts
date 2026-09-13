import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject, take } from 'rxjs';

import { Constants } from '../../constants';
import {
  mockCompanyDetails,
  mockDashboard,
  mockHistory,
  mockIndexConstituents,
  mockIndexDetails,
  mockIndexQuotes,
  mockIntraDay,
  mockSearchResults,
  mockSearchSecondary,
  mockStockPeerChart,
} from '../../mocks/data';
import { ChartCategory, Period } from '../../models/chart';
import { ExchangeName, Status } from '../../models/market';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { MarketService } from './market.service';
import { SettingsService } from './settings.service';

const mockSettings = {
  theme: Theme.DARK,
  colorScheme: ColorScheme.DARK,
  refreshInterval: RefreshInterval.THIRTY_SECONDS,
};

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

function createMockSettingsService() {
  const settingsSubject = new BehaviorSubject(mockSettings);
  return {
    settings$: settingsSubject.asObservable(),
    resize$: new BehaviorSubject(new Event('resize')).asObservable(),
    setTheme: jest.fn(),
    setRefreshInterval: jest.fn(),
  };
}

describe('MarketService', () => {
  let service: MarketService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: LOGGER, useValue: mockLogger },
        { provide: SettingsService, useFactory: createMockSettingsService },
      ],
    });
    service = TestBed.inject(MarketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('marketStatus$', () => {
    it('should emit market open status when vendor is live', fakeAsync(() => {
      let status: any;
      service.marketStatus$.pipe(take(1)).subscribe((s) => {
        status = s;
      });
      tick();
      const req = httpMock.expectOne(Constants.api.MARKET_STATUS);
      req.flush(mockIndexQuotes);
      tick();
      expect(status).toBeTruthy();
      expect(status.status).toBe(Status.OPEN);
      expect(status.lastUpdated).toBe(
        mockIndexQuotes.marketStatusDto.currentTime,
      );
    }));
  });

  describe('getStock', () => {
    it('should return stock from dashboard', fakeAsync(() => {
      let result: any;
      service
        .getStock('comp-123')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock.expectOne(Constants.api.DASHBOARD).flush(mockDashboard);
      tick();
      expect(result).toBeTruthy();
      expect(result.name).toBe('Reliance Industries Ltd.');
      expect(result.scripCode.nse).toBe('RELIANCE');
    }));

    it('should return null for unknown code', fakeAsync(() => {
      let result: any;
      service
        .getStock('unknown')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.DASHBOARD)
        .flush({ companies: [], indices: [] });
      tick();
      expect(result).toBeNull();
    }));

    it('should return full details with complete flag', fakeAsync(() => {
      let result: any;
      service
        .getStock('comp-123', true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'comp-123')
        .flush(mockCompanyDetails);
      tick();
      expect(result).toBeTruthy();
      expect(result.details?.sector?.name).toBe('Oil & Gas');
      expect(result.details?.marketCapType).toBe('Large Cap');
    }));

    it('should return null without an HTTP call when code is empty', fakeAsync(() => {
      let result: any;
      service
        .getStock('')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'getStock called without a stock code!',
      );
      httpMock.expectNone(Constants.api.DASHBOARD);
    }));
  });

  describe('getStocks', () => {
    it('should return empty array without an HTTP call when all codes are empty', fakeAsync(() => {
      let result: any;
      service
        .getStocks(['', ''])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'getStocks called without any stock codes!',
      );
      httpMock.expectNone(Constants.api.DASHBOARD);
    }));

    it('should filter out empty codes before querying', fakeAsync(() => {
      let result: any;
      service
        .getStocks(['', 'comp-123'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      const req = httpMock.expectOne(Constants.api.DASHBOARD);
      expect(req.request.body.companies).toEqual([{ id: 'comp-123' }]);
      req.flush(mockDashboard);
      tick();
      expect(result.length).toBe(1);
    }));
    it('should return mapped stocks for given codes', fakeAsync(() => {
      let result: any;
      service
        .getStocks(['comp-123'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock.expectOne(Constants.api.DASHBOARD).flush(mockDashboard);
      tick();
      expect(result.length).toBe(1);
      expect(result[0].quote?.nse?.price).toBe(2780.5);
    }));

    it('should return empty array when dashboard has no companies', fakeAsync(() => {
      let result: any;
      service
        .getStocks(['comp-123'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.DASHBOARD)
        .flush({ companies: [], indices: [] });
      tick();
      expect(result).toEqual([]);
    }));
  });

  describe('getIndex', () => {
    it('should return index from dashboard', fakeAsync(() => {
      let result: any;
      service
        .getIndex('2369', ExchangeName.NSE)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock.expectOne(Constants.api.DASHBOARD).flush(mockDashboard);
      tick();
      expect(result).toBeTruthy();
      expect(result.name).toBe('Nifty 50');
    }));

    it('should return full details with complete flag', fakeAsync(() => {
      let result: any;
      service
        .getIndex('2369', ExchangeName.NSE, true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.INDEX_QUOTE + '2369')
        .flush(mockIndexDetails);
      tick();
      httpMock
        .expectOne((req) => req.url.includes('getIndexByIds'))
        .flush(mockIndexConstituents);
      tick();
      expect(result).toBeTruthy();
      expect(result.name).toBe('Nifty 50');
      expect(result.metrics?.pe).toBe(22);
    }));
  });

  describe('getMainIndices', () => {
    it('should return main indices (Nifty 50 + BSE Sensex)', fakeAsync(() => {
      let result: any;
      service
        .getMainIndices()
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock.expectOne(Constants.api.DASHBOARD).flush(mockDashboard);
      tick();
      expect(result.length).toBe(2);
      expect(result.some((i: any) => i.name.includes('Nifty'))).toBe(true);
      expect(result.some((i: any) => i.name.includes('Sensex'))).toBe(true);
    }));
  });

  describe('getIndices', () => {
    it('should return mapped indices for given codes', fakeAsync(() => {
      let result: any;
      service
        .getIndices(['2369'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      const dashboardReq = httpMock.expectOne(
        (req) => req.url === Constants.api.DASHBOARD,
      );
      const requestedIds =
        dashboardReq.request.body?.indices?.map((i: any) => i.id) ?? [];
      const filteredIndices = (mockDashboard as any).indices.filter(
        (idx: any) => requestedIds.includes(idx.indexid),
      );
      dashboardReq.flush({ ...mockDashboard, indices: filteredIndices });
      tick();
      expect(result.length).toBe(1);
      expect(result[0].quote?.value).toBe(22000);
    }));

    it('should return empty array when dashboard has no indices', fakeAsync(() => {
      let result: any;
      service
        .getIndices(['2369'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.DASHBOARD)
        .flush({ companies: [], indices: [] });
      tick();
      expect(result).toEqual([]);
    }));
  });

  describe('getHistoricalChart', () => {
    it('should return chart data for stock', fakeAsync(() => {
      let result: any;
      service
        .getHistoricalChart('comp-123', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('history'))
        .flush(mockHistory);
      tick();
      expect(result.length).toBeGreaterThan(0);
    }));

    it('should return empty array when noData is true', fakeAsync(() => {
      let result: any;
      service
        .getHistoricalChart('comp-123', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('history'))
        .flush({ ...mockHistory, noData: true, dates: [] });
      tick();
      expect(result).toEqual([]);
    }));

    it('should log error and return empty for empty symbol', () => {
      let result: any;
      service
        .getHistoricalChart('', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return chart data for index', fakeAsync(() => {
      let result: any;
      service
        .getHistoricalChart('2369', ChartCategory.INDEX)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('history'))
        .flush(mockHistory);
      tick();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].lineColor).toBeDefined();
    }));

    it('should log error for unknown index symbol', () => {
      let result: any;
      service
        .getHistoricalChart('unknown-index', ChartCategory.INDEX)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle single data point with no previous day close', fakeAsync(() => {
      let result: any;
      const singlePointHistory = {
        ...mockHistory,
        dates: ['2024-01-15'],
        o: [2760],
        c: [2780.5],
        h: [2800],
        l: [2750],
        v: [1500000],
      };
      service
        .getHistoricalChart('comp-123', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('history'))
        .flush(singlePointHistory);
      tick();
      expect(result.length).toBe(1);
      expect(result[0].change).toBeUndefined();
    }));

    it('should set red line color for downward trend', fakeAsync(() => {
      let result: any;
      const downHistory = {
        ...mockHistory,
        dates: ['2024-01-15', '2024-01-14'],
        c: [120, 100],
        o: [125, 105],
        h: [130, 110],
        l: [115, 95],
        v: [1000, 1000],
      };
      service
        .getHistoricalChart('comp-123', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('history'))
        .flush(downHistory);
      tick();
      expect(result[1].lineColor).toBe('#ef4444');
    }));
  });

  describe('getIntraDayChart', () => {
    it('should return intraday chart data', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne((req) => req.url.includes('intra'))
        .flush(mockIntraDay);
      tick();
      expect(result.length).toBeGreaterThan(0);
    }));

    it('should log error and return empty for empty symbol', () => {
      let result: any;
      service
        .getIntraDayChart('', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return empty array when intraday status is no_data', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne((req) => req.url.includes('intra'))
        .flush({ s: 'no_data', data: [] });
      tick();
      expect(result).toEqual([]);
    }));

    it('should handle intraday with null/undefined data', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock.expectOne((req) => req.url.includes('intra')).flush({ s: 'ok' });
      tick();
      expect(result).toEqual([]);
    }));

    it('should return intraday data for index', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayChart('2369', ChartCategory.INDEX)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne((req) => req.url.includes('intra'))
        .flush(mockIntraDay);
      tick();
      expect(result.length).toBeGreaterThan(0);
    }));
  });

  describe('search', () => {
    it('should return results for valid query', fakeAsync(() => {
      let result: any;
      service
        .search('Reliance')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne(Constants.api.STOCK_SEARCH + 'Reliance')
        .flush(mockSearchResults);
      tick();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toContain('Reliance');
    }));

    it('should return empty array for empty query', () => {
      let result: any;
      service
        .search('')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
    });
  });

  describe('searchSecondary', () => {
    it('should return secondary results', fakeAsync(() => {
      let result: any;
      service
        .searchSecondary('500325')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne(Constants.api.STOCK_SEARCH_SECONDARY + '500325')
        .flush(mockSearchSecondary);
      tick();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].scripCode.bse).toBe('500325');
    }));

    it('should return empty array for empty query', () => {
      let result: any;
      service
        .searchSecondary('')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
    });

    it('should return empty array when response has no result key', fakeAsync(() => {
      let result: any;
      service
        .searchSecondary('500325')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne(Constants.api.STOCK_SEARCH_SECONDARY + '500325')
        .flush({});
      tick();
      expect(result).toEqual([]);
    }));

    it('should handle bseid being "0" and set bse to undefined', fakeAsync(() => {
      let result: any;
      const mockWithZeroBse = {
        ...mockSearchSecondary,
        result: [
          {
            ...mockSearchSecondary.result[0],
            bseid: '0',
          },
        ],
      };
      service
        .searchSecondary('test')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne(Constants.api.STOCK_SEARCH_SECONDARY + 'test')
        .flush(mockWithZeroBse);
      tick();
      expect(result[0].scripCode.bse).toBeUndefined();
    }));

    it('should default to name when fullnm is missing', fakeAsync(() => {
      let result: any;
      const mockNoFullnm = {
        ...mockSearchSecondary,
        result: [
          {
            ...mockSearchSecondary.result[0],
            fullnm: '',
          },
        ],
      };
      service
        .searchSecondary('test')
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne(Constants.api.STOCK_SEARCH_SECONDARY + 'test')
        .flush(mockNoFullnm);
      tick();
      expect(result[0].name).toBe('Reliance Industries Ltd.');
    }));
  });

  describe('getHistoricPeerChart', () => {
    it('should return peer chart data', fakeAsync(() => {
      let result: any;
      service
        .getHistoricPeerChart(['RELIANCE'], Period.ONE_MONTH)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('peercharts'))
        .flush(mockStockPeerChart);
      tick();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('RELIANCE');
    }));

    it('should return empty array for unsupported ONE_DAY period', () => {
      let result: any;
      service
        .getHistoricPeerChart(['RELIANCE'], Period.ONE_DAY)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return empty array for empty symbols', () => {
      let result: any;
      service
        .getHistoricPeerChart([], Period.ONE_MONTH)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return empty array when results is null/undefined', fakeAsync(() => {
      let result: any;
      service
        .getHistoricPeerChart(['RELIANCE'], Period.ONE_MONTH)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('peercharts'))
        .flush({ results: null });
      tick();
      expect(result).toEqual([]);
    }));

    it('should return empty array when results is empty', fakeAsync(() => {
      let result: any;
      service
        .getHistoricPeerChart(['RELIANCE'], Period.ONE_MONTH)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('peercharts'))
        .flush({ results: [] });
      tick();
      expect(result).toEqual([]);
    }));

    it('should return empty array when period cannot be mapped to frequency', () => {
      let result: any;
      service
        .getHistoricPeerChart(['RELIANCE'], '2W' as Period)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unable to map period with frequency: 2W',
      );
    });
  });

  describe('getIntraDayPeerChart', () => {
    it('should return intraday peer chart data', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayPeerChart(['RELIANCE'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('peercharts'))
        .flush(mockStockPeerChart);
      tick();
      expect(result.length).toBeGreaterThan(0);
    }));

    it('should return empty array for empty symbols', () => {
      let result: any;
      service
        .getIntraDayPeerChart([])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return empty array when results length is 0', fakeAsync(() => {
      let result: any;
      service
        .getIntraDayPeerChart(['RELIANCE'])
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      httpMock
        .expectOne((req) => req.url.includes('peercharts'))
        .flush({ results: [] });
      tick();
      expect(result).toEqual([]);
    }));
  });

  describe('getStock with complete flag (getStockDetails)', () => {
    it('should handle nseScripCode without EQ suffix', fakeAsync(() => {
      let result: any;
      const detailsNoEq = {
        ...mockCompanyDetails,
        nseScripCode: 'RELIANCE',
      };
      service
        .getStock('comp-123', true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'comp-123')
        .flush(detailsNoEq);
      tick();
      expect(result.scripCode.nse).toBe('RELIANCE');
    }));

    it('should handle missing nseScripCode', fakeAsync(() => {
      let result: any;
      const detailsNoNseScrip = {
        ...mockCompanyDetails,
        nseScripCode: undefined,
        bseScripCode: '500325',
        nse: undefined,
        bse: {
          ...mockCompanyDetails.nse!,
          exchangeID: '47',
          symbol: 'RELIANCE',
        },
      };
      service
        .getStock('comp-123', true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'comp-123')
        .flush(detailsNoNseScrip);
      tick();
      expect(result).toBeTruthy();
      expect(result.scripCode.nse).toBeUndefined();
      expect(result.quote.nse).toBeUndefined();
      expect(result.quote.bse).toBeDefined();
    }));

    it('should handle missing both nse and bse data', fakeAsync(() => {
      let result: any;
      const detailsNoExchanges = {
        ...mockCompanyDetails,
        nse: undefined,
        bse: undefined,
      };
      service
        .getStock('comp-123', true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.STOCK_QUOTE + 'comp-123')
        .flush(detailsNoExchanges);
      tick();
      expect(result).toBeTruthy();
      expect(result.quote.nse).toBeUndefined();
      expect(result.quote.bse).toBeUndefined();
      expect(result.performance.nse).toBeUndefined();
      expect(result.performance.bse).toBeUndefined();
    }));
  });

  describe('getIndex with complete flag (getIndexDetails)', () => {
    it('should handle empty constituents companies', fakeAsync(() => {
      let result: any;
      const emptyConstituents = {
        ...mockIndexConstituents,
        searchresult: [
          {
            ...mockIndexConstituents.searchresult[0],
            companies: [],
          },
        ],
      };
      service
        .getIndex('2369', ExchangeName.NSE, true)
        .pipe(take(1))
        .subscribe((s) => {
          result = s;
        });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      httpMock
        .expectOne(Constants.api.INDEX_QUOTE + '2369')
        .flush(mockIndexDetails);
      tick();
      httpMock
        .expectOne((req) => req.url.includes('getIndexByIds'))
        .flush(emptyConstituents);
      tick();
      expect(result).toBeTruthy();
      expect(result.constituents).toEqual([]);
    }));
  });

  describe('marketStatus$', () => {
    it('should emit closed status when vendor is not live', fakeAsync(() => {
      let status: any;
      service.marketStatus$.pipe(take(1)).subscribe((s) => {
        status = s;
      });
      tick();
      const req = httpMock.expectOne(Constants.api.MARKET_STATUS);
      req.flush({
        ...mockIndexQuotes,
        marketStatusDto: {
          ...mockIndexQuotes.marketStatusDto,
          currentMarketStatus: 'CLOSED',
        },
      });
      tick();
      expect(status.status).toBe(Status.CLOSED);
    }));

    it('should trigger market status refresh when refresh() is called', fakeAsync(() => {
      let callCount = 0;
      service.marketStatus$.subscribe(() => {
        callCount++;
      });
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      const before = callCount;
      service.refresh();
      tick();
      httpMock.expectOne(Constants.api.MARKET_STATUS).flush(mockIndexQuotes);
      tick();
      expect(callCount).toBeGreaterThan(before);
    }));
  });

  describe('getIpoFinancials', () => {
    const flushFinancials = () => {
      const reqs = httpMock.match((req) =>
        req.url.includes('etservicestockapps'),
      );
      expect(reqs.length).toBe(4);
      reqs.forEach((req) => req.flush({}));
      return reqs;
    };

    it('should pass the type param for standalone', () => {
      service.getIpoFinancials('2231724', 'standalone').subscribe();
      const reqs = flushFinancials();
      for (const req of reqs) {
        expect(req.request.urlWithParams).toContain('type=standalone');
      }
    });

    it('should omit the type param for consolidated', () => {
      service.getIpoFinancials('2231724', 'consolidated').subscribe();
      const reqs = flushFinancials();
      for (const req of reqs) {
        expect(req.request.urlWithParams).not.toContain('type=');
      }
    });

    it('should omit the type param for falsy type', () => {
      service.getIpoFinancials('2231724', '' as unknown as string).subscribe();
      const reqs = flushFinancials();
      for (const req of reqs) {
        expect(req.request.urlWithParams).not.toContain('type=');
      }
    });
  });

  describe('IPO endpoints', () => {
    it('should fetch the IPO calendar for a key', () => {
      service.getIpoCalendar('SEP_2026').subscribe();
      const req = httpMock.expectOne(`${Constants.api.IPO_CALENDAR}SEP_2026`);
      expect(req.request.method).toBe('GET');
      req.flush({ calendarList: [] });
    });

    it('should fetch IPO details for a company', () => {
      service.getIpoDetails('2269154').subscribe();
      const req = httpMock.expectOne(`${Constants.api.IPO_DETAILS}2269154`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true });
    });

    it('should fetch IPO links for a company', () => {
      service.getIpoDetailsOnly('2269154').subscribe();
      const req = httpMock.expectOne(
        `${Constants.api.IPO_DETAILS_ONLY}2269154`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should fetch the listed IPO overview', () => {
      service.getIpoListedOverview().subscribe();
      const req = httpMock.expectOne(Constants.api.IPO_LISTED);
      expect(req.request.method).toBe('GET');
      req.flush({ results: [] });
    });

    it('should fetch an open IPO overview page', () => {
      service.getIpoOverviewOpen(2).subscribe();
      const req = httpMock.expectOne(
        `${Constants.api.IPO_OVERVIEW}?section=open&pageSize=5&pageNo=2`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should fetch the upcoming IPO overview', () => {
      service.getIpoOverviewUpcoming().subscribe();
      const req = httpMock.expectOne(
        `${Constants.api.IPO_OVERVIEW}?section=upcoming&pageSize=1000`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ upcomingIpoList: [] });
    });

    it('should fetch the listing-soon IPO overview', () => {
      service.getIpoOverviewListing().subscribe();
      const req = httpMock.expectOne(
        `${Constants.api.IPO_OVERVIEW}?section=listing&pageSize=1000`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ listingSoonIpoList: [] });
    });

    it('should fetch the IPO stock quote', () => {
      service.getIpoStockQuote('2269154').subscribe();
      const req = httpMock.expectOne(`${Constants.api.STOCK_QUOTE}2269154`);
      expect(req.request.method).toBe('GET');
      req.flush(null);
    });
  });
});
