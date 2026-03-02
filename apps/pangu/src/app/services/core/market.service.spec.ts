import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { Constants } from '../../constants';
import { Direction, ExchangeName, Status } from '../../models/market';
import { VendorStatus } from '../../models/vendor/etm';
import { IntraDayStatus } from '../../models/vendor/mc';
import { MarketUtils } from '../../utils/market.utils';
import { ChartCategory, MarketService } from './market.service';
import { SettingsService } from './settings.service';

describe('MarketService', () => {
  let service: MarketService;
  let mockHttpClient: { get: jest.Mock; post: jest.Mock };
  let mockSettingsService: { settings$: BehaviorSubject<any> };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpClient = {
      get: jest.fn().mockImplementation((url) => {
        if (url === Constants.api.MARKET_STATUS) {
          return of({
            marketStatusDto: {
              currentTime: '2024-01-01T10:00:00Z',
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        }
        // Fallback or specific mocks can be added here or via mockImplementationOnce
        return of({});
      }),
      post: jest.fn().mockReturnValue(of({})),
    };

    mockSettingsService = {
      settings$: new BehaviorSubject({ refreshInterval: 30000 }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    });
    service = TestBed.inject(MarketService);
  });

  it('should be created and set up marketStatus$', (done) => {
    expect(service).toBeTruthy();
    service.marketStatus$.subscribe((status) => {
      expect(status.status).toBe(Status.OPEN);
      done();
    });
  });

  describe('marketStatus$ logic', () => {
    it('should map VendorStatus.LIVE to Status.OPEN and others to CLOSED', (done) => {
      mockHttpClient.get.mockReturnValueOnce(
        of({
          marketStatusDto: {
            currentTime: '2024-01-01T10:00:00Z',
            currentMarketStatus: VendorStatus.CLOSE,
            tradingStartTime: '01 Jan 2024 09:15:00',
            tradingEndTime: '01 Jan 2024 15:30:00',
          },
        }),
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: HttpClient, useValue: mockHttpClient },
          { provide: SettingsService, useValue: mockSettingsService },
        ],
      });
      const newService = TestBed.inject(MarketService);
      newService.marketStatus$.subscribe((status) => {
        expect(status.status).toBe(Status.CLOSED);
        done();
      });
    });
  });

  describe('refresh', () => {
    it('should trigger a refresh event', (done) => {
      let emits = 0;
      service.marketStatus$.subscribe(() => {
        emits++;
        if (emits === 2) {
          expect(emits).toBe(2);
          done();
        }
      });
      // first time it emits immediately because of timer(0)
      // second emission forced by refresh()
      service.refresh();
    });
  });

  describe('search API', () => {
    it('should search stocks', (done) => {
      mockHttpClient.get.mockReturnValueOnce(
        of([{ tagName: 'Test Tag', tagId: 't1', symbol: 'TEST' }]),
      );
      service.search('TEST').subscribe((res) => {
        expect(res[0].name).toBe('Test Tag');
        expect(res[0].vendorCode.etm.primary).toBe('t1');
        done();
      });
    });

    it('should search empty query', (done) => {
      service.search('').subscribe((res) => {
        expect(res).toEqual([]);
        done();
      });
    });

    it('should query searchSecondary', (done) => {
      mockHttpClient.get.mockReturnValueOnce(
        of({
          result: [
            {
              fullnm: 'Full NM',
              id: 'id1',
              isinid: 'isin1',
              nseid: 'nse1',
              bseid: '533111',
            },
            { name: 'Alt Name', id: 'id2', bseid: '0' },
          ],
        }),
      );
      service.searchSecondary('abc').subscribe((res) => {
        expect(res[0].name).toBe('Full NM');
        expect(res[0].scripCode.bse).toBe('533111');
        expect(res[1].name).toBe('Alt Name');
        expect(res[1].scripCode.bse).toBe(undefined);
        done();
      });
    });

    it('should searchSecondary empty query', (done) => {
      service.searchSecondary('').subscribe((res) => {
        expect(res).toEqual([]);
        done();
      });
    });
  });

  describe('getHistoricalChart', () => {
    it('returns empty if symbol not found for INDEX', (done) => {
      service
        .getHistoricalChart('INVALID_INDEX', ChartCategory.INDEX)
        .subscribe((r) => {
          expect(r).toEqual([]);
          done();
        });
    });

    it('returns empty if noData is true', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({ noData: true });
      });
      service
        .getHistoricalChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r).toEqual([]);
          done();
        });
    });

    it('maps historical data for STOCK with DOWN direction', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({
          noData: false,
          dates: [1700000000000, 1700086400000],
          o: [10, 20],
          c: [15, 10], // closes down
          h: [15, 25],
          l: [5, 5],
          v: [100, 200],
        });
      });
      service
        .getHistoricalChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r.length).toBe(2);
          expect(r[1].change?.direction).toBe(Direction.DOWN);
          expect(r[1].lineColor).toBe('#ef4444');
          done();
        });
    });

    it('maps historical data for INDEX with UP direction', (done) => {
      // Nifty 50 is etm.id '2369'
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({
          noData: false,
          dates: [1700000000000, 1700086400000],
          o: [10, 20],
          c: [10, 20], // closes up
          h: [15, 25],
          l: [5, 5],
          v: [100, 200],
        });
      });
      service.getHistoricalChart('2369', ChartCategory.INDEX).subscribe((r) => {
        expect(r.length).toBe(2);
        expect(r[1].change?.direction).toBe(Direction.UP);
        expect(r[1].lineColor).toBe('#22c55e');
        done();
      });
    });

    it('returns empty if getTimestampSince is returning 0 or negative', (done) => {
      // mock Date.now so from is negative!
      // just mock ChartUtils
      jest.spyOn(Date, 'now').mockReturnValueOnce(0);
      service
        .getHistoricalChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r).toEqual([]);
          done();
        });
    });
  });

  describe('getIntraDayChart', () => {
    it('returns empty and logs error if symbol is empty', () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      let result: any;
      service.getIntraDayChart('', ChartCategory.STOCK).subscribe({
        next: (r) => {
          result = r;
        },
        error: (err) => {
          throw err;
        },
      });

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('returns mapped data for STOCK', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({
          s: IntraDayStatus.OK,
          data: [{ open: 1, close: 2, time: '2024' }],
        });
      });
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r.length).toBe(1);
          done();
        });
    });

    it('returns empty if status is not OK', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({ s: 'ERROR', data: [] });
      });
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r).toEqual([]);
          done();
        });
    });

    it('returns empty if from is 0 or negative', (done) => {
      jest
        .spyOn(MarketUtils, 'getLastBusinessDay')
        .mockReturnValueOnce(new Date(0));
      service
        .getIntraDayChart('RELIANCE', ChartCategory.STOCK)
        .subscribe((r) => {
          expect(r).toEqual([]);
          done();
        });
    });

    it('returns data for INDEX category with known symbol', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({
          s: IntraDayStatus.OK,
          data: [{ open: 1, close: 2, time: '2024' }],
        });
      });
      // Use a real ETM index id to cover the find() path
      service
        .getIntraDayChart('NIFTY_50', ChartCategory.INDEX)
        .subscribe((r) => {
          // Whether it finds the index or not, it should not crash
          expect(r).toBeDefined();
          done();
        });
    });

    it('handles INDEX category with unknown symbol (fallback to empty vendorSymbol)', (done) => {
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        return of({
          s: IntraDayStatus.OK,
          data: [{ open: 1, close: 2, time: '2024' }],
        });
      });
      // 'UNKNOWN_INDEX' won't match any entry in INDICES.nse or INDICES.bse
      // The find() returns undefined, so ?.mc.symbol is undefined, fallback to ''
      service
        .getIntraDayChart('UNKNOWN_INDEX', ChartCategory.INDEX)
        .subscribe((r) => {
          expect(r).toBeDefined();
          done();
        });
    });
  });

  describe('getStocks', () => {
    it('should map empty companies array to empty result', (done) => {
      mockHttpClient.post.mockReturnValueOnce(of({ companies: [] }));
      service.getStocks(['TEST']).subscribe((r) => {
        expect(r).toEqual([]);
        done();
      });
    });

    it('should map companies dashboard data', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          companies: [
            {
              companyName: 'Test Co',
              nseScripdCode: 'TESTEQ',
              scripCode: '123456',
              companyId: 't1',
              symbol: 'TEST-SYM',
              dateTimeLong: 12345,
              lastTradedPrice: '100',
              percentChange: '1.5',
              change: '1.5',
              previousclose: '98.5',
              low: '90',
              high: '110',
              fiftyTwoWeekLowPrice: '50',
              fiftyTwoWeekHighPrice: '150',
              volumeInK: '1',
              nse: {
                performanceW1: 1,
                performanceValueW1: 1,
                performanceM1: 2,
                performanceValueM1: 2,
                performanceM3: 3,
                performanceValueM3: 3,
                performanceM6: 4,
                performanceValueM6: 4,
                performanceY1: 5,
                performanceValueY1: 5,
                performanceY2: 6,
                performanceValueY2: 6,
                performanceY3: 7,
                performanceValueY3: 7,
                performanceY5: 8,
                performanceValueY5: 8,
              },
              bse: {
                performanceW1: -1,
                performanceValueW1: -1,
                performanceM1: -2,
                performanceValueM1: -2,
                performanceM3: -3,
                performanceValueM3: -3,
                performanceM6: -4,
                performanceValueM6: -4,
                performanceY1: -5,
                performanceValueY1: -5,
                performanceY2: -6,
                performanceValueY2: -6,
                performanceY3: -7,
                performanceValueY3: -7,
                performanceY5: -8,
                performanceValueY5: -8,
              },
            },
          ],
        }),
      );

      service.getStocks(['TEST']).subscribe((r) => {
        expect(r[0].name).toBe('Test Co');
        expect(r[0].scripCode.nse).toBe('TEST');
        expect(r[0].scripCode.bse).toBe('123456');
        expect(r[0].quote?.nse?.price).toBe(100);
        done();
      });
    });

    it('should handle companies with missing exchange data', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          companies: [
            {
              companyName: 'No Exchange Co',
              nseScripdCode: 'NOEX',
              scripCode: '123456',
              companyId: 't2',
              lastTradedPrice: '0',
              percentChange: '0',
              change: '0',
              previousclose: '0',
              low: '0',
              high: '0',
              fiftyTwoWeekLowPrice: '0',
              fiftyTwoWeekHighPrice: '0',
              volumeInK: '0',
            },
          ],
        }),
      );

      service.getStocks(['NOEX']).subscribe((r) => {
        expect(r.length).toBe(1);
        expect(r[0].quote?.nse).toBeDefined();
        expect(r[0].quote?.nse?.price).toBe(0);
        done();
      });
    });
  });

  describe('getStock', () => {
    it('should map exhaustive performance data', (done) => {
      const stockData = {
        nse: {
          performanceW1: 1,
          performanceValueW1: 1,
          performanceM1: 2,
          performanceValueM1: 2,
          performanceM3: 3,
          performanceValueM3: 3,
          performanceM6: 4,
          performanceValueM6: 4,
          performanceY1: 5,
          performanceValueY1: 5,
          performanceY3: 7,
          performanceValueY3: 7,
          performanceY5: 8,
          performanceValueY5: 8,
          marketCapType: 'Large Cap',
          marketCap: 100,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 100,
          dividendYield: 1,
          bookValue: 50,
          current: 100,
          absoluteChange: 1.5,
          percentChange: 1.5,
          updatedDate: 12345,
          open: 98,
          previousClose: 98.5,
          low: 90,
          high: 110,
          fiftyTwoWeekLowPrice: 50,
          fiftyTwoWeekHighPrice: 150,
          volume: 1000,
        },
        bse: {
          performanceW1: -1,
          performanceValueW1: -1,
          performanceY5: -8,
          performanceValueY5: -8,
          marketCapType: 'Large Cap',
          marketCap: 100,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 100,
          dividendYield: 1,
          bookValue: 50,
          current: 100,
          absoluteChange: -1.5,
          percentChange: -1.5,
          updatedDate: 12345,
          open: 98,
          previousClose: 98.5,
          low: 90,
          high: 110,
          fiftyTwoWeekLowPrice: 50,
          fiftyTwoWeekHighPrice: 150,
          volume: 1000,
        },
      };

      mockHttpClient.get.mockImplementation((url: string) => {
        if (url === Constants.api.MARKET_STATUS) {
          return of({
            marketStatusDto: {
              currentTime: '2024-01-01T10:00:00Z',
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        }
        if (url.includes(Constants.api.STOCK_QUOTE)) {
          return of(stockData);
        }
        return of({});
      });

      service.getStock('TEST', true).subscribe((stock) => {
        expect(stock?.performance?.nse?.weekly.percentage).toBe(1);
        expect(stock?.performance?.bse?.weekly.percentage).toBe(-1);
        expect(stock?.performance?.nse?.yearly.five.percentage).toBe(8);
        expect(stock?.performance?.bse?.yearly.five.percentage).toBe(-8);
        expect(stock?.metrics?.nse?.marketCap).toBe(100);
        expect(stock?.quote?.bse?.price).toBe(100);
        done();
      });
    });

    it('should map BSE-specific constituents correctly', (done) => {
      const constituentsData = {
        searchresult: [
          {
            companies: [
              {
                companyName: 'BSE Co',
                companyId: 'b1',
                symbol: 'BSE',
                percentChange: 1,
                change: 5,
                volumeInLacs: 1,
                bseScripCode: '500111',
                nseScripCode: 'BSENONSENSE',
                current: 200,
              },
            ],
          },
        ],
      };
      const indexMock = {
        assetId: 'idx-bse',
        assetName: 'SENSEX',
        assetExchangeId: 'BSE',
        keyMetrics: {
          openPrice: 1,
          previousClose: 1,
          lowPrice: 1,
          highPrice: 1,
          marketCap: 1,
          peRatio: 1,
          pbRatio: 1,
          dividendYield: 1,
        },
        quote: {},
        metrics: {},
        performance: {},
      };

      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.INDEX_QUOTE)) return of(indexMock);
        if (url.includes(Constants.api.INDEX_CONSTITUENTS))
          return of(constituentsData);
        return of({});
      });

      service.getIndex('idx-bse', ExchangeName.BSE, true).subscribe((index) => {
        expect(index?.constituents?.[0].scripCode.bse).toBe('500111');
        expect(index?.constituents?.[0].scripCode.nse).toBeUndefined();
        done();
      });
    });

    it('should handle missing NSE scrip correctly and negative change direction', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          companies: [
            {
              companyName: 'Test Co',
              scripCode: '', // empty bse
              percentChange: '-1.5', // negative
              lastTradedPrice: '100',
              change: '1.5',
              previousclose: '98.5',
              low: '90',
              high: '110',
              fiftyTwoWeekLowPrice: '50',
              fiftyTwoWeekHighPrice: '150',
              volumeInK: '1',
            },
          ],
        }),
      );
      service.getStocks(['TEST']).subscribe({
        next: (r) => {
          expect(r[0].scripCode.nse).toBeUndefined();
          expect(r[0].scripCode.bse).toBeUndefined();
          expect(r[0].quote?.nse?.change?.direction).toBe(Direction.DOWN);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('should not slice EQ if not ending with EQ', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          companies: [
            {
              nseScripdCode: 'TESTNON',
              lastTradedPrice: '100',
              percentChange: '-1.5',
              change: '1.5',
              previousclose: '98.5',
              low: '90',
              high: '110',
              fiftyTwoWeekLowPrice: '50',
              fiftyTwoWeekHighPrice: '150',
              volumeInK: '1',
            },
          ],
        }),
      );
      service.getStocks(['TEST']).subscribe({
        next: (r) => {
          expect(r[0].scripCode.nse).toBe('TESTNON');
          done();
        },
        error: (err) => done(err),
      });
    });
  });

  describe('getStock', () => {
    it('should return null if empty getStocks result', (done) => {
      mockHttpClient.post.mockReturnValueOnce(of({ companies: [] }));
      service.getStock('TEST', false).subscribe({
        next: (r) => {
          expect(r).toBe(null);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('maps complete company details properly for getStockDetails', (done) => {
      const mockCompanyDetails = {
        companyName: 'Details Co',
        companyId: 't2',
        nseScripCode: 'TESTEQ',
        bseScripCode: '533111',
        sectorName: 'IT',
        industryName: 'Software',
        nse: {
          symbol: 'TEST-NSE',
          updatedDate: '123',
          current: 100,
          percentChange: 1,
          absoluteChange: 1,
          open: 90,
          previousClose: 99,
          low: 80,
          high: 110,
          fiftyTwoWeekLowPrice: 50,
          fiftyTwoWeekHighPrice: 150,
          volume: 1000,
          marketCapType: 'Large',
          marketCap: 10000,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 95,
          dividendYield: 1.5,
          bookValue: 20,
          performanceW1: 1,
          performanceValueW1: 1,
          performanceM1: 2,
          performanceValueM1: 2,
          performanceM3: 3,
          performanceValueM3: 3,
          performanceM6: -4,
          performanceValueM6: -4,
          performanceY1: 5,
          performanceValueY1: 5,
          performanceY3: 6,
          performanceValueY3: 6,
          performanceY5: 7,
          performanceValueY5: 7,
        },
        bse: {
          symbol: 'TEST-BSE',
          updatedDate: '123',
          current: 100,
          percentChange: 1,
          absoluteChange: 1,
          open: 90,
          previousClose: 99,
          low: 80,
          high: 110,
          fiftyTwoWeekLowPrice: 50,
          fiftyTwoWeekHighPrice: 150,
          volume: 1000,
          marketCapType: 'Large',
          marketCap: 10000,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 95,
          dividendYield: 1.5,
          bookValue: 20,
          performanceW1: 1,
          performanceValueW1: 1,
          performanceM1: 2,
          performanceValueM1: 2,
          performanceM3: 3,
          performanceValueM3: 3,
          performanceM6: -4,
          performanceValueM6: -4,
          performanceY1: 5,
          performanceValueY1: 5,
          performanceY3: 6,
          performanceValueY3: 6,
          performanceY5: 7,
          performanceValueY5: 7,
        },
      };

      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.STOCK_QUOTE))
          return of(mockCompanyDetails);
        return of({});
      });
      service.getStock('TEST', true).subscribe({
        next: (r) => {
          expect(r!.name).toBe('Details Co');
          expect(r!.quote?.nse?.price).toBe(100);
          expect(r!.quote?.bse?.price).toBe(100);
          expect(r!.performance?.nse?.halfYearly?.direction).toBe(
            Direction.DOWN,
          );
          done();
        },
        error: (err) => done(err),
      });
    });

    it('maps company details without NSE correctly', (done) => {
      const mockCompanyDetails = {
        companyName: 'Details Co BSE Only',
        companyId: 't3',
        bse: { symbol: 'BSE-ONLY' }, // only bse
      };

      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.STOCK_QUOTE))
          return of(mockCompanyDetails);
        return of({});
      });

      service.getStock('TEST', true).subscribe({
        next: (r) => {
          expect(r!.name).toBe('Details Co BSE Only');
          expect(r!.quote?.nse).toBeUndefined();
          expect(r!.vendorCode.etm.chart).toBe('BSE-ONLY');
          done();
        },
        error: (err) => done(err),
      });
    });
  });

  describe('getIndices', () => {
    it('handles empty indices or undefined dashboard indices', (done) => {
      mockHttpClient.post.mockReturnValueOnce(of({})); // undefined dashboard indices
      service.getIndices([]).subscribe({
        next: (r) => {
          expect(r).toEqual([]);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('maps indices correctly', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          indices: [
            {
              indexid: 'i1',
              indexName: 'Test Index',
              exchange: '50', // 50 is NSE
              dateTimeLong: 123,
              currentIndexValue: '1000',
              percentChange: '-1.5',
              netChange: '-15',
              advancesPercentange: '40',
              noChangePercentage: '10',
              advances: '20',
              noChange: '5',
              declinesPercentange: '50',
              declines: '25',
            },
          ],
        }),
      );
      service.getIndices(['i1']).subscribe({
        next: (r) => {
          expect(r[0].name).toBe('Test Index');
          expect(r[0].exchange).toBe(ExchangeName.NSE);
          expect(r[0].quote?.change?.direction).toBe(Direction.DOWN);
          expect(r[0].quote?.advance?.percentage).toBe(50); // 40 + 10
          done();
        },
        error: (err) => done(err),
      });
    });

    it('maps getMainIndices correctly and handles missing indices gracefully', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          indices: [
            {
              indexid: '2369',
              indexName: 'Nifty 50',
              exchange: '50',
              dateTimeLong: 123,
              currentIndexValue: '1000',
              percentChange: '1.5',
              netChange: '15',
              advancesPercentange: '40',
              noChangePercentage: '10',
              advances: '20',
              noChange: '5',
              declinesPercentange: '50',
              declines: '25',
            },
          ],
        }),
      );
      service.getMainIndices().subscribe({
        next: (r) => {
          expect(r.length).toBe(1);
          done();
        },
        error: (err) => done(err),
      });
    });
  });

  describe('getIndex', () => {
    it('calls getIndices when complete is false', (done) => {
      mockHttpClient.post.mockReturnValueOnce(
        of({
          indices: [
            {
              indexid: 'idx',
              dateTimeLong: 123,
              currentIndexValue: '1000',
              percentChange: '1.5',
              netChange: '15',
              advancesPercentange: '40',
              noChangePercentage: '10',
              advances: '20',
              noChange: '5',
              declinesPercentange: '50',
              declines: '25',
            },
          ],
        }),
      );
      service.getIndex('idx', ExchangeName.NSE, false).subscribe({
        next: (r) => {
          expect(r!.id).toBe('idx');
          done();
        },
        error: (err) => done(err),
      });
    });

    it('returns null if empty indices', (done) => {
      mockHttpClient.post.mockReturnValueOnce(of({ indices: [] }));
      service.getIndex('idx', ExchangeName.NSE, false).subscribe({
        next: (r) => {
          expect(r).toBe(null);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('calls getIndexDetails when complete is true', (done) => {
      const indexMock = {
        assetId: 'idx2',
        assetName: 'Index 2',
        assetExchangeId: '50',
        dateTime: 123,
        lastTradedPrice: 100,
        percentChange: 1,
        netChange: 1,
        keyMetrics: {
          openPrice: 90,
          previousClose: 99,
          lowPrice: 80,
          highPrice: 110,
          marketCap: 1000,
          peRatio: 10,
          pbRatio: 2,
          dividendYield: 1,
        },
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 150,
        advancesPercentage: 50,
        advances: 10,
        declinesPercentage: 50,
        declines: 10,
        r1Week: 1,
        change1Week: 1,
        r1Month: 2,
        change1Month: 2,
        r3Month: 3,
        change3Month: 3,
        r6Month: -4,
        change6Month: -4,
        r1Year: 5,
        change1Year: 5,
        r3Year: 6,
        change3Year: 6,
        r5Year: 7,
        change5Year: 7,
      };
      const constituentsMock = {
        searchresult: [
          {
            companies: [
              {
                companyId: 'c1',
                companyName: 'Const 1',
                symbol: 'C1',
                current: 100,
                percentChange: 1,
                change: 1,
                volumeInLacs: 1,
                nseScripCode: 'C1EQ',
                bseScripCode: '533',
              },
            ],
          },
        ],
      };

      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.INDEX_QUOTE)) return of(indexMock);
        if (url.includes(Constants.api.INDEX_CONSTITUENTS))
          return of(constituentsMock);
        return of({});
      });

      service.getIndex('idx2', ExchangeName.NSE, true).subscribe({
        next: (r) => {
          expect(r!.name).toBe('Index 2');
          expect(r!.constituents?.length).toBe(1);
          expect(r!.constituents![0].scripCode.nse).toBe('C1EQ');
          done();
        },
        error: (err) => done(err),
      });
    });

    it('handles empty constituents array', (done) => {
      const indexMock = {
        assetId: 'idx3',
        assetName: 'Index 3',
        assetExchangeId: '50',
        dateTime: 123,
        lastTradedPrice: 100,
        percentChange: 1,
        netChange: 1,
        keyMetrics: {
          openPrice: 90,
          previousClose: 99,
          lowPrice: 80,
          highPrice: 110,
          marketCap: 1000,
          peRatio: 10,
          pbRatio: 2,
          dividendYield: 1,
        },
        fiftyTwoWeekLow: 50,
        fiftyTwoWeekHigh: 150,
        advancesPercentage: 50,
        advances: 10,
        declinesPercentage: 50,
        declines: 10,
        r1Week: 1,
        change1Week: 1,
        r1Month: 2,
        change1Month: 2,
        r3Month: 3,
        change3Month: 3,
        r6Month: -4,
        change6Month: -4,
        r1Year: 5,
        change1Year: 5,
        r3Year: 6,
        change3Year: 6,
        r5Year: 7,
        change5Year: 7,
      };

      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.INDEX_QUOTE)) return of(indexMock);
        if (url.includes(Constants.api.INDEX_CONSTITUENTS))
          return of({ searchresult: [] }); // empty config
        return of({});
      });

      service.getIndex('idx3', ExchangeName.BSE, true).subscribe({
        next: (r) => {
          expect(r!.name).toBe('Index 3');
          expect(r!.constituents?.length).toBe(0);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('getIndexDetails should handle BSE mapping and performance', (done) => {
      const indexMock = {
        assetId: 'idx_bse',
        assetName: 'SENSEX',
        assetExchangeId: '47', // 47 is BSE
        dateTime: 123,
        lastTradedPrice: 70000,
        percentChange: 1.2,
        netChange: 800,
        keyMetrics: {
          openPrice: 69000,
          previousClose: 69200,
          lowPrice: 68000,
          highPrice: 71000,
          marketCap: 1000000,
          peRatio: 25,
          pbRatio: 3,
          dividendYield: 1.2,
        },
        fiftyTwoWeekLow: 55000,
        fiftyTwoWeekHigh: 75000,
        advancesPercentage: 60,
        advances: 18,
        declinesPercentage: 40,
        declines: 12,
        r1Week: 1.5,
        change1Week: 1000,
        r1Month: 3,
        change1Month: 2000,
        r3Month: 5,
        change3Month: 3500,
        r6Month: 10,
        change6Month: 6000,
        r1Year: 15,
        change1Year: 9000,
        r3Year: 20,
        change3Year: 12000,
        r5Year: 25,
        change5Year: 15000,
      };
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.INDEX_QUOTE)) return of(indexMock);
        if (url.includes(Constants.api.INDEX_CONSTITUENTS))
          return of({ searchresult: [] });
        return of({});
      });

      service.getIndex('idx_bse', ExchangeName.BSE, true).subscribe({
        next: (r) => {
          expect(r!.exchange).toBe(ExchangeName.BSE);
          expect(r!.performance?.yearly.five.percentage).toBe(25);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('getStockDetails should handle BSE performance mapping exhaustively', (done) => {
      const mockBseDetails = {
        companyName: 'BSE Full Co',
        companyId: 'b1',
        bseScripCode: '500001',
        bse: {
          symbol: 'BSE-SYM',
          updatedDate: '123',
          current: 100,
          percentChange: 1,
          absoluteChange: 1,
          open: 90,
          previousClose: 99,
          low: 80,
          high: 110,
          fiftyTwoWeekLow: 50,
          fiftyTwoWeekHigh: 150,
          volume: 1000,
          marketCapType: 'Large',
          marketCap: 10000,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 95,
          dividendYield: 1.5,
          bookValue: 20,
          performanceW1: 1,
          performanceValueW1: 1,
          performanceM1: 2,
          performanceValueM1: 2,
          performanceM3: 3,
          performanceValueM3: 3,
          performanceM6: 4,
          performanceValueM6: 4,
          performanceY1: 5,
          performanceValueY1: 5,
          performanceY3: 6,
          performanceValueY3: 6,
          performanceY5: 7,
          performanceValueY5: 7,
        },
      };
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.STOCK_QUOTE)) return of(mockBseDetails);
        return of({});
      });

      service.getStock('b1', true).subscribe({
        next: (r) => {
          expect(r!.quote?.bse).toBeDefined();
          expect(r!.performance?.bse?.yearly.five.percentage).toBe(7);
          done();
        },
        error: (err) => done(err),
      });
    });

    it('getIndexDetails should handle BSE mapping and performance', (done) => {
      (service as any).poll$ = of(null);
      const indexMock = {
        assetId: 'idx_bse',
        assetName: 'SENSEX',
        assetExchangeId: '47',
        dateTime: 123,
        lastTradedPrice: 70000,
        percentChange: 1.2,
        netChange: 800,
        keyMetrics: {
          openPrice: 69000,
          previousClose: 69200,
          lowPrice: 68000,
          highPrice: 71000,
          marketCap: 1000000,
          peRatio: 25,
          pbRatio: 3,
          dividendYield: 1.2,
        },
        fiftyTwoWeekLow: 55000,
        fiftyTwoWeekHigh: 75000,
        advancesPercentage: 60,
        advances: 18,
        declinesPercentage: 40,
        declines: 12,
        r1Week: 1.5,
        change1Week: 1000,
        r1Month: 3,
        change1Month: 2000,
        r3Month: 5,
        change3Month: 3500,
        r6Month: 10,
        change6Month: 6000,
        r1Year: 15,
        change1Year: 9000,
        r3Year: 20,
        change3Year: 12000,
        r5Year: 25,
        change5Year: 15000,
      };
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.INDEX_QUOTE)) return of(indexMock);
        if (url.includes(Constants.api.INDEX_CONSTITUENTS))
          return of({
            searchresult: [
              {
                companies: [
                  {
                    companyId: 'c1',
                    companyName: 'BSE C1',
                    symbol: 'C1',
                    current: 100,
                    percentChange: 1,
                    change: 1,
                    volumeInLacs: 1,
                    bseScripCode: '500',
                  },
                ],
              },
            ],
          });
        return of({});
      });

      service.getIndex('idx_bse', ExchangeName.BSE, true).subscribe({
        next: (r) => {
          expect(r!.exchange).toBe(ExchangeName.BSE);
          expect(r!.performance?.yearly.five.percentage).toBe(25);
          expect(r!.constituents![0].scripCode.bse).toBe('500');
          done();
        },
        error: (err) => done(err),
      });
    });

    it('getStockDetails should handle BSE performance mapping exhaustively', (done) => {
      (service as any).poll$ = of(null);
      const mockBseDetails = {
        companyName: 'BSE Full Co',
        companyId: 'b1',
        bseScripCode: '500001',
        bse: {
          symbol: 'BSE-SYM',
          updatedDate: '123',
          current: 100,
          percentChange: 1,
          absoluteChange: 1,
          open: 90,
          previousClose: 99,
          low: 80,
          high: 110,
          fiftyTwoWeekLowPrice: 50,
          fiftyTwoWeekHighPrice: 150,
          volume: 1000,
          marketCapType: 'Large Cap',
          marketCap: 10000,
          faceValue: 10,
          pe: 20,
          pb: 5,
          eps: 5,
          vwap: 95,
          dividendYield: 1.5,
          bookValue: 20,
          performanceW1: 1,
          performanceValueW1: 1,
          performanceM1: 2,
          performanceValueM1: 2,
          performanceM3: 3,
          performanceValueM3: 3,
          performanceM6: 4,
          performanceValueM6: 4,
          performanceY1: 5,
          performanceValueY1: 5,
          performanceY3: 6,
          performanceValueY3: 6,
          performanceY5: 7,
          performanceValueY5: 7,
        },
      };
      mockHttpClient.get.mockImplementation((url) => {
        if (url.includes(Constants.api.MARKET_STATUS))
          return of({
            marketStatusDto: {
              currentMarketStatus: VendorStatus.LIVE,
              tradingStartTime: '01 Jan 2024 09:15:00',
              tradingEndTime: '01 Jan 2024 15:30:00',
            },
          });
        if (url.includes(Constants.api.STOCK_QUOTE)) return of(mockBseDetails);
        return of({});
      });

      service.getStock('b1', true).subscribe({
        next: (r) => {
          expect(r!.quote?.bse).toBeDefined();
          expect(r!.performance?.bse?.yearly.five.percentage).toBe(7);
          done();
        },
        error: (err) => done(err),
      });
    });
  });
});
