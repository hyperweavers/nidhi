import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { Direction } from '../models/market';
import { TransactionType } from '../models/portfolio';
import { MarketService } from './core/market.service';
import { StorageService } from './core/storage.service';
import { PortfolioService } from './portfolio.service';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('PortfolioService', () => {
  let service: PortfolioService;

  const mockStorageStocks$ = new BehaviorSubject([
    {
      id: 'stock1',
      vendorCode: { etm: { primary: 'etm1' } },
      transactions: [
        {
          id: 't1',
          type: TransactionType.BUY,
          date: 1000,
          price: 90,
          quantity: 10,
          charges: 10,
        },
        {
          id: 't2',
          type: TransactionType.SELL,
          date: 2000,
          price: 100,
          quantity: 5,
          charges: 5,
        },
      ],
    },
  ]);

  const mockMarketStocks = [
    {
      name: 'Test Co',
      vendorCode: { etm: { primary: 'etm1' } },
      scripCode: { nse: 'TEST' },
      quote: {
        nse: {
          price: 100,
          close: 98,
          change: { direction: Direction.UP, percentage: 2, value: 2 },
        },
      },
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: mockStorageStocks$ },
        },
        {
          provide: MarketService,
          useValue: {
            getStocks: jest.fn().mockReturnValue(of(mockMarketStocks)),
          },
        },
      ],
    });
    service = TestBed.inject(PortfolioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should compute portfolio$ with holdings, investment, and P&L', (done) => {
    service.portfolio$.subscribe((portfolio) => {
      expect(portfolio.holdings.length).toBe(1);
      const holding = portfolio.holdings[0];
      // BUY 10@90 + 10 charges = 910, SELL 5@100 - 5 charges = 910 - 495 = 415
      expect(holding.quantity).toBe(5); // 10 bought - 5 sold
      expect(holding.investment).toBeDefined();
      expect(holding.marketValue).toBe(500); // 100 * 5
      expect(holding.totalProfitLoss).toBeDefined();
      expect(portfolio.investment).toBeDefined();
      expect(portfolio.marketValue).toBeDefined();
      expect(portfolio.dayProfitLoss).toBeDefined();
      expect(portfolio.totalProfitLoss).toBeDefined();
      expect(portfolio.dayAdvance).toBeDefined();
      expect(portfolio.dayDecline).toBeDefined();
      expect(portfolio.totalAdvance).toBeDefined();
      expect(portfolio.totalDecline).toBeDefined();
      done();
    });
  });

  it('should handle DOWN direction for total P&L when loss', (done) => {
    const lossMarketStocks = [
      {
        ...mockMarketStocks[0],
        quote: {
          nse: {
            price: 50, // much lower than avg price
            close: 52,
            change: { direction: Direction.DOWN, percentage: -3.8, value: -2 },
          },
        },
      },
    ];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: mockStorageStocks$ },
        },
        {
          provide: MarketService,
          useValue: {
            getStocks: jest.fn().mockReturnValue(of(lossMarketStocks)),
          },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      const holding = portfolio.holdings[0];
      expect(holding.totalProfitLoss?.direction).toBe(Direction.DOWN);
      expect(portfolio.dayProfitLoss?.direction).toBe(Direction.DOWN);
      done();
    });
  });

  it('should handle empty market stocks', (done) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: new BehaviorSubject([]) },
        },
        {
          provide: MarketService,
          useValue: { getStocks: jest.fn().mockReturnValue(of([])) },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      expect(portfolio.holdings.length).toBe(0);
      expect(portfolio.investment).toBe(0);
      expect(portfolio.marketValue).toBe(0);
      done();
    });
  });

  it('should handle missing quote for market stock', (done) => {
    const noQuoteStocks = [
      {
        ...mockMarketStocks[0],
        quote: undefined,
      },
    ];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: mockStorageStocks$ },
        },
        {
          provide: MarketService,
          useValue: { getStocks: jest.fn().mockReturnValue(of(noQuoteStocks)) },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      expect(portfolio.holdings[0].marketValue).toBe(0);
      done();
    });
  });

  it('should handle transactions without charges and use default uuid if storageStock missing', (done) => {
    const noChargesStock = [
      {
        id: 'no-charges',
        vendorCode: { etm: { primary: 'etm99' } },
        transactions: [
          {
            id: 't3',
            type: TransactionType.BUY,
            date: 1000,
            price: 100,
            quantity: 1,
            charges: undefined,
          },
        ],
      },
    ];
    const marketStock99 = [
      {
        name: 'New Stock',
        vendorCode: { etm: { primary: 'etm99' } },
        scripCode: { nse: 'NEW' },
        quote: {
          nse: {
            price: 110,
            change: { direction: Direction.UP, percentage: 10, value: 10 },
          },
        },
      },
    ];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: new BehaviorSubject(noChargesStock) },
        },
        {
          provide: MarketService,
          useValue: { getStocks: jest.fn().mockReturnValue(of(marketStock99)) },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      expect(portfolio.holdings[0].investment).toBe(100); // 100 * 1 + 0 charges
      expect(portfolio.holdings[0].id).toBe('no-charges');
      done();
    });
  });

  it('should handle storageStock mismatch and use uuid-fallback', (done) => {
    const storageStocks = [
      { vendorCode: { etm: { primary: 'mismatch' } }, transactions: [] },
    ];
    const marketStocks = [
      {
        name: 'M',
        vendorCode: { etm: { primary: 'etm1' } },
        quote: { nse: { price: 10 } },
      } as any,
    ];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: new BehaviorSubject(storageStocks) },
        },
        {
          provide: MarketService,
          useValue: { getStocks: jest.fn().mockReturnValue(of(marketStocks)) },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      expect(portfolio.holdings[0].id).toBe('mock-uuid');
      done();
    });
  });

  it('should handle SELL transactions with charges and DOWN direction', (done) => {
    const storageStocks = [
      {
        vendorCode: { etm: { primary: 'etm-sell' } },
        transactions: [
          {
            id: 't4',
            type: TransactionType.BUY,
            date: 1000,
            price: 100,
            quantity: 10,
            charges: 10,
          },
          {
            id: 't5',
            type: TransactionType.SELL,
            date: 2000,
            price: 110,
            quantity: 5,
            charges: 5,
          },
        ],
      },
    ];
    const marketStocks = [
      {
        name: 'Sell Co',
        vendorCode: { etm: { primary: 'etm-sell' } },
        quote: {
          nse: { price: 80, change: { direction: Direction.DOWN, value: -10 } },
        },
      } as any,
    ];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: new BehaviorSubject(storageStocks) },
        },
        {
          provide: MarketService,
          useValue: { getStocks: () => of(marketStocks) },
        },
      ],
    });

    const svc = TestBed.inject(PortfolioService);
    svc.portfolio$.subscribe((portfolio) => {
      const h = portfolio.holdings[0];
      // BUY 10@100+10=1010. SELL 5@110-5=545. Net Invest=465. Qty=5.
      // MarketValue = 80*5=400. Profit = 400 - 465 = -65 (DOWN)
      expect(h.quantity).toBe(5);
      expect(h.totalProfitLoss?.direction).toBe(Direction.DOWN);
      done();
    });
  });
});
