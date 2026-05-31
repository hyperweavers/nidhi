import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { PortfolioPage } from './portfolio.page';
import { PortfolioService } from '../../services/portfolio.service';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { Direction } from '../../models/market';
import { Holding, Portfolio, TransactionType } from '../../models/portfolio';

const mockHolding: Holding = {
  id: 'h1',
  name: 'Reliance Industries',
  scripCode: { isin: 'INE002A01018', nse: 'RELIANCE', bse: '500325' },
  vendorCode: {
    etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
    mc: { primary: 'mc-rel' },
  },
  quote: {
    nse: {
      price: 2500,
      change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
      close: 2462.5,
    },
  },
  transactions: [
    { id: 't1', type: TransactionType.BUY, date: 1700000000000, price: 2000, quantity: 10, charges: 50 },
  ],
  quantity: 10,
  averagePrice: 2005,
  investment: 20050,
  marketValue: 25000,
  totalProfitLoss: { direction: Direction.UP, percentage: 24.69, value: 4950 },
};

const mockSellHolding: Holding = {
  id: 'h2',
  name: 'TCS',
  scripCode: { isin: 'INE467B01029', nse: 'TCS', bse: '532540' },
  vendorCode: {
    etm: { primary: 'TCS', chart: 'TCS' },
    mc: { primary: 'mc-tcs' },
  },
  quote: {
    nse: {
      price: 3500,
      change: { direction: Direction.DOWN, percentage: -0.8, value: -28 },
      close: 3528,
    },
  },
  transactions: [
    { id: 't2', type: TransactionType.BUY, date: 1690000000000, price: 3200, quantity: 5, charges: 30 },
  ],
  quantity: 5,
  averagePrice: 3206,
  investment: 16030,
  marketValue: 17500,
  totalProfitLoss: { direction: Direction.UP, percentage: 9.17, value: 1470 },
};

const mockPortfolio: Portfolio = {
  holdings: [mockHolding],
  investment: 20050,
  marketValue: 25000,
  dayProfitLoss: { direction: Direction.UP, percentage: 1.5, value: 375 },
  totalProfitLoss: { direction: Direction.UP, percentage: 24.69, value: 4950 },
  dayAdvance: { percentage: 100, value: 1 },
  dayDecline: { percentage: 0, value: 0 },
  totalAdvance: { percentage: 100, value: 1 },
  totalDecline: { percentage: 0, value: 0 },
};

const emptyPortfolio: Portfolio = {
  holdings: [],
  investment: 0,
  marketValue: 0,
  dayProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
  totalProfitLoss: { direction: Direction.UP, percentage: 0, value: 0 },
  dayAdvance: { percentage: 0, value: 0 },
  dayDecline: { percentage: 0, value: 0 },
  totalAdvance: { percentage: 0, value: 0 },
  totalDecline: { percentage: 0, value: 0 },
};

describe('PortfolioPage', () => {
  let component: PortfolioPage;
  let fixture: ComponentFixture<PortfolioPage>;
  let portfolioSubject: BehaviorSubject<Portfolio>;
  let mockMarketService: jest.Mocked<Partial<MarketService>>;
  let mockStorageService: jest.Mocked<Partial<StorageService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;

  const portfolioServiceStub = () => ({ portfolio$: portfolioSubject });
  const marketServiceStub = () => mockMarketService;
  const storageServiceStub = () => mockStorageService;
  const routerStub = () => mockRouter;
  const loggerStub = () => ({
    captureException: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  });

  function renderWithPortfolio(): void {
    fixture.detectChanges();
    tick();
    tick(300);
    fixture.detectChanges();
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(PortfolioPage);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    portfolioSubject = new BehaviorSubject<Portfolio>(mockPortfolio);

    mockMarketService = {
      search: jest.fn().mockReturnValue(of([])),
      getStock: jest.fn().mockReturnValue(of(null)),
      searchSecondary: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<Partial<MarketService>>;

    mockStorageService = {
      addOrUpdate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Partial<StorageService>>;

    mockRouter = {
      navigate: jest.fn(),
    };

    (window as any).FlowbiteInstances = {
      getInstance: jest.fn().mockReturnValue({ hide: jest.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioPage],
      providers: [
        provideRouter([]),
        { provide: LOGGER, useFactory: loggerStub },
        { provide: PortfolioService, useFactory: portfolioServiceStub },
        { provide: MarketService, useFactory: marketServiceStub },
        { provide: StorageService, useFactory: storageServiceStub },
        { provide: Router, useFactory: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: jest.fn().mockReturnValue(null) },
            },
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creation', () => {
    it('should create', fakeAsync(() => {
      createComponent();
      renderWithPortfolio();
      expect(component).toBeTruthy();
    }));
  });

  describe('portfolio rendering', () => {
    it('should render holdings in a table', fakeAsync(() => {
      createComponent();
      renderWithPortfolio();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Reliance Industries');
    }));

    it('should render summary cards', fakeAsync(() => {
      createComponent();
      renderWithPortfolio();

      const dl = fixture.nativeElement.querySelector('dl');
      expect(dl).toBeTruthy();
      expect(dl.textContent).toContain('Investment');
      expect(dl.textContent).toContain('Market Value');
      expect(dl.textContent).toContain('Day Profit/Loss');
      expect(dl.textContent).toContain('Total Profit/Loss');
    }));

    it('should show empty state when no holdings', fakeAsync(() => {
      portfolioSubject.next(emptyPortfolio);
      createComponent();
      renderWithPortfolio();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl.textContent).toContain('No Holdings');
    }));

    it('should show filtered empty state when holdings list empty but investment > 0', fakeAsync(() => {
      portfolioSubject.next({ ...emptyPortfolio, investment: 1000, marketValue: 1200 });
      createComponent();
      renderWithPortfolio();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl.textContent).toContain('No matching results found');
    }));

    it('should show loading spinner when portfolio data not yet available', fakeAsync(() => {
      const delayedSubject = new Subject<Portfolio>();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PortfolioPage],
        providers: [
          provideRouter([]),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: PortfolioService, useValue: { portfolio$: delayedSubject } },
          { provide: MarketService, useFactory: marketServiceStub },
          { provide: StorageService, useFactory: storageServiceStub },
          { provide: Router, useFactory: routerStub },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: jest.fn().mockReturnValue(null) } } } },
        ],
      }).compileComponents();

      createComponent();
      fixture.detectChanges();
      tick();
      tick(300);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[role="status"]');
      expect(spinner.textContent).toContain('Loading');
    }));
  });

  describe('filter and sort', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      renderWithPortfolio();
    }));

    it('should filter by day gainers', () => {
      component.filterPortfolio('day_gainers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe('day_gainers');
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should filter by day losers', () => {
      component.filterPortfolio('day_losers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe('day_losers');
    });

    it('should filter by overall gainers', () => {
      component.filterPortfolio('overall_gainers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe('overall_gainers');
    });

    it('should filter by overall losers and sync query params', () => {
      component.filterPortfolio('overall_losers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe('overall_losers');
      expect(mockRouter.navigate).toHaveBeenCalledWith([], expect.objectContaining({
        queryParams: { filter: 'overall_losers' },
      }));
    });

    it('should clear filters', () => {
      component.filterPortfolio('day_gainers' as any);
      component.clearPortfolioFilters();
      expect((component as any).portfolioFilter$.getValue()).toBe('none');
    });

    it('should sort by name ascending', () => {
      component.sortPortfolio('name' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual(['name', 'asc']);
    });

    it('should sort by name descending', () => {
      component.sortPortfolio('name' as any, 'dsc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual(['name', 'dsc']);
    });

    it('should sort by day profit loss ascending', () => {
      component.sortPortfolio('daily_profit_loss' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual(['daily_profit_loss', 'asc']);
    });

    it('should sort by overall profit loss ascending', () => {
      component.sortPortfolio('overall_profit_loss' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual(['overall_profit_loss', 'asc']);
    });

    it('should clear filters and sort when non-default', () => {
      component.sortPortfolio('name' as any, 'asc' as any);
      component.clearFiltersAndSort();
      expect((component as any).portfolioSort$.getValue()).toEqual(['daily_profit_loss', 'dsc']);
      expect((component as any).portfolioFilter$.getValue()).toBe('none');
      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    });

    it('should not reset anything when already default', () => {
      component.clearFiltersAndSort();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('add transaction', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      renderWithPortfolio();
    }));

    it('should open buy drawer', () => {
      component.openAddTransactionDrawer(TransactionType.BUY);
      expect(component.transactionType).toBe(TransactionType.BUY);
    });

    it('should open sell drawer', () => {
      component.openAddTransactionDrawer(TransactionType.SELL);
      expect(component.transactionType).toBe(TransactionType.SELL);
    });

    it('should reject transaction with missing fields', () => {
      component.addTransaction();
      expect(component.transactionFormError).toBe('One or more field(s) containing invalid value(s)!');
    });

    it('should reject transaction with future date', fakeAsync(() => {
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = mockHolding;
      component.name.set('Test');
      const futureYear = new Date().getFullYear() + 5;
      component.date.set(`01/01/${futureYear}`);
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.addTransaction();
      tick();

      expect(component.transactionFormError).toBe('Date is in future!');
    }));

    it('should submit transaction successfully', fakeAsync(() => {
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = mockHolding;
      component.name.set('Test');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.addTransaction();
      tick();

      expect(mockStorageService.addOrUpdate).toHaveBeenCalledTimes(1);
      expect(mockStorageService.addOrUpdate).toHaveBeenCalledWith(
        mockHolding,
        expect.objectContaining({
          type: TransactionType.BUY,
          price: 100,
          quantity: 10,
          charges: 50,
        }),
      );
      expect(component.showStatusModal).toBe(true);
      expect(component.showTransactionProgress).toBe(false);
      expect(component.name()).toBe('');
      expect(component.price()).toBe(0);
    }));

    it('should reject if charges is invalid (negative)', () => {
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = mockHolding;
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(-5);

      component.addTransaction();
      expect(component.transactionFormError).toBe('One or more field(s) containing invalid value(s)!');
    });
  });

  describe('transaction form', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      renderWithPortfolio();
    }));

    it('should reset transaction form', () => {
      (component as any).selectedStock = mockHolding;
      component.transactionType = TransactionType.BUY;
      component.name.set('Test');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.resetTransactionForm();

      expect((component as any).selectedStock).toBeUndefined();
      expect(component.name()).toBe('');
      expect(component.price()).toBe(0);
      expect(component.quantity()).toBe(0);
      expect(component.charges()).toBe(0);
    });

    it('should close status modal', () => {
      component.showStatusModal = true;
      component.closeStatusModal(false);
      expect(component.showStatusModal).toBe(false);
      expect(component.transactionType).toBeUndefined();
    });

    it('should close status modal and retain transaction type', () => {
      component.showStatusModal = true;
      component.transactionType = TransactionType.BUY;
      component.closeStatusModal(true);
      expect(component.showStatusModal).toBe(false);
      expect(component.transactionType).toBe(TransactionType.BUY);
    });

    it('should compute gross and net from signals', fakeAsync(() => {
      component.price.set(200);
      component.quantity.set(5);
      component.charges.set(25);
      tick();
      expect(component.gross()).toBe(1000);
      expect(component.net()).toBe(1025);
    }));
  });

  describe('select stock', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      renderWithPortfolio();
    }));

    it('should select a stock that already has ISIN', () => {
      component.selectStock(mockHolding);
      expect((component as any).selectedStock).toEqual(mockHolding);
      expect(component.name()).toBe('Reliance Industries');
      expect(component.showSearchResults).toBe(false);
    });

    it('should show error when stock details cannot be fetched', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: { etm: { primary: 'RELIANCE', chart: 'RELIANCE' }, mc: { primary: 'mc-rel' } },
      };

      component.selectStock(stockNoIsin);
      tick();

      expect(mockMarketService.getStock).toHaveBeenCalledWith('RELIANCE', true);
      expect(component.transactionFormError).toBe('Unable to get the details of the selected stock!');
    }));

    it('should call searchSecondary when stock has exchange codes', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: { etm: { primary: 'RELIANCE', chart: 'RELIANCE' }, mc: { primary: 'mc-rel' } },
      };

      mockMarketService.getStock = jest.fn().mockReturnValue(
        of({ scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' }, vendorCode: { etm: { primary: 'RELIANCE' } } }),
      );
      mockMarketService.searchSecondary = jest.fn().mockReturnValue(of([]));

      component.selectStock(stockNoIsin);
      tick();

      expect(mockMarketService.getStock).toHaveBeenCalled();
      expect(mockMarketService.searchSecondary).toHaveBeenCalledWith('RELIANCE');
    }));

    it('should match stock from searchSecondary results', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: { etm: { primary: 'RELIANCE', chart: 'RELIANCE' }, mc: { primary: 'mc-rel' } },
      };

      const secondaryResult = {
        vendorCode: { etm: { primary: '', chart: '' }, mc: { primary: 'mc-secondary' } },
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE', bse: '500325' },
        name: 'Reliance',
        quote: { nse: { price: 2600, change: { direction: Direction.UP, percentage: 2, value: 50 } } },
      };

      mockMarketService.getStock = jest.fn().mockReturnValue(
        of({
          name: 'Reliance Industries',
          scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
          vendorCode: { etm: { primary: 'RELIANCE' } },
          details: { sector: 'Oil & Gas', industry: 'Refinery' },
          metrics: { nse: { marketCap: 1000000, marketCapType: 'Large' } },
        }),
      );
      mockMarketService.searchSecondary = jest.fn().mockReturnValue(of([secondaryResult]));

      component.selectStock(stockNoIsin);
      tick();

      expect((component as any).selectedStock?.vendorCode.mc?.primary).toBe('mc-secondary');
      expect(component.name()).toBe('Reliance Industries');
    }));
  });

  describe('search query', () => {
    it('should filter holdings based on search query', fakeAsync(() => {
      portfolioSubject.next({ ...mockPortfolio, holdings: [mockHolding, mockSellHolding] });
      createComponent();

      component.portfolioSearchQuery.set('tcs');
      tick();

      renderWithPortfolio();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('TCS');
    }));

    it('should hide all rows when search does not match', fakeAsync(() => {
      portfolioSubject.next({ ...mockPortfolio, holdings: [mockHolding, mockSellHolding] });
      createComponent();

      component.portfolioSearchQuery.set('nonexistent');
      tick();

      renderWithPortfolio();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl.textContent).toContain('No matching results found');
    }));
  });

  describe('query param restoration', () => {
    it('should restore sort and filter from valid query params', fakeAsync(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PortfolioPage],
        providers: [
          provideRouter([]),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: PortfolioService, useFactory: portfolioServiceStub },
          { provide: MarketService, useFactory: marketServiceStub },
          { provide: StorageService, useFactory: storageServiceStub },
          { provide: Router, useFactory: routerStub },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: jest.fn((key: string) => {
                    if (key === 'sortType') return 'name';
                    if (key === 'sortOrder') return 'asc';
                    if (key === 'filter') return 'day_gainers';
                    return null;
                  }),
                },
              },
            },
          },
        ],
      }).compileComponents();

      createComponent();
      tick();

      expect((component as any).portfolioSort$.getValue()).toEqual(['name', 'asc']);
      expect((component as any).portfolioFilter$.getValue()).toBe('day_gainers');
    }));

    it('should ignore invalid query param values', fakeAsync(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [PortfolioPage],
        providers: [
          provideRouter([]),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: PortfolioService, useFactory: portfolioServiceStub },
          { provide: MarketService, useFactory: marketServiceStub },
          { provide: StorageService, useFactory: storageServiceStub },
          { provide: Router, useFactory: routerStub },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: jest.fn((key: string) => {
                    if (key === 'sortType') return 'invalid_sort';
                    if (key === 'sortOrder') return 'invalid_order';
                    if (key === 'filter') return 'invalid_filter';
                    return null;
                  }),
                },
              },
            },
          },
        ],
      }).compileComponents();

      createComponent();
      tick();

      expect((component as any).portfolioSort$.getValue()).toEqual(['daily_profit_loss', 'dsc']);
      expect((component as any).portfolioFilter$.getValue()).toBe('none');
    }));
  });

  describe('portfolio$ pipeline', () => {
    it('should filter holdings by day gainers filter', fakeAsync(() => {
      const gainer: Holding = {
        ...mockHolding,
        id: 'g1',
        name: 'Gainer',
        scripCode: { isin: 'INE001G' },
        vendorCode: { etm: { primary: 'GAINER' } },
        quote: { nse: { price: 100, change: { direction: Direction.UP, percentage: 2, value: 2 } } },
      };
      const loser: Holding = {
        ...mockSellHolding,
        id: 'l1',
        name: 'Loser',
        scripCode: { isin: 'INE001L' },
        vendorCode: { etm: { primary: 'LOSER' } },
        quote: { nse: { price: 100, change: { direction: Direction.DOWN, percentage: -2, value: -2 } } },
      };
      portfolioSubject.next({ ...mockPortfolio, holdings: [gainer, loser] });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('day_gainers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Gainer');
    }));

    it('should sort by name in DOM and cover ASC/DSC branches', fakeAsync(() => {
      const holdingZ: Holding = {
        ...mockSellHolding,
        id: 'z',
        name: 'Zamato',
        scripCode: { isin: 'INE001Z' },
        vendorCode: { etm: { primary: 'ZAMATO' } },
      };
      portfolioSubject.next({ ...mockPortfolio, holdings: [holdingZ, mockHolding] });
      createComponent();
      renderWithPortfolio();

      let rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      component.sortPortfolio('name' as any, 'asc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('Reliance');
      expect(rows[1].textContent).toContain('Zamato');

      component.sortPortfolio('name' as any, 'dsc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('Zamato');
      expect(rows[1].textContent).toContain('Reliance');
    }));
  });

  describe('stock search results', () => {
    it('should search via marketService for buy', fakeAsync(() => {
      createComponent();
      component.transactionType = TransactionType.BUY;
      component.name.set('REL');

      fixture.detectChanges();
      tick();
      tick(600);
      fixture.detectChanges();

      expect(mockMarketService.search).toHaveBeenCalledWith('REL');
    }));

    it('should not search when query is too short', fakeAsync(() => {
      createComponent();
      component.transactionType = TransactionType.BUY;
      component.name.set('RE');

      fixture.detectChanges();
      tick();
      tick(600);
      fixture.detectChanges();

      expect(mockMarketService.search).not.toHaveBeenCalled();
    }));
  });
});
