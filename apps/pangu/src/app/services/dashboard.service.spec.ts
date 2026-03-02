import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Direction } from '../models/market';
import { MarketService } from './core/market.service';
import { DashboardService } from './dashboard.service';
import { PortfolioService } from './portfolio.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockIndices = [
    {
      id: 'idx1',
      name: 'Nifty 50',
      exchange: 'NSE',
      quote: {
        value: 20000,
        change: { direction: Direction.UP, percentage: 1, value: 200 },
        advance: { percentage: 60, value: 30 },
        decline: { percentage: 40, value: 20 },
      },
    },
  ];

  const mockPortfolio = {
    holdings: [
      {
        name: 'Test Co',
        quantity: 10,
        quote: { nse: { price: 100 } },
      },
    ],
    investment: 900,
    marketValue: 1000,
    dayProfitLoss: { direction: Direction.UP, percentage: 1, value: 10 },
    totalProfitLoss: { direction: Direction.UP, percentage: 11, value: 100 },
    dayAdvance: { percentage: 100, value: 1 },
    dayDecline: { percentage: 0, value: 0 },
    totalAdvance: { percentage: 100, value: 1 },
    totalDecline: { percentage: 0, value: 0 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: MarketService,
          useValue: { getMainIndices: () => of(mockIndices) },
        },
        {
          provide: PortfolioService,
          useValue: { portfolio$: of(mockPortfolio) },
        },
      ],
    });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose kpi$ with portfolio cards when holdings exist', (done) => {
    service.kpi$.subscribe((kpi) => {
      expect(kpi.cards.length).toBeGreaterThan(0);
      // Portfolio day card
      const dayCard = kpi.cards.find((c) => c.id === 'portfolio.day');
      expect(dayCard).toBeTruthy();
      expect(dayCard!.title).toBe('Portfolio');
      expect(dayCard!.subtitle).toBe('Day');
      // Portfolio total card
      const totalCard = kpi.cards.find((c) => c.id === 'portfolio.total');
      expect(totalCard).toBeTruthy();
      expect(totalCard!.subtitle).toBe('Total');
      // Index card
      const indexCard = kpi.cards.find((c) => c.id === 'idx1');
      expect(indexCard).toBeTruthy();
      expect(indexCard!.title).toBe('Nifty 50');
      done();
    });
  });

  it('should handle negative and zero portfolio profit/loss', (done) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: MarketService,
          useValue: { getMainIndices: () => of(mockIndices) },
        },
        {
          provide: PortfolioService,
          useValue: {
            portfolio$: of({
              ...mockPortfolio,
              dayProfitLoss: {
                direction: Direction.DOWN,
                percentage: -1,
                value: -10,
              },
            }),
          },
        },
      ],
    });

    const svc = TestBed.inject(DashboardService);
    svc.kpi$.subscribe((kpi) => {
      const dayCard = kpi.cards.find((c) => c.id === 'portfolio.day');
      expect(dayCard?.change?.direction).toBe(Direction.DOWN);
      done();
    });
  });

  it('should handle portfolio with missing dayProfitLoss', (done) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: MarketService,
          useValue: { getMainIndices: () => of(mockIndices) },
        },
        {
          provide: PortfolioService,
          useValue: {
            portfolio$: of({
              ...mockPortfolio,
              dayProfitLoss: undefined,
            }),
          },
        },
      ],
    });

    const svc = TestBed.inject(DashboardService);
    svc.kpi$.subscribe((kpi) => {
      const dayCard = kpi.cards.find((c) => c.id === 'portfolio.day');
      expect(dayCard?.change).toBeUndefined();
      done();
    });
  });

  it('should handle dashboard with empty portfolio holdings', (done) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: MarketService,
          useValue: { getMainIndices: () => of(mockIndices) },
        },
        {
          provide: PortfolioService,
          useValue: {
            portfolio$: of({
              holdings: [],
              marketValue: 0,
              dayProfitLoss: {
                direction: Direction.UP,
                percentage: 0,
                value: 0,
              },
              totalProfitLoss: {
                direction: Direction.UP,
                percentage: 0,
                value: 0,
              },
            }),
          },
        },
      ],
    });

    const svc = TestBed.inject(DashboardService);
    svc.kpi$.subscribe((kpi) => {
      const portfolioCard = kpi.cards.find((c) => c.id.includes('portfolio'));
      expect(portfolioCard).toBeUndefined();
      done();
    });
  });

  it('should handle indices with no quote', (done) => {
    const noQuoteIndices = [
      { id: 'idx2', name: 'No Quote Index', exchange: 'NSE', quote: undefined },
    ];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: MarketService,
          useValue: { getMainIndices: () => of(noQuoteIndices) },
        },
        {
          provide: PortfolioService,
          useValue: { portfolio$: of(mockPortfolio) },
        },
      ],
    });

    const svc = TestBed.inject(DashboardService);
    svc.kpi$.subscribe((kpi) => {
      const indexCard = kpi.cards.find((c) => c.id === 'idx2');
      expect(indexCard).toBeTruthy();
      expect(indexCard?.value).toBeUndefined();
      done();
    });
  });
});
