import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, timeout } from 'rxjs';

import { PortfolioService } from './portfolio.service';
import { StorageService } from './core/storage.service';
import { MarketService } from './core/market.service';
import { Direction } from '../models/market';
import { TransactionType, ContributionSource, Holding } from '../models/portfolio';

const mockStorageStocks: Holding[] = [
  {
    id: 'stock-1',
    name: 'Caterpillar Inc.',
    scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
    vendorCode: { mc: { primary: 'CAT' } },
    transactions: [
      {
        id: 'tx-1',
        type: TransactionType.BUY,
        date: Date.now() - 86400000 * 30,
        quantity: 10,
        price: { value: 150, currency: { code: 'USD', country: 'United States' } },
        source: ContributionSource.EMPLOYEE,
        contribution: { value: 1500, currency: { code: 'USD', country: 'United States' } },
        charges: { value: 10, currency: { code: 'USD', country: 'United States' } },
      },
      {
        id: 'tx-2',
        type: TransactionType.BUY,
        date: Date.now() - 86400000 * 15,
        quantity: 5,
        price: { value: 160, currency: { code: 'USD', country: 'United States' } },
        source: ContributionSource.EMPLOYER,
        contribution: { value: 800, currency: { code: 'USD', country: 'United States' } },
        charges: { value: 8, currency: { code: 'USD', country: 'United States' } },
      },
    ],
  },
];

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        {
          provide: StorageService,
          useValue: { stocks$: of(mockStorageStocks) },
        },
        {
          provide: MarketService,
          useValue: {
            getStock: jest.fn().mockReturnValue(
              of({
                name: 'Caterpillar Inc.',
                scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                vendorCode: { mc: { primary: 'CAT' } },
                quote: {
                  lastUpdated: Date.now(),
                  price: 172.5,
                  change: {
                    direction: Direction.UP,
                    percentage: 1.45,
                    value: 2.5,
                  },
                  close: 168,
                },
                metrics: { marketCap: 160000000000, dividendYield: 1.8 },
                details: { sector: 'Industrials' },
              }),
            ),
          },
        },
      ],
    });
    service = TestBed.inject(PortfolioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('portfolio$', () => {
    it('should split holdings by ContributionSource (EMPLOYEE and EMPLOYER)', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.holdings.length).toBe(2);

      const employeeHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYEE'));
      const employerHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYER'));

      expect(employeeHolding).toBeTruthy();
      expect(employerHolding).toBeTruthy();
    });

    it('should calculate employee holding quantity correctly', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      const employeeHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYEE'));

      expect(employeeHolding?.quantity).toBe(10);
    });

    it('should calculate employer holding quantity correctly', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      const employerHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYER'));

      expect(employerHolding?.quantity).toBe(5);
    });

    it('should compute market value for each holding', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      portfolio.holdings.forEach((holding) => {
        const expectedMV = (holding.quantity || 0) * 172.5;
        expect(holding.marketValue).toBeCloseTo(expectedMV, 0);
      });
    });

    it('should compute total profit/loss direction as UP when value >= 0', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.totalProfitLoss.direction).toBe(Direction.UP);
    });

    it('should aggregate portfolio investment from all holdings', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.investment).toBeGreaterThan(0);
    });

    it('should aggregate portfolio market value from all holdings', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.marketValue).toBeGreaterThan(0);
    });

    it('should return empty portfolio when storage has no stocks', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of([]) } },
          { provide: MarketService, useValue: {} },
        ],
      });
      const emptyService = TestBed.inject(PortfolioService);
      const portfolio = await firstValueFrom(emptyService.portfolio$.pipe(timeout(3000)));

      expect(portfolio.holdings).toEqual([]);
      expect(portfolio.investment).toBe(0);
      expect(portfolio.marketValue).toBe(0);
    });
  });

  describe('holding computations with only EMPLOYEE transactions', () => {
    beforeEach(() => {
      const employeeOnlyStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: mockStorageStocks[0].transactions.filter(
            (t) => t.source === ContributionSource.EMPLOYEE,
          ),
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(employeeOnlyStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: { price: 172.5, change: { direction: Direction.UP, percentage: 1.45, value: 2.5 }, close: 168 },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should only create EMPLOYEE holding when no employer transactions', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.holdings.length).toBe(1);
      expect(portfolio.holdings[0].name).toContain('EMPLOYEE');
    });
  });

  describe('SELL transactions', () => {
    beforeEach(() => {
      const sellStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: [
            {
              id: 'tx-3',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 60,
              quantity: 20,
              price: { value: 100, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYEE,
              contribution: { value: 2000, currency: { code: 'USD', country: 'United States' } },
            },
            {
              id: 'tx-4',
              type: TransactionType.SELL,
              date: Date.now() - 86400000 * 30,
              quantity: 5,
              price: { value: 120, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYEE,
              contribution: { value: 600, currency: { code: 'USD', country: 'United States' } },
            },
          ],
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(sellStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: { price: 172.5, change: { direction: Direction.UP, percentage: 1.45, value: 2.5 }, close: 168 },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should compute correct net quantity after SELL transactions', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      const employeeHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYEE'));
      expect(employeeHolding?.quantity).toBe(15);
    });

    it('should correctly reduce investment amount on SELL', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      const employeeHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYEE'));
      // investment = (20 * 100 + 0) - (5 * 120 + 0) = 2000 - 600 = 1400
      expect(employeeHolding?.investment).toBe(1400);
    });
  });

  describe('portfolio with DOWN direction', () => {
    beforeEach(() => {
      const downStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: [
            {
              id: 'tx-5',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 30,
              quantity: 10,
              price: { value: 200, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYEE,
              contribution: { value: 2000, currency: { code: 'USD', country: 'United States' } },
            },
          ],
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(downStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: {
                    price: 150,
                    change: { direction: Direction.DOWN, percentage: -1.0, value: -1.5 },
                    close: 151.5,
                  },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should set totalProfitLoss direction to DOWN when market value is less than investment', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.totalProfitLoss.direction).toBe(Direction.DOWN);
    });

    it('should set dayProfitLoss direction to DOWN when daily change is negative', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.dayProfitLoss.direction).toBe(Direction.DOWN);
    });
  });

  describe('transactions without charges', () => {
    beforeEach(() => {
      const noChargesStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: [
            {
              id: 'tx-6',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 30,
              quantity: 10,
              price: { value: 150, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYEE,
              contribution: { value: 1500, currency: { code: 'USD', country: 'United States' } },
            },
          ],
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(noChargesStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: { price: 172.5, change: { direction: Direction.UP, percentage: 1.45, value: 2.5 }, close: 168 },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should compute investment correctly when charges are undefined', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      const employeeHolding = portfolio.holdings.find((h) => h.name.includes('EMPLOYEE'));
      expect(employeeHolding?.investment).toBe(1500);
    });
  });

  describe('holding without market quote', () => {
    beforeEach(() => {
      const quoteLessStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: [
            {
              id: 'tx-7',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 30,
              quantity: 10,
              price: { value: 150, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYEE,
              contribution: { value: 1500, currency: { code: 'USD', country: 'United States' } },
            },
          ],
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(quoteLessStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: undefined,
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should handle missing quote gracefully with zero fallbacks', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.holdings.length).toBeGreaterThan(0);
      expect(portfolio.marketValue).toBe(0);
      expect(portfolio.dayProfitLoss.value).toBe(0);
    });
  });

  describe('stock without id (new stock)', () => {
    beforeEach(() => {
      const newStock: Holding[] = [
        {
          ...mockStorageStocks[0],
          id: undefined,
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(newStock) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: { price: 172.5, change: { direction: Direction.UP, percentage: 1.45, value: 2.5 }, close: 168 },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should generate uuid for holdings when stock has no id', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      portfolio.holdings.forEach((h) => {
        expect(h.id).toBeTruthy();
        expect(h.id).not.toContain('stock-1');
      });
    });
  });

  describe('only employer contributions', () => {
    beforeEach(() => {
      const employerOnlyStocks: Holding[] = [
        {
          ...mockStorageStocks[0],
          transactions: [
            {
              id: 'tx-8',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 15,
              quantity: 5,
              price: { value: 160, currency: { code: 'USD', country: 'United States' } },
              source: ContributionSource.EMPLOYER,
              contribution: { value: 800, currency: { code: 'USD', country: 'United States' } },
            },
          ],
        },
      ];

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          PortfolioService,
          { provide: StorageService, useValue: { stocks$: of(employerOnlyStocks) } },
          {
            provide: MarketService,
            useValue: {
              getStock: jest.fn().mockReturnValue(
                of({
                  name: 'Caterpillar Inc.',
                  scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
                  vendorCode: { mc: { primary: 'CAT' } },
                  quote: { price: 172.5, change: { direction: Direction.UP, percentage: 1.45, value: 2.5 }, close: 168 },
                }),
              ),
            },
          },
        ],
      });
      service = TestBed.inject(PortfolioService);
    });

    it('should only create EMPLOYER holding when no employee transactions', async () => {
      const portfolio = await firstValueFrom(service.portfolio$.pipe(timeout(3000)));
      expect(portfolio.holdings.length).toBe(1);
      expect(portfolio.holdings[0].name).toContain('EMPLOYER');
    });
  });
});
