import { TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject, of } from 'rxjs';

import { provideHttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard.service';
import { PortfolioService } from './portfolio.service';
import { PlanService } from './core/plan.service';
import { MarketService } from './core/market.service';
import { Direction } from '../models/market';

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

const mockPortfolioWithHoldings = {
  holdings: [
    {
      id: 'h-1',
      name: 'Test - EMPLOYEE',
      quantity: 10,
      investment: 1500,
      marketValue: 1725,
      dayProfitLoss: { direction: Direction.UP, percentage: 1.45, value: 2.5 },
      totalProfitLoss: { direction: Direction.UP, percentage: 15, value: 225 },
    },
  ],
  investment: 1500,
  marketValue: 1725,
  dayProfitLoss: { direction: Direction.UP, percentage: 1.45, value: 2.5 },
  totalProfitLoss: { direction: Direction.UP, percentage: 15, value: 225 },
};

const mockEmptyPortfolio = {
  holdings: [],
  investment: 0,
  marketValue: 0,
  dayProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
  totalProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
};

const mockStock = {
  name: 'Apple Inc',
  scripCode: { isin: 'US0378331005', ticker: 'AAPL', country: 'US' },
  vendorCode: { mc: { primary: 'AAPL:US' } },
  quote: {
    price: 150.5,
    change: { direction: Direction.UP, percentage: 1.25, value: 1.85 },
  },
};

describe('DashboardService', () => {
  let service: DashboardService;
  let portfolio$: BehaviorSubject<any>;
  let plan$: BehaviorSubject<any>;

  beforeEach(() => {
    portfolio$ = new BehaviorSubject(mockPortfolioWithHoldings);
    plan$ = new BehaviorSubject(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        {
          provide: LOGGER,
          useValue: mockLogger,
        },
        {
          provide: PortfolioService,
          useValue: { portfolio$: portfolio$.asObservable() },
        },
        {
          provide: PlanService,
          useValue: { plan$: plan$.asObservable() },
        },
        {
          provide: MarketService,
          useValue: {
            getStock: jest.fn().mockReturnValue(of(mockStock)),
          },
        },
      ],
    });
    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('kpi$ with portfolio and stock', () => {
    beforeEach(() => {
      plan$.next({
        stock: { vendorCode: { mc: { primary: 'AAPL:US' } } },
      });
    });

    it('should return portfolio day and total cards when holdings exist', (done) => {
      service.kpi$.subscribe((kpi) => {
        expect(kpi.cards.length).toBe(3);
        expect(kpi.cards[0].id).toBe('portfolio.day');
        expect(kpi.cards[1].id).toBe('portfolio.total');
        expect(kpi.cards[2].id).toBe('US0378331005');
        done();
      });
    });

    it('should create card id from ticker when isin is missing', (done) => {
      const stockNoIsin = {
        ...mockStock,
        scripCode: { isin: undefined, ticker: 'AAPL', country: 'US' },
      };
      const portfolio$2 = new BehaviorSubject(mockPortfolioWithHoldings);
      const plan$2 = new BehaviorSubject({
        stock: { vendorCode: { mc: { primary: 'AAPL:US' } } },
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          { provide: LOGGER, useValue: mockLogger },
          { provide: PortfolioService, useValue: { portfolio$: portfolio$2.asObservable() } },
          { provide: PlanService, useValue: { plan$: plan$2.asObservable() } },
          { provide: MarketService, useValue: { getStock: jest.fn().mockReturnValue(of(stockNoIsin)) } },
        ],
      });
      const svc = TestBed.inject(DashboardService);
      svc.kpi$.subscribe((kpi) => {
        expect(kpi.cards[2].id).toBe('AAPL');
        done();
      });
    });

    it('should use stock name as card id when isin and ticker are missing', (done) => {
      const stockNoCodes = {
        ...mockStock,
        scripCode: { isin: undefined, ticker: undefined, country: 'US' },
      };
      const portfolio$3 = new BehaviorSubject(mockPortfolioWithHoldings);
      const plan$3 = new BehaviorSubject({
        stock: { vendorCode: { mc: { primary: 'AAPL:US' } } },
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          { provide: LOGGER, useValue: mockLogger },
          { provide: PortfolioService, useValue: { portfolio$: portfolio$3.asObservable() } },
          { provide: PlanService, useValue: { plan$: plan$3.asObservable() } },
          { provide: MarketService, useValue: { getStock: jest.fn().mockReturnValue(of(stockNoCodes)) } },
        ],
      });
      const svc = TestBed.inject(DashboardService);
      svc.kpi$.subscribe((kpi) => {
        expect(kpi.cards[2].id).toBe('Apple Inc');
        done();
      });
    });
  });

  describe('kpi$ with empty portfolio holdings', () => {
    it('should omit portfolio cards when holdings are empty', (done) => {
      portfolio$.next(mockEmptyPortfolio);

      service.kpi$.subscribe((kpi) => {
        const portfolioCards = kpi.cards.filter((c) => c.id.startsWith('portfolio'));
        expect(portfolioCards.length).toBe(0);
        done();
      });
    });
  });

  describe('kpi$ without stock', () => {
    it('should only return portfolio cards when stock is null', (done) => {
      plan$.next(undefined);

      service.kpi$.subscribe((kpi) => {
        const stockCards = kpi.cards.filter((c) => !c.id.startsWith('portfolio'));
        expect(stockCards.length).toBe(0);
        expect(kpi.cards.length).toBe(2);
        done();
      });
    });

    it('should return null stock when plan has no vendorCode primary', (done) => {
      plan$.next({
        stock: { vendorCode: { mc: {} } },
      });

      service.kpi$.subscribe((kpi) => {
        const stockCards = kpi.cards.filter((c) => !c.id.startsWith('portfolio'));
        expect(stockCards.length).toBe(0);
        done();
      });
    });
  });

  describe('kpi$ with falsy portfolio', () => {
    it('should return no cards when portfolio is null', (done) => {
      const portfolio$4 = new BehaviorSubject(null);
      const plan$4 = new BehaviorSubject(undefined);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          { provide: LOGGER, useValue: mockLogger },
          { provide: PortfolioService, useValue: { portfolio$: portfolio$4.asObservable() } },
          { provide: PlanService, useValue: { plan$: plan$4.asObservable() } },
          { provide: MarketService, useValue: { getStock: jest.fn() } },
        ],
      });
      const svc = TestBed.inject(DashboardService);
      svc.kpi$.subscribe((kpi) => {
        expect(kpi.cards.length).toBe(0);
        done();
      });
    });
  });
});
