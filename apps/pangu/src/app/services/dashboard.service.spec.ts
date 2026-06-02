import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, timeout } from 'rxjs';

import { PeerChartData, Period } from '../models/chart';
import { Direction, ExchangeName } from '../models/market';
import { Holding, Portfolio, TransactionType } from '../models/portfolio';
import { MarketService } from './core/market.service';
import { DashboardService } from './dashboard.service';
import { PortfolioService } from './portfolio.service';

const tcsTxDate = Date.now() - 86400000 * 45;
const relianceTx1Date = Date.now() - 86400000 * 60;
const relianceTx2Date = Date.now() - 86400000 * 30;

const mockPortfolio: Portfolio = {
  holdings: [
    {
      id: 'h1',
      name: 'Reliance Industries Ltd.',
      scripCode: { nse: 'RELIANCE' },
      vendorCode: { etm: { primary: 'comp-123', chart: 'RELIANCE' } },
      details: { sector: 'Oil & Gas', industry: 'Refineries' },
      metrics: {
        nse: {
          marketCapType: 'Large Cap',
          marketCap: 1800000000000,
          faceValue: 10,
          pe: 28.5,
          pb: 3.2,
          eps: 98,
          vwap: 2775,
          dividendYield: 0.5,
          bookValue: 850,
        },
      },
      quote: {
        nse: {
          price: 2780.5,
          change: { direction: Direction.UP, percentage: 1.25, value: 35 },
          close: 2745.5,
        },
      },
      transactions: [
        {
          id: 'tx1',
          type: TransactionType.BUY,
          date: relianceTx1Date,
          quantity: 10,
          price: 2500,
          charges: 20,
        },
        {
          id: 'tx2',
          type: TransactionType.BUY,
          date: relianceTx2Date,
          quantity: 5,
          price: 2600,
          charges: 15,
        },
      ],
      quantity: 15,
      averagePrice: 2533.33,
      investment: 38035,
      marketValue: 41707.5,
      totalProfitLoss: {
        direction: Direction.UP,
        percentage: 9.65,
        value: 3672.5,
      },
    },
    {
      id: 'h2',
      name: 'TCS Ltd.',
      scripCode: { nse: 'TCS' },
      vendorCode: { etm: { primary: 'comp-456', chart: 'TCS' } },
      details: { sector: 'Technology', industry: 'IT Services' },
      metrics: {
        nse: {
          marketCapType: 'Large Cap',
          marketCap: 1200000000000,
          faceValue: 1,
          pe: 35,
          pb: 15,
          eps: 120,
          vwap: 3800,
          dividendYield: 1.2,
          bookValue: 250,
        },
      },
      quote: {
        nse: {
          price: 3850,
          change: { direction: Direction.UP, percentage: 0.8, value: 30 },
          close: 3820,
        },
      },
      transactions: [
        {
          id: 'tx3',
          type: TransactionType.BUY,
          date: tcsTxDate,
          quantity: 8,
          price: 3600,
          charges: 25,
        },
      ],
      quantity: 8,
      averagePrice: 3600,
      investment: 28825,
      marketValue: 30800,
      totalProfitLoss: {
        direction: Direction.UP,
        percentage: 6.85,
        value: 1975,
      },
    },
  ],
  investment: 66860,
  marketValue: 72507.5,
  dayProfitLoss: { direction: Direction.UP, percentage: 0.85, value: 585 },
  totalProfitLoss: { direction: Direction.UP, percentage: 8.45, value: 5647.5 },
  dayAdvance: { percentage: 100, value: 2 },
  dayDecline: { percentage: 0, value: 0 },
  totalAdvance: { percentage: 100, value: 2 },
  totalDecline: { percentage: 0, value: 0 },
};

describe('DashboardService', () => {
  let service: DashboardService;
  let mockMarketService: Partial<MarketService>;
  let mockPortfolioService: Partial<PortfolioService>;

  beforeEach(() => {
    mockMarketService = {
      getMainIndices: jest.fn().mockReturnValue(
        of([
          {
            id: '2369',
            name: 'Nifty 50',
            exchange: ExchangeName.NSE,
            vendorCode: { etm: { primary: '2369' } },
            quote: {
              value: 22000,
              change: { direction: Direction.UP, percentage: 0.5, value: 100 },
              advance: { percentage: 70, value: 35 },
              decline: { percentage: 30, value: 15 },
            },
          },
          {
            id: '2365',
            name: 'BSE Sensex',
            exchange: ExchangeName.BSE,
            vendorCode: { etm: { primary: '2365' } },
            quote: {
              value: 72000,
              change: { direction: Direction.UP, percentage: 0.4, value: 300 },
              advance: { percentage: 65, value: 25 },
              decline: { percentage: 30, value: 10 },
            },
          },
        ]),
      ),
      getIntraDayPeerChart: jest.fn().mockReturnValue(of([])),
      getHistoricPeerChart: jest.fn().mockReturnValue(of([])),
    };

    mockPortfolioService = {
      portfolio$: of(mockPortfolio),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: MarketService, useValue: mockMarketService },
        { provide: PortfolioService, useValue: mockPortfolioService },
      ],
    });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('kpi$', () => {
    it('should emit KPI cards with indices and portfolio data', async () => {
      const kpi = await firstValueFrom(service.kpi$.pipe(timeout(3000)));

      expect(kpi.cards.length).toBeGreaterThan(0);

      const portfolioCard = kpi.cards.find((c) => c.id === 'portfolio.day');
      expect(portfolioCard).toBeTruthy();
      expect(portfolioCard?.title).toBe('Portfolio');

      const niftyCard = kpi.cards.find((c) => c.title === 'Nifty 50');
      expect(niftyCard).toBeTruthy();
      expect(niftyCard?.value).toBe(22000);

      const sensexCard = kpi.cards.find((c) => c.title === 'BSE Sensex');
      expect(sensexCard).toBeTruthy();
      expect(sensexCard?.value).toBe(72000);
    });

    it('should include both portfolio-day and portfolio-total cards', async () => {
      const kpi = await firstValueFrom(service.kpi$.pipe(timeout(3000)));
      const dayCard = kpi.cards.find((c) => c.id === 'portfolio.day');
      const totalCard = kpi.cards.find((c) => c.id === 'portfolio.total');

      expect(dayCard).toBeTruthy();
      expect(totalCard).toBeTruthy();
    });
  });

  describe('kpi$ with empty portfolio', () => {
    beforeEach(() => {
      mockPortfolioService = {
        portfolio$: of({
          holdings: [],
          investment: 0,
          marketValue: 0,
          dayProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
          totalProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
          dayAdvance: { percentage: 0, value: 0 },
          dayDecline: { percentage: 0, value: 0 },
          totalAdvance: { percentage: 0, value: 0 },
          totalDecline: { percentage: 0, value: 0 },
        } as Portfolio),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockMarketService },
          { provide: PortfolioService, useValue: mockPortfolioService },
        ],
      });
      service = TestBed.inject(DashboardService);
    });

    it('should only emit index cards when portfolio has no holdings', async () => {
      const kpi = await firstValueFrom(service.kpi$.pipe(timeout(3000)));

      const portfolioCards = kpi.cards.filter((c) =>
        c.id.startsWith('portfolio.'),
      );
      expect(portfolioCards.length).toBe(0);

      const indexCards = kpi.cards.filter(
        (c) => !c.id.startsWith('portfolio.'),
      );
      expect(indexCards.length).toBeGreaterThan(0);
    });
  });

  describe('getPortfolioChart', () => {
    it('should return empty array when no portfolio', async () => {
      mockPortfolioService = { portfolio$: of(null as unknown as Portfolio) };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          {
            provide: MarketService,
            useValue: {
              getMainIndices: jest.fn().mockReturnValue(of([])),
              getIntraDayPeerChart: jest.fn().mockReturnValue(of([])),
              getHistoricPeerChart: jest.fn().mockReturnValue(of([])),
            },
          },
          { provide: PortfolioService, useValue: mockPortfolioService },
        ],
      });
      service = TestBed.inject(DashboardService);

      const data = await firstValueFrom(
        service.getPortfolioChart(Period.ONE_DAY).pipe(timeout(3000)),
      );
      expect(data).toEqual([]);
    });

    it('should call getIntraDayPeerChart for ONE_DAY period', async () => {
      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest.fn().mockReturnValue(of([])),
        getHistoricPeerChart: jest.fn().mockReturnValue(of([])),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(mockPortfolio) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      await firstValueFrom(
        service.getPortfolioChart(Period.ONE_DAY).pipe(timeout(3000)),
      );
      expect(mockChartService.getIntraDayPeerChart).toHaveBeenCalled();
    });

    it('should call getHistoricPeerChart for non-ONE_DAY period', async () => {
      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest.fn().mockReturnValue(of([])),
        getHistoricPeerChart: jest.fn().mockReturnValue(of([])),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(mockPortfolio) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      await firstValueFrom(
        service.getPortfolioChart(Period.ONE_MONTH).pipe(timeout(3000)),
      );
      expect(mockChartService.getHistoricPeerChart).toHaveBeenCalled();
    });

    it('should return empty array when all holdings lack chart codes', async () => {
      const holdingsWithoutChart: Holding[] = [
        {
          id: 'h3',
          name: 'No Chart Holding',
          scripCode: { nse: 'NONE' },
          vendorCode: { etm: { primary: 'comp-789' } },
          transactions: [
            {
              id: 'tx4',
              type: TransactionType.BUY,
              date: Date.now() - 86400000 * 10,
              quantity: 5,
              price: 500,
              charges: 10,
            },
          ],
          quantity: 5,
          marketValue: 2500,
        },
      ];
      const portfolioNoChart: Portfolio = {
        ...mockPortfolio,
        holdings: holdingsWithoutChart,
        investment: 2510,
        marketValue: 2500,
        dayProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
        totalProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
        dayAdvance: { percentage: 0, value: 0 },
        dayDecline: { percentage: 0, value: 0 },
        totalAdvance: { percentage: 0, value: 0 },
        totalDecline: { percentage: 0, value: 0 },
      };

      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest.fn().mockReturnValue(of([])),
        getHistoricPeerChart: jest.fn().mockReturnValue(of([])),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(portfolioNoChart) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      const data = await firstValueFrom(
        service.getPortfolioChart(Period.ONE_DAY).pipe(timeout(3000)),
      );
      expect(data).toEqual([]);
      expect(mockChartService.getIntraDayPeerChart).not.toHaveBeenCalled();
    });

    it('should return empty array when peer chart data is empty', async () => {
      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest
          .fn()
          .mockReturnValue(of([] as PeerChartData[])),
        getHistoricPeerChart: jest
          .fn()
          .mockReturnValue(of([] as PeerChartData[])),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(mockPortfolio) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      const data = await firstValueFrom(
        service.getPortfolioChart(Period.ONE_DAY).pipe(timeout(3000)),
      );
      expect(data).toEqual([]);
    });

    it('should process peer chart data and calculate portfolio changes', async () => {
      const now = Date.now();
      const chartTs1 = now - 86400000 * 5;
      const chartTs2 = now - 86400000 * 4;
      const txDate1 = now - 86400000 * 60;
      const txDate2 = now - 86400000 * 30;
      const txDate3 = now - 86400000 * 45;

      const chartDate1 = new Date(chartTs1).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      const chartDate2 = new Date(chartTs2).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

      const peerChartData: PeerChartData[] = [
        {
          symbol: 'RELIANCE',
          data: [
            { time: chartDate1, value: 2700 },
            { time: chartDate2, value: 2750 },
          ],
        },
        {
          symbol: 'TCS',
          data: [
            { time: chartDate1, value: 3800 },
            { time: chartDate2, value: 3850 },
          ],
        },
      ];

      const portfolioWithDates = {
        ...mockPortfolio,
        holdings: [
          {
            ...mockPortfolio.holdings[0],
            transactions: [
              {
                id: 'tx1',
                type: TransactionType.BUY,
                date: txDate1,
                quantity: 10,
                price: 2500,
                charges: 20,
              },
              {
                id: 'tx2',
                type: TransactionType.BUY,
                date: txDate2,
                quantity: 5,
                price: 2600,
                charges: 15,
              },
            ],
          },
          {
            ...mockPortfolio.holdings[1],
            transactions: [
              {
                id: 'tx3',
                type: TransactionType.BUY,
                date: txDate3,
                quantity: 8,
                price: 3600,
                charges: 25,
              },
            ],
          },
        ],
      } as Portfolio;

      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest.fn().mockReturnValue(of(peerChartData)),
        getHistoricPeerChart: jest.fn().mockReturnValue(of(peerChartData)),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(portfolioWithDates) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      const data = await firstValueFrom(
        service.getPortfolioChart(Period.ONE_MONTH).pipe(timeout(3000)),
      );

      expect(data.length).toBe(2);
      expect(data[0].time).toBe(chartDate1);
      expect(data[1].time).toBe(chartDate2);
      expect(data[0].value).toBeGreaterThan(0);
      expect(data[1].value).toBeGreaterThan(0);
    });

    it('should return empty array when peerChartData is null or undefined', async () => {
      const mockChartService = {
        getMainIndices: jest.fn().mockReturnValue(of([])),
        getIntraDayPeerChart: jest
          .fn()
          .mockReturnValue(of(null as unknown as PeerChartData[])),
        getHistoricPeerChart: jest
          .fn()
          .mockReturnValue(of(undefined as unknown as PeerChartData[])),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          { provide: MarketService, useValue: mockChartService },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of(mockPortfolio) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      const data = await firstValueFrom(
        service.getPortfolioChart(Period.ONE_DAY).pipe(timeout(3000)),
      );
      expect(data).toEqual([]);
    });
  });

  describe('getPortfolioComposition', () => {
    it('should return stock weights, sector weights and market cap weights', async () => {
      const composition = await firstValueFrom(
        service.getPortfolioComposition().pipe(timeout(3000)),
      );

      expect(composition.stocks.length).toBeGreaterThan(0);
      expect(composition.weight.length).toBeGreaterThan(0);
      expect(composition.sectors.length).toBeGreaterThan(0);
      expect(composition.sectorWeights.length).toBeGreaterThan(0);
      expect(composition.marketCaps.length).toBeGreaterThan(0);
      expect(composition.marketCapWeights.length).toBeGreaterThan(0);
    });

    it('should allocate sector weights correctly', async () => {
      const composition = await firstValueFrom(
        service.getPortfolioComposition().pipe(timeout(3000)),
      );
      const oilSectorIndex = composition.sectors.indexOf('Oil & Gas');
      expect(composition.sectorWeights[oilSectorIndex]).toBeGreaterThan(0);
    });

    it('should return empty arrays when portfolio has no holdings', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DashboardService,
          {
            provide: MarketService,
            useValue: { getMainIndices: jest.fn().mockReturnValue(of([])) },
          },
          {
            provide: PortfolioService,
            useValue: { portfolio$: of({ ...mockPortfolio, holdings: [] }) },
          },
        ],
      });
      service = TestBed.inject(DashboardService);

      const composition = await firstValueFrom(
        service.getPortfolioComposition().pipe(timeout(3000)),
      );
      expect(composition.stocks).toEqual([]);
      expect(composition.weight).toEqual([]);
      expect(composition.sectors).toEqual([]);
    });
  });

  describe('calculatePortfolioChangeAtDate (private)', () => {
    const baseTimestamp = new Date('2024-01-20').getTime();

    it('should calculate positive change when price map has all symbols', () => {
      const holdings = [
        {
          id: 'h1',
          name: 'RELIANCE',
          vendorCode: { etm: { chart: 'RELIANCE' } },
          transactions: [
            {
              id: 'tx1',
              type: TransactionType.BUY,
              date: new Date('2024-01-05').getTime(),
              quantity: 10,
              price: 2500,
              charges: 20,
            },
          ],
        } as Holding,
      ];
      const priceMap = new Map<string, number>([['RELIANCE', 2700]]);

      const result = (service as any).calculatePortfolioChangeAtDate(
        holdings,
        baseTimestamp,
        priceMap,
      );
      const expectedChange =
        ((2700 * 10 - (10 * 2500 + 20)) / (10 * 2500 + 20)) * 100;
      expect(result).toBeCloseTo(expectedChange, 2);
    });

    it('should handle missing symbol in price map by using price 0', () => {
      const holdings = [
        {
          id: 'h1',
          name: 'RELIANCE',
          vendorCode: { etm: { chart: 'RELIANCE' } },
          transactions: [
            {
              id: 'tx1',
              type: TransactionType.BUY,
              date: new Date('2024-01-05').getTime(),
              quantity: 10,
              price: 2500,
              charges: 20,
            },
          ],
        } as Holding,
      ];
      const priceMap = new Map<string, number>();

      const result = (service as any).calculatePortfolioChangeAtDate(
        holdings,
        baseTimestamp,
        priceMap,
      );
      const investment = 10 * 2500 + 20;
      const expectedChange = ((0 - investment) / investment) * 100;
      expect(result).toBeCloseTo(expectedChange, 2);
    });

    it('should return 0 when portfolio investment is 0', () => {
      const holdings = [
        {
          id: 'h1',
          name: 'RELIANCE',
          vendorCode: { etm: { chart: 'RELIANCE' } },
          transactions: [],
        } as Holding,
      ];
      const priceMap = new Map<string, number>();

      const result = (service as any).calculatePortfolioChangeAtDate(
        holdings,
        baseTimestamp,
        priceMap,
      );
      expect(result).toBe(0);
    });

    it('should handle holdings with zero quantity at date', () => {
      const holdings = [
        {
          id: 'h1',
          name: 'RELIANCE',
          vendorCode: { etm: { chart: 'RELIANCE' } },
          transactions: [
            {
              id: 'tx1',
              type: TransactionType.BUY,
              date: baseTimestamp + 86400000,
              quantity: 10,
              price: 2500,
              charges: 20,
            },
          ],
        } as Holding,
      ];
      const priceMap = new Map<string, number>([['RELIANCE', 2700]]);

      const result = (service as any).calculatePortfolioChangeAtDate(
        holdings,
        baseTimestamp,
        priceMap,
      );
      expect(result).toBe(0);
    });

    it('should handle holding with chart code but quantity > 0 (chart code check)', () => {
      const holdings = [
        {
          id: 'h1',
          name: 'NOCHART',
          vendorCode: { etm: {} },
          transactions: [
            {
              id: 'tx1',
              type: TransactionType.BUY,
              date: new Date('2024-01-05').getTime(),
              quantity: 10,
              price: 1000,
              charges: 10,
            },
          ],
        } as unknown as Holding,
      ];
      const priceMap = new Map<string, number>();

      const result = (service as any).calculatePortfolioChangeAtDate(
        holdings,
        baseTimestamp,
        priceMap,
      );
      const investment = 10 * 1000 + 10;
      const expectedChange = ((0 - investment) / investment) * 100;
      expect(result).toBeCloseTo(expectedChange, 2);
    });
  });

  describe('calculateHoldingAtDate (private)', () => {
    it('should calculate quantity and investment for BUY transactions', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
            charges: 20,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.quantity).toBe(10);
      expect(result.investment).toBe(10 * 2500 + 20);
    });

    it('should handle SELL transactions reducing quantity', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
            charges: 20,
          },
          {
            id: 'tx2',
            type: TransactionType.SELL,
            date: 1500,
            quantity: 3,
            price: 2600,
            charges: 10,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.quantity).toBe(7);
      expect(result.investment).toBe(10 * 2500 + 20 - (3 * 2600 + 10));
    });

    it('should include charges in investment calculation', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
            charges: 50,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.investment).toBe(10 * 2500 + 50);
    });

    it('should filter transactions after the given date', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
            charges: 20,
          },
          {
            id: 'tx2',
            type: TransactionType.BUY,
            date: 3000,
            quantity: 5,
            price: 2600,
            charges: 15,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.quantity).toBe(10);
      expect(result.investment).toBe(10 * 2500 + 20);
    });

    it('should handle transactions with no charges (charges undefined)', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.quantity).toBe(10);
      expect(result.investment).toBe(10 * 2500);
    });

    it('should handle SELL transactions with charges', () => {
      const holding = {
        id: 'h1',
        name: 'RELIANCE',
        vendorCode: { etm: { chart: 'RELIANCE' } },
        transactions: [
          {
            id: 'tx1',
            type: TransactionType.BUY,
            date: 1000,
            quantity: 10,
            price: 2500,
            charges: 20,
          },
          {
            id: 'tx2',
            type: TransactionType.SELL,
            date: 1500,
            quantity: 10,
            price: 2600,
            charges: 15,
          },
        ],
      } as unknown as Holding;

      const result = (service as any).calculateHoldingAtDate(holding, 2000);
      expect(result.quantity).toBe(0);
      expect(result.investment).toBe(10 * 2500 + 20 - (10 * 2600 + 15));
    });
  });

  describe('calculatePortfolioWeight (private)', () => {
    it('should sort holdings by marketValue descending', () => {
      const holdings = [
        { name: 'Small', marketValue: 100 } as Holding,
        { name: 'Large', marketValue: 500 } as Holding,
        { name: 'Medium', marketValue: 300 } as Holding,
      ];

      const result = (service as any).calculatePortfolioWeight(holdings, 900);
      expect(result.stocks).toEqual(['Large', 'Medium', 'Small']);
      expect(result.weight[0]).toBeCloseTo((500 / 900) * 100, 2);
      expect(result.weight[1]).toBeCloseTo((300 / 900) * 100, 2);
      expect(result.weight[2]).toBeCloseTo((100 / 900) * 100, 2);
    });

    it('should filter out holdings with zero or negative marketValue', () => {
      const holdings = [
        { name: 'Valid', marketValue: 400 } as Holding,
        { name: 'Zero', marketValue: 0 } as Holding,
        { name: 'Negative', marketValue: -100 } as Holding,
        { name: 'Another Valid', marketValue: 600 } as Holding,
      ];

      const result = (service as any).calculatePortfolioWeight(holdings, 1000);
      expect(result.stocks).toEqual(['Another Valid', 'Valid']);
      expect(result.stocks).not.toContain('Zero');
      expect(result.stocks).not.toContain('Negative');
    });

    it('should return 0 weight for holding with undefined/null marketValue', () => {
      const holdings = [
        { name: 'Undefined', marketValue: undefined } as unknown as Holding,
        { name: 'Valid', marketValue: 500 } as unknown as Holding,
      ];

      const result = (service as any).calculatePortfolioWeight(holdings, 500);
      expect(result.stocks).toEqual(['Valid']);
      expect(result.stocks).not.toContain('Undefined');
    });
  });

  describe('calculateSectorWeight (private)', () => {
    it('should aggregate multiple holdings in same sector', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 600,
          details: { sector: 'Technology' },
        } as Holding,
        {
          name: 'H2',
          marketValue: 200,
          details: { sector: 'Technology' },
        } as Holding,
        {
          name: 'H3',
          marketValue: 200,
          details: { sector: 'Oil & Gas' },
        } as Holding,
      ];

      const result = (service as any).calculateSectorWeight(holdings, 1000);
      expect(result.sectors).toEqual(['Technology', 'Oil & Gas']);
      expect(result.weights[0]).toBeCloseTo(80, 2);
      expect(result.weights[1]).toBeCloseTo(20, 2);
    });

    it('should use Unknown for holdings without sector details', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 300,
          details: { sector: 'Technology' },
        } as Holding,
        { name: 'H2', marketValue: 200 } as Holding,
      ];

      const result = (service as any).calculateSectorWeight(holdings, 500);
      expect(result.sectors).toContain('Unknown');
      expect(result.sectors).toContain('Technology');
    });

    it('should skip holdings with zero or negative marketValue', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 400,
          details: { sector: 'Technology' },
        } as Holding,
        {
          name: 'H2',
          marketValue: 0,
          details: { sector: 'Oil & Gas' },
        } as Holding,
        {
          name: 'H3',
          marketValue: -100,
          details: { sector: 'Energy' },
        } as Holding,
      ];

      const result = (service as any).calculateSectorWeight(holdings, 400);
      expect(result.sectors).toEqual(['Technology']);
      expect(result.weights[0]).toBeCloseTo(100, 2);
    });

    it('should sort sectors by total market value descending', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 100,
          details: { sector: 'Small' },
        } as Holding,
        {
          name: 'H2',
          marketValue: 500,
          details: { sector: 'Large' },
        } as Holding,
        {
          name: 'H3',
          marketValue: 200,
          details: { sector: 'Medium' },
        } as Holding,
      ];

      const result = (service as any).calculateSectorWeight(holdings, 800);
      expect(result.sectors).toEqual(['Large', 'Medium', 'Small']);
    });
  });

  describe('calculateMarketCapWeight (private)', () => {
    it('should aggregate multiple market cap types', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 600,
          metrics: { nse: { marketCapType: 'Large Cap' } },
        } as Holding,
        {
          name: 'H2',
          marketValue: 300,
          metrics: { nse: { marketCapType: 'Mid Cap' } },
        } as Holding,
        {
          name: 'H3',
          marketValue: 100,
          metrics: { nse: { marketCapType: 'Small Cap' } },
        } as Holding,
      ];

      const result = (service as any).calculateMarketCapWeight(holdings, 1000);
      expect(result.marketCaps).toEqual(['Large Cap', 'Mid Cap', 'Small Cap']);
      expect(result.weights[0]).toBeCloseTo(60, 2);
      expect(result.weights[1]).toBeCloseTo(30, 2);
      expect(result.weights[2]).toBeCloseTo(10, 2);
    });

    it('should use Not Classified for holdings without market cap type', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 400,
          metrics: { nse: { marketCapType: 'Large Cap' } },
        } as Holding,
        { name: 'H2', marketValue: 200 } as Holding,
        { name: 'H3', marketValue: 300, metrics: {} } as Holding,
      ];

      const result = (service as any).calculateMarketCapWeight(holdings, 900);
      expect(result.marketCaps).toContain('Not Classified');
      expect(result.marketCaps).toContain('Large Cap');
    });

    it('should skip holdings with zero or negative marketValue', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 500,
          metrics: { nse: { marketCapType: 'Large Cap' } },
        } as Holding,
        {
          name: 'H2',
          marketValue: 0,
          metrics: { nse: { marketCapType: 'Mid Cap' } },
        } as Holding,
        {
          name: 'H3',
          marketValue: -100,
          metrics: { nse: { marketCapType: 'Small Cap' } },
        } as Holding,
      ];

      const result = (service as any).calculateMarketCapWeight(holdings, 500);
      expect(result.marketCaps).toEqual(['Large Cap']);
      expect(result.weights[0]).toBeCloseTo(100, 2);
    });

    it('should sort caps by total market value descending', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 200,
          metrics: { nse: { marketCapType: 'Small' } },
        } as Holding,
        {
          name: 'H2',
          marketValue: 500,
          metrics: { nse: { marketCapType: 'Large' } },
        } as Holding,
        {
          name: 'H3',
          marketValue: 300,
          metrics: { nse: { marketCapType: 'Medium' } },
        } as Holding,
      ];

      const result = (service as any).calculateMarketCapWeight(holdings, 1000);
      expect(result.marketCaps).toEqual(['Large', 'Medium', 'Small']);
    });

    it('should handle holdings with undefined metrics.nse', () => {
      const holdings = [
        {
          name: 'H1',
          marketValue: 300,
          metrics: { bse: { marketCapType: 'Large Cap' } },
        } as unknown as Holding,
      ];

      const result = (service as any).calculateMarketCapWeight(holdings, 300);
      expect(result.marketCaps).toEqual(['Not Classified']);
      expect(result.weights[0]).toBeCloseTo(100, 2);
    });
  });
});
