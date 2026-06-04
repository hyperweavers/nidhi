import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError, timeout } from 'rxjs';

import { db } from '../db/app.db';
import { Direction } from '../models/market';
import { Holding, TransactionType } from '../models/portfolio';
import { Stock } from '../models/stock';
import { MarketService } from './core/market.service';
import { StorageService } from './core/storage.service';
import { PortfolioService } from './portfolio.service';

jest.mock('../db/app.db', () => ({
  db: {
    stocks: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          modify: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    },
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));

function storageHolding(overrides?: Partial<Holding>): Holding {
  return {
    id: 'stored-1',
    name: 'Reliance Industries Ltd.',
    scripCode: { nse: 'RELIANCE', bse: 'REL', isin: 'INE002A01018' },
    vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
    details: {
      sector: { id: '1', name: 'Oil & Gas' },
      industry: { id: 'ind-1', name: 'Refineries' },
      marketCapType: 'Large Cap',
    },
    metrics: {
      nse: {
        marketCap: 1_800_000_000_000,
        faceValue: 10,
        pe: 28.5,
        pb: 3.2,
        eps: 98,
        vwap: 2775,
        dividendYield: 0.5,
        bookValue: 850,
      },
    },
    transactions: [
      {
        id: 'tx1',
        type: TransactionType.BUY,
        date: 1000,
        quantity: 10,
        price: 100,
        charges: 10,
      },
    ],
    ...overrides,
  };
}

function marketStock(overrides?: Partial<Stock>): Stock {
  return {
    name: 'Reliance Industries Ltd.',
    scripCode: { nse: 'RELIANCE', bse: 'REL', isin: 'INE002A01018' },
    vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
    quote: {
      nse: {
        price: 120,
        change: { direction: Direction.UP, percentage: 5, value: 10 },
        close: 110,
      },
    },
    ...overrides,
  };
}

describe('PortfolioService', () => {
  let service: PortfolioService;
  let marketService: jest.Mocked<MarketService>;

  function setup(
    storageStocks: Holding[],
    marketStocks: Stock[],
    getStockReturn?: (code: string) => any,
  ) {
    const storageService: Partial<StorageService> = {
      stocks$: of(storageStocks),
    };

    marketService = {
      getStocks: jest.fn().mockReturnValue(of(marketStocks)),
      getStock: jest
        .fn()
        .mockImplementation(getStockReturn ?? (() => of(null))),
    } as unknown as jest.Mocked<MarketService>;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        { provide: MarketService, useValue: marketService },
        { provide: StorageService, useValue: storageService },
      ],
    });

    service = TestBed.inject(PortfolioService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('portfolio$', () => {
    it('emits a Portfolio with mapped holdings for basic input', async () => {
      const sHolding = storageHolding();
      setup([sHolding], [marketStock()]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      expect(portfolio).toBeDefined();
      expect(portfolio.holdings.length).toBe(1);
      expect(portfolio.holdings[0].id).toBe('stored-1');
      expect(portfolio.holdings[0].name).toBe('Reliance Industries Ltd.');
    });

    it('calculates quantity correctly with BUY and SELL transactions', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
          {
            id: 'tx2',
            type: TransactionType.SELL,
            date: 2000,
            quantity: 5,
            price: 105,
            charges: 8,
          },
        ],
      });
      setup([sHolding], [marketStock()]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // quantity = 10 - 5 = 5
      expect(portfolio.holdings[0].quantity).toBe(5);
    });

    it('handles BUY and SELL transactions without charges (triggers || 0 fallback)', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
          },
          {
            id: 'tx2',
            type: TransactionType.SELL,
            date: 2000,
            quantity: 5,
            price: 105,
          },
        ],
      });
      setup([sHolding], [marketStock()]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // investment = (10*100+0) - (5*105+0) = 1000 - 525 = 475
      expect(portfolio.holdings[0].investment).toBe(475);
    });

    it('calculates investment correctly with BUY and SELL transactions', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
          {
            id: 'tx2',
            type: TransactionType.SELL,
            date: 2000,
            quantity: 5,
            price: 105,
            charges: 8,
          },
        ],
      });
      setup([sHolding], [marketStock()]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // investment = (10*100+10) - (5*105+8) = 1010 - 533 = 477
      expect(portfolio.holdings[0].investment).toBe(477);
    });

    it('calculates marketValue from quote.price * quantity', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });
      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // marketValue = 120 * 10 = 1200
      expect(portfolio.holdings[0].marketValue).toBe(1200);
    });

    it('calculates totalProfitLoss UP direction when value >= 0', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });
      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // investment = 1010, avgPrice = 101, P&L = (120-101)*10 = 190
      expect(portfolio.holdings[0].totalProfitLoss!.direction).toBe(
        Direction.UP,
      );
      expect(portfolio.holdings[0].totalProfitLoss!.value).toBe(190);
    });

    it('calculates totalProfitLoss DOWN direction when value < 0', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({
        quote: {
          nse: {
            price: 80,
            change: { direction: Direction.DOWN, percentage: -20, value: -20 },
            close: 100,
          },
        },
      });
      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // investment = 1010, avgPrice = 101, P&L = (80-101)*10 = -210
      expect(portfolio.holdings[0].totalProfitLoss!.direction).toBe(
        Direction.DOWN,
      );
      expect(portfolio.holdings[0].totalProfitLoss!.value).toBe(-210);
    });

    it('calculates dayProfitLoss from change.value * quantity', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });
      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // dayProfitLossValue = 10 * 10 = 100, previousMarketValue = 110 * 10 = 1100
      // dayProfitLossPercentage = 100/1100*100 = 9.09...
      expect(portfolio.dayProfitLoss.value).toBe(100);
      expect(portfolio.dayProfitLoss.direction).toBe(Direction.UP);
    });

    it('counts dayAdvance and dayDecline correctly', async () => {
      const sHolding1 = storageHolding({
        id: 'stored-1',
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const sHolding2 = storageHolding({
        id: 'stored-2',
        name: 'TCS Ltd.',
        vendorCode: { etm: { primary: 'comp-tcs', chart: 'TCS' } },
        transactions: [
          {
            id: 'tx2',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 5,
            price: 200,
            charges: 10,
          },
        ],
      });
      const mStock1 = marketStock({
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });
      const mStock2 = marketStock({
        name: 'TCS Ltd.',
        vendorCode: { etm: { primary: 'comp-tcs', chart: 'TCS' } },
        quote: {
          nse: {
            price: 190,
            change: { direction: Direction.DOWN, percentage: -5, value: -10 },
            close: 200,
          },
        },
      });

      setup([sHolding1, sHolding2], [mStock1, mStock2]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      expect(portfolio.dayAdvance.value).toBe(1);
      expect(portfolio.dayDecline.value).toBe(1);
    });

    it('counts totalAdvance and totalDecline correctly', async () => {
      const sHolding1 = storageHolding({
        id: 'stored-1',
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const sHolding2 = storageHolding({
        id: 'stored-2',
        name: 'TCS Ltd.',
        vendorCode: { etm: { primary: 'comp-tcs', chart: 'TCS' } },
        transactions: [
          {
            id: 'tx2',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 5,
            price: 200,
            charges: 10,
          },
        ],
      });
      const mStock1 = marketStock({
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });
      const mStock2 = marketStock({
        name: 'TCS Ltd.',
        vendorCode: { etm: { primary: 'comp-tcs', chart: 'TCS' } },
        quote: {
          nse: {
            price: 150,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 145,
          },
        },
      });

      setup([sHolding1, sHolding2], [mStock1, mStock2]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // Holding1 P&L: UP (190 >= 0), Holding2 P&L: avg=202, marketValue=150*5=750, P&L=-260 → DOWN
      expect(portfolio.totalAdvance.value).toBe(1);
      expect(portfolio.totalDecline.value).toBe(1);
    });

    it('handles empty storageStocks → empty holdings', async () => {
      setup([], []);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      expect(portfolio.holdings).toEqual([]);
      expect(portfolio.investment).toBe(0);
      expect(portfolio.marketValue).toBe(0);
      expect(portfolio.dayAdvance.value).toBe(0);
      expect(portfolio.dayDecline.value).toBe(0);
      expect(portfolio.totalAdvance.value).toBe(0);
      expect(portfolio.totalDecline.value).toBe(0);
    });

    it('handles storageStock with no matching marketStock gracefully', async () => {
      const sHolding = storageHolding({
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({
        vendorCode: { etm: { primary: 'comp-other', chart: 'OTHER' } },
        name: 'Other Stock',
      });

      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // No matching storageStock → id falls back to uuid, transactions = [], quantity = 0
      expect(portfolio.holdings.length).toBe(1);
      expect(portfolio.holdings[0].id).toBe('mock-uuid');
      expect(portfolio.holdings[0].transactions).toEqual([]);
      expect(portfolio.holdings[0].quantity).toBe(0);
      expect(portfolio.holdings[0].investment).toBe(0);
      expect(portfolio.holdings[0].averagePrice).toBe(0);
      expect(portfolio.holdings[0].marketValue).toBe(0);
      expect(portfolio.holdings[0].totalProfitLoss!.value).toBe(0);
      expect(portfolio.holdings[0].totalProfitLoss!.direction).toBe(
        Direction.UP,
      );
    });

    it('handles percentage calculations when investment is 0 (division by zero → 0)', async () => {
      const sHolding = storageHolding({
        transactions: [],
      });
      const mStock = marketStock({
        quote: {
          nse: {
            price: 120,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
            close: 110,
          },
        },
      });

      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // quantity = 0, investment = 0, avg = 0, marketValue = 0
      // totalProfitLossValue = (120-0)*0 = 0 → UP, percentage = 0/0*100 → NaN → 0
      expect(portfolio.holdings[0].totalProfitLoss!.percentage).toBe(0);
      // Portfolio-level: marketValue=0, investment=0 → totalProfitLossValue=0, percentage=0
      expect(portfolio.totalProfitLoss.percentage).toBe(0);
      // dayProfitLossValue=0, previousMarketValue=0 → percentage=0
      expect(portfolio.dayProfitLoss.percentage).toBe(0);
    });

    it('handles missing quote gracefully on holding', async () => {
      const sHolding = storageHolding({
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 100,
            charges: 10,
          },
        ],
      });
      const mStock = marketStock({ quote: undefined });

      setup([sHolding], [mStock]);

      const portfolio = await firstValueFrom(
        service.portfolio$.pipe(timeout(3000)),
      );

      // No quote → marketValue=0, totalProfitLossValue=0
      // Day P&L: no quote → change undefined → goes to else block → decline
      expect(portfolio.holdings[0].marketValue).toBe(0);
      expect(portfolio.holdings[0].totalProfitLoss!.value).toBe(0);
      expect(portfolio.holdings[0].totalProfitLoss!.direction).toBe(
        Direction.UP,
      );
      expect(portfolio.dayAdvance.value).toBe(0);
      expect(portfolio.dayDecline.value).toBe(1);
    });
  });

  describe('enrichMissingDetails', () => {
    it('is a no-op when no holdings need enrichment (all have sector/metrics)', async () => {
      const sHolding = storageHolding();
      setup([sHolding], [marketStock()]);

      // Constructor already triggered enrichment with holdings that have all details
      // → missing.length === 0 → early return
      await firstValueFrom(service.portfolio$.pipe(timeout(3000)));

      expect(marketService.getStock).not.toHaveBeenCalled();
    });

    it('is a no-op when enriching flag is already true', () => {
      // Use holdings with all details so constructor enrichment is a no-op
      setup([storageHolding()], [marketStock()]);

      const holdingMissingDetails = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });
      (service as any).enriching = true;
      (service as any).enrichMissingDetails([holdingMissingDetails]);

      expect(marketService.getStock).not.toHaveBeenCalled();
    });

    it('calls getStock for each holding missing sector or metrics', () => {
      // Use holdings with all details so constructor enrichment is a no-op
      setup([storageHolding()], [marketStock()], (code: string) => of(null));

      const missing1 = storageHolding({
        id: 'stored-miss-1',
        details: undefined as any,
        metrics: undefined as any,
      });
      const missing2 = storageHolding({
        id: 'stored-miss-2',
        name: 'TCS Ltd.',
        vendorCode: { etm: { primary: 'comp-tcs', chart: 'TCS' } },
        details: undefined as any,
        metrics: undefined as any,
      });

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([missing1, missing2]);

      expect(marketService.getStock).toHaveBeenCalledTimes(2);
      expect(marketService.getStock).toHaveBeenCalledWith('comp-rel', true);
      expect(marketService.getStock).toHaveBeenCalledWith('comp-tcs', true);
    });

    it('updates Dexie via db.stocks.where().equals().modify when stock has marketCapType', async () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const enrichedStock: Stock = {
        name: 'Reliance Industries Ltd.',
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        details: {
          sector: { id: '1', name: 'Oil & Gas' },
          industry: { id: 'ind-1', name: 'Refineries' },
          marketCapType: 'Large Cap',
        },
        metrics: {
          nse: {
            marketCap: 1_800_000_000_000,
            faceValue: 10,
            pe: 28.5,
            pb: 3.2,
            eps: 98,
            vwap: 2775,
            dividendYield: 0.5,
            bookValue: 850,
          },
        },
      };

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(enrichedStock),
      );

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      expect(db.stocks.where).toHaveBeenCalledWith('scripCode.isin');
      const equalsMock = (db.stocks.where as jest.Mock).mock.results[0].value
        .equals;
      expect(equalsMock).toHaveBeenCalledWith('INE002A01018');
      const modifyMock = equalsMock.mock.results[0].value.modify;
      expect(modifyMock).toHaveBeenCalledWith({
        details: enrichedStock.details,
      });
    });

    it('handles getStock returning null gracefully (no db update)', async () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      setup([holdingMissing], [marketStock()], (code: string) => of(null));

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      // getStock was called
      expect(marketService.getStock).toHaveBeenCalledWith('comp-rel', true);
      // db.where should NOT be called since stock is null
      expect(db.stocks.where).not.toHaveBeenCalled();
    });

    it('handles Dexie modify rejection without crashing', async () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const enrichedStock: Stock = {
        name: 'Reliance Industries Ltd.',
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        details: {
          sector: { id: '1', name: 'Oil & Gas' },
          industry: { id: 'ind-1', name: 'Refineries' },
          marketCapType: 'Large Cap',
        },
        metrics: {
          nse: {
            marketCap: 1_800_000_000_000,
            faceValue: 10,
            pe: 28.5,
            pb: 3.2,
            eps: 98,
            vwap: 2775,
            dividendYield: 0.5,
            bookValue: 850,
          },
        },
      };

      (db.stocks.where as jest.Mock).mockReturnValue({
        equals: jest.fn().mockReturnValue({
          modify: jest.fn().mockRejectedValue(new Error('dexie failure')),
        }),
      });

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(enrichedStock),
      );

      (service as any).enriching = false;

      // Should not throw
      expect(() => {
        (service as any).enrichMissingDetails([holdingMissing]);
      }).not.toThrow();
    });

    it('sets enriching flag back to false after completion', async () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      setup([holdingMissing], [marketStock()], (code: string) => of(null));

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      expect((service as any).enriching).toBe(false);
    });

    it('handles getStock returning stock without isin (no db update)', async () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const partialStock: Stock = {
        name: 'Reliance',
        scripCode: { nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        details: {
          sector: { id: '1', name: 'Oil & Gas' },
          industry: { id: 'ind-1', name: 'Refineries' },
          marketCapType: 'Large Cap',
        },
        metrics: {
          nse: {
            marketCap: 1_800_000_000_000,
            faceValue: 10,
            pe: 28.5,
            pb: 3.2,
            eps: 98,
            vwap: 2775,
            dividendYield: 0.5,
            bookValue: 850,
          },
        },
      };

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(partialStock),
      );

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      // getStock called, but stock.scripCode.isin is undefined → guard fails → no db update
      expect(marketService.getStock).toHaveBeenCalledWith('comp-rel', true);
      expect(db.stocks.where).not.toHaveBeenCalled();
    });

    it('skips holdings without vendorCode.etm.primary in missing filter', () => {
      // Use holdings with all details so constructor enrichment is a no-op
      setup([storageHolding()], [marketStock()]);

      const holdingNoPrimary = storageHolding({
        vendorCode: { etm: { primary: '', chart: '' } },
        details: undefined as any,
        metrics: undefined as any,
      });

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingNoPrimary]);

      // No primary → filter excludes it → missing.length === 0 → early return
      expect(marketService.getStock).not.toHaveBeenCalled();
    });

    it('includes holding with no enrichment details in missing filter', () => {
      setup([storageHolding()], [marketStock()], (code: string) => of(null));

      const holdingNoDetails = storageHolding({
        id: 'no-details',
        details: {} as any,
      });

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingNoDetails]);

      expect(marketService.getStock).toHaveBeenCalledTimes(1);
    });

    it('handles getStock returning stock with isin but missing sector (no db update)', () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const stockWithIsinOnly: Stock = {
        name: 'Reliance',
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
      };

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(stockWithIsinOnly),
      );

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      // isin truthy, sector undefined → short-circuit at line 224 → no db update
      expect(db.stocks.where).not.toHaveBeenCalled();
    });

    it('handles getStock returning stock with isin but all details blank (no db update)', () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const stockWithBlankDetails: Stock = {
        name: 'Reliance',
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        details: {
          sector: { id: '', name: '' },
          industry: { id: '', name: '' },
          marketCapType: '',
        },
      };

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(stockWithBlankDetails),
      );

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      // isin truthy, but all details fields blank → guard fails → no db update
      expect(db.stocks.where).not.toHaveBeenCalled();
    });

    it('handles getStock returning stock with all details blank (covers optional chaining branch)', () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      const stockWithBlankDetails: Stock = {
        name: 'Reliance',
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE' },
        vendorCode: { etm: { primary: 'comp-rel', chart: 'RELIANCE' } },
        details: {
          sector: { id: '', name: '' },
          industry: { id: '', name: '' },
          marketCapType: '',
        },
      };

      setup([holdingMissing], [marketStock()], (code: string) =>
        of(stockWithBlankDetails),
      );

      (service as any).enriching = false;
      (service as any).enrichMissingDetails([holdingMissing]);

      // isin truthy, but all details fields blank → guard fails → no db update
      expect(db.stocks.where).not.toHaveBeenCalled();
    });

    it('handles getStock observable error gracefully (calls error callback)', () => {
      const holdingMissing = storageHolding({
        details: undefined as any,
        metrics: undefined as any,
      });

      setup([holdingMissing], [marketStock()], (code: string) =>
        throwError(() => new Error('API failure')),
      );

      (service as any).enriching = false;

      // Should not throw externally (error is caught by the subscribe error handler)
      expect(() => {
        (service as any).enrichMissingDetails([holdingMissing]);
      }).not.toThrow();
      // complete callback is not called on error, so enriching stays true
      expect((service as any).enriching).toBe(true);
    });
  });
});
