import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { Direction } from '../../models/market';
import { Holding, Portfolio, TransactionType } from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioPage } from './portfolio.page';

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
    {
      id: 't1',
      type: TransactionType.BUY,
      date: 1700000000000,
      price: 2000,
      quantity: 10,
      charges: 50,
    },
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
    {
      id: 't2',
      type: TransactionType.BUY,
      date: 1690000000000,
      price: 3200,
      quantity: 5,
      charges: 30,
    },
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
      portfolioSubject.next({
        ...emptyPortfolio,
        investment: 1000,
        marketValue: 1200,
      });
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
          {
            provide: PortfolioService,
            useValue: { portfolio$: delayedSubject },
          },
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
      expect((component as any).portfolioFilter$.getValue()).toBe(
        'day_gainers',
      );
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should filter by day losers', () => {
      component.filterPortfolio('day_losers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe('day_losers');
    });

    it('should filter by overall gainers', () => {
      component.filterPortfolio('overall_gainers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe(
        'overall_gainers',
      );
    });

    it('should filter by overall losers and sync query params', () => {
      component.filterPortfolio('overall_losers' as any);
      expect((component as any).portfolioFilter$.getValue()).toBe(
        'overall_losers',
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { filter: 'overall_losers' },
        }),
      );
    });

    it('should clear filters', () => {
      component.filterPortfolio('day_gainers' as any);
      component.clearPortfolioFilters();
      expect((component as any).portfolioFilter$.getValue()).toBe('none');
    });

    it('should sort by name ascending', () => {
      component.sortPortfolio('name' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual([
        'name',
        'asc',
      ]);
    });

    it('should sort by name descending', () => {
      component.sortPortfolio('name' as any, 'dsc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual([
        'name',
        'dsc',
      ]);
    });

    it('should sort by day profit loss ascending', () => {
      component.sortPortfolio('daily_profit_loss' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual([
        'daily_profit_loss',
        'asc',
      ]);
    });

    it('should sort by overall profit loss ascending', () => {
      component.sortPortfolio('overall_profit_loss' as any, 'asc' as any);
      expect((component as any).portfolioSort$.getValue()).toEqual([
        'overall_profit_loss',
        'asc',
      ]);
    });

    it('should clear filters and sort when non-default', () => {
      component.sortPortfolio('name' as any, 'asc' as any);
      component.clearFiltersAndSort();
      expect((component as any).portfolioSort$.getValue()).toEqual([
        'daily_profit_loss',
        'dsc',
      ]);
      expect((component as any).portfolioFilter$.getValue()).toBe('none');
      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    });

    it('should not reset anything when already default', () => {
      component.clearFiltersAndSort();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should hide filter dropdown when filtering', () => {
      const hideMock = jest.fn();
      (component as any).filterDropdown = { hide: hideMock };
      component.filterPortfolio('day_gainers' as any);
      expect(hideMock).toHaveBeenCalled();
    });

    it('should hide filter dropdown when clearing filters', () => {
      const hideMock = jest.fn();
      (component as any).filterDropdown = { hide: hideMock };
      component.clearPortfolioFilters();
      expect(hideMock).toHaveBeenCalled();
    });

    it('should hide sort dropdown when sorting', () => {
      const hideMock = jest.fn();
      (component as any).sortDropdown = { hide: hideMock };
      component.sortPortfolio('name' as any, 'asc' as any);
      expect(hideMock).toHaveBeenCalled();
    });

    it('should hide both dropdowns on clearFiltersAndSort when non-default', () => {
      const hideSort = jest.fn();
      const hideFilter = jest.fn();
      (component as any).sortDropdown = { hide: hideSort };
      (component as any).filterDropdown = { hide: hideFilter };
      component.sortPortfolio('name' as any, 'asc' as any);
      component.clearFiltersAndSort();
      expect(hideSort).toHaveBeenCalledTimes(2);
      expect(hideFilter).toHaveBeenCalledTimes(1);
    });

    it('should sync sort-only query params', () => {
      component.sortPortfolio('name' as any, 'asc' as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { sortType: 'name', sortOrder: 'asc' },
        }),
      );
    });

    it('should sync filter-only query params', () => {
      component.filterPortfolio('day_gainers' as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { filter: 'day_gainers' },
        }),
      );
    });

    it('should handle null filterDropdown on filterPortfolio', () => {
      (component as any).filterDropdown = undefined;
      expect(() =>
        component.filterPortfolio('day_gainers' as any),
      ).not.toThrow();
    });

    it('should handle null filterDropdown on clearPortfolioFilters', () => {
      (component as any).filterDropdown = undefined;
      expect(() => component.clearPortfolioFilters()).not.toThrow();
    });

    it('should handle null sortDropdown on sortPortfolio', () => {
      (component as any).sortDropdown = undefined;
      expect(() =>
        component.sortPortfolio('name' as any, 'asc' as any),
      ).not.toThrow();
    });

    it('should handle null dropdowns on clearFiltersAndSort when non-default', () => {
      (component as any).sortDropdown = undefined;
      (component as any).filterDropdown = undefined;
      component.sortPortfolio('name' as any, 'asc' as any);
      expect(() => component.clearFiltersAndSort()).not.toThrow();
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
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
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
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
    });

    it('should accept transaction with zero charges', fakeAsync(() => {
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = mockHolding;
      component.name.set('Test');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(0);

      component.addTransaction();
      tick();

      expect(mockStorageService.addOrUpdate).toHaveBeenCalledTimes(1);
      expect(component.showStatusModal).toBe(true);
    }));
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

    it('should reset transaction form without datepicker', () => {
      (component as any).datepicker = undefined;
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
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      component.selectStock(stockNoIsin);
      tick();

      expect(mockMarketService.getStock).toHaveBeenCalledWith('RELIANCE', true);
      expect(component.transactionFormError).toBe(
        'Unable to get the details of the selected stock!',
      );
    }));

    it('should call searchSecondary when stock has exchange codes', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest
        .fn()
        .mockReturnValue(
          of({
            scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
            vendorCode: { etm: { primary: 'RELIANCE' } },
          }),
        );
      mockMarketService.searchSecondary = jest.fn().mockReturnValue(of([]));

      component.selectStock(stockNoIsin);
      tick();

      expect(mockMarketService.getStock).toHaveBeenCalled();
      expect(mockMarketService.searchSecondary).toHaveBeenCalledWith(
        'RELIANCE',
      );
    }));

    it('should match stock from searchSecondary results', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      const secondaryResult = {
        vendorCode: {
          etm: { primary: '', chart: '' },
          mc: { primary: 'mc-secondary' },
        },
        scripCode: { isin: 'INE002A01018', nse: 'RELIANCE', bse: '500325' },
        name: 'Reliance',
        quote: {
          nse: {
            price: 2600,
            change: { direction: Direction.UP, percentage: 2, value: 50 },
          },
        },
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
      mockMarketService.searchSecondary = jest
        .fn()
        .mockReturnValue(of([secondaryResult]));

      component.selectStock(stockNoIsin);
      tick();

      expect((component as any).selectedStock?.vendorCode.mc?.primary).toBe(
        'mc-secondary',
      );
      expect(component.name()).toBe('Reliance Industries');
    }));

    it('should call searchSecondary with bse when nse is not available', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest
        .fn()
        .mockReturnValue(
          of({
            scripCode: { bse: '500325', isin: 'INE002A01018' },
            vendorCode: { etm: { primary: 'RELIANCE' } },
          }),
        );
      mockMarketService.searchSecondary = jest.fn().mockReturnValue(of([]));

      component.selectStock(stockNoIsin);
      tick();

      expect(mockMarketService.searchSecondary).toHaveBeenCalledWith('500325');
    }));

    it('should return stockDetails as-is when no searchSecondary match found', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest.fn().mockReturnValue(
        of({
          name: 'Reliance Industries',
          scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
          vendorCode: { etm: { primary: 'RELIANCE' } },
        }),
      );
      mockMarketService.searchSecondary = jest
        .fn()
        .mockReturnValue(
          of([
            {
              scripCode: { nse: 'SOMETHING_ELSE', isin: 'OTHER_ISIN' },
              vendorCode: { etm: { primary: '' }, mc: { primary: 'other' } },
            },
          ]),
        );

      component.selectStock(stockNoIsin);
      tick();

      expect((component as any).selectedStock).toBeTruthy();
      expect((component as any).selectedStock?.vendorCode.mc).toBeUndefined();
    }));

    it('should return null when getStock returns stock without nse or bse', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest
        .fn()
        .mockReturnValue(
          of({
            scripCode: { isin: 'INE002A01018' },
            vendorCode: { etm: { primary: 'RELIANCE' } },
          }),
        );

      component.selectStock(stockNoIsin);
      tick();

      expect(component.transactionFormError).toBe(
        'Unable to get the details of the selected stock!',
      );
    }));

    it('should match searchSecondary by nse code', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest.fn().mockReturnValue(
        of({
          scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
          vendorCode: { etm: { primary: 'RELIANCE' } },
        }),
      );
      mockMarketService.searchSecondary = jest
        .fn()
        .mockReturnValue(
          of([
            {
              scripCode: { nse: 'RELIANCE', isin: 'OTHER_ISIN' },
              vendorCode: {
                etm: { primary: '' },
                mc: { primary: 'mc-nse-match' },
              },
            },
          ]),
        );

      component.selectStock(stockNoIsin);
      tick();

      expect((component as any).selectedStock?.vendorCode.mc?.primary).toBe(
        'mc-nse-match',
      );
    }));

    it('should match searchSecondary by bse code when isin and nse do not match', fakeAsync(() => {
      const stockNoIsin: Holding = {
        ...mockHolding,
        scripCode: { nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
          mc: { primary: 'mc-rel' },
        },
      };

      mockMarketService.getStock = jest.fn().mockReturnValue(
        of({
          scripCode: {
            nse: 'RELIANCE',
            isin: 'INE002A01018',
            bse: '500325' as any,
          },
          vendorCode: { etm: { primary: 'RELIANCE' } },
        }),
      );
      mockMarketService.searchSecondary = jest.fn().mockReturnValue(
        of([
          {
            scripCode: { isin: 'DIFF_ISIN', nse: 'DIFF_NSE', bse: '500325' },
            vendorCode: {
              etm: { primary: '' },
              mc: { primary: 'mc-bse-match' },
            },
          },
        ]),
      );

      component.selectStock(stockNoIsin);
      tick();

      expect((component as any).selectedStock?.vendorCode.mc?.primary).toBe(
        'mc-bse-match',
      );
    }));
  });

  describe('search query', () => {
    it('should filter holdings based on search query', fakeAsync(() => {
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [mockHolding, mockSellHolding],
      });
      createComponent();

      component.portfolioSearchQuery.set('tcs');
      tick();

      renderWithPortfolio();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('TCS');
    }));

    it('should hide all rows when search does not match', fakeAsync(() => {
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [mockHolding, mockSellHolding],
      });
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

      expect((component as any).portfolioSort$.getValue()).toEqual([
        'name',
        'asc',
      ]);
      expect((component as any).portfolioFilter$.getValue()).toBe(
        'day_gainers',
      );
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

      expect((component as any).portfolioSort$.getValue()).toEqual([
        'daily_profit_loss',
        'dsc',
      ]);
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
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.UP, percentage: 2, value: 2 },
          },
        },
      };
      const loser: Holding = {
        ...mockSellHolding,
        id: 'l1',
        name: 'Loser',
        scripCode: { isin: 'INE001L' },
        vendorCode: { etm: { primary: 'LOSER' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.DOWN, percentage: -2, value: -2 },
          },
        },
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

    it('should filter holdings by day losers filter', fakeAsync(() => {
      const gainer: Holding = {
        ...mockHolding,
        id: 'g2',
        name: 'Gainer2',
        scripCode: { isin: 'INE001G2' },
        vendorCode: { etm: { primary: 'GAINER2' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.UP, percentage: 2, value: 2 },
          },
        },
      };
      const loser: Holding = {
        ...mockSellHolding,
        id: 'l2',
        name: 'Loser2',
        scripCode: { isin: 'INE001L2' },
        vendorCode: { etm: { primary: 'LOSER2' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.DOWN, percentage: -2, value: -2 },
          },
        },
      };
      portfolioSubject.next({ ...mockPortfolio, holdings: [gainer, loser] });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('day_losers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Loser2');
    }));

    it('should filter holdings by overall gainers filter', fakeAsync(() => {
      const upHolding: Holding = {
        ...mockHolding,
        id: 'og1',
        name: 'Overall Gainer',
        scripCode: { isin: 'INE001OG' },
        vendorCode: { etm: { primary: 'OGAINER' } },
        totalProfitLoss: {
          direction: Direction.UP,
          percentage: 10,
          value: 100,
        },
      };
      const downHolding: Holding = {
        ...mockHolding,
        id: 'ol1',
        name: 'Overall Loser',
        scripCode: { isin: 'INE001OL' },
        vendorCode: { etm: { primary: 'OLOSER' } },
        totalProfitLoss: {
          direction: Direction.DOWN,
          percentage: -5,
          value: -50,
        },
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [upHolding, downHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('overall_gainers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Overall Gainer');
    }));

    it('should filter holdings by overall losers filter', fakeAsync(() => {
      const upHolding: Holding = {
        ...mockHolding,
        id: 'og2',
        name: 'Gainer2',
        scripCode: { isin: 'INE001G2O' },
        vendorCode: { etm: { primary: 'OGAINER2' } },
        totalProfitLoss: {
          direction: Direction.UP,
          percentage: 10,
          value: 100,
        },
      };
      const downHolding: Holding = {
        ...mockHolding,
        id: 'ol2',
        name: 'Overall Loser2',
        scripCode: { isin: 'INE001OL2' },
        vendorCode: { etm: { primary: 'OLOSER2' } },
        totalProfitLoss: {
          direction: Direction.DOWN,
          percentage: -5,
          value: -50,
        },
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [upHolding, downHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('overall_losers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Overall Loser2');
    }));

    it('should filter out holdings with zero quantity', fakeAsync(() => {
      const zeroQtyHolding: Holding = {
        ...mockHolding,
        id: 'zq',
        name: 'Zero Qty',
        scripCode: { isin: 'INE001ZQ' },
        vendorCode: { etm: { primary: 'ZEROQTY' } },
        quantity: 0,
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [mockHolding, zeroQtyHolding],
      });
      createComponent();
      renderWithPortfolio();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Reliance');
    }));

    it('should filter out holdings with null/undefined quantity', fakeAsync(() => {
      const nullQtyHolding: Holding = {
        ...mockHolding,
        id: 'nq',
        name: 'Null Qty',
        scripCode: { isin: 'INE001NQ' },
        vendorCode: { etm: { primary: 'NULLQTY' } },
        quantity: undefined as unknown as number,
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [mockHolding, nullQtyHolding],
      });
      createComponent();
      renderWithPortfolio();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Reliance');
    }));

    it('should sort by daily profit loss descending', fakeAsync(() => {
      const highDaily: Holding = {
        ...mockHolding,
        id: 'hd',
        name: 'High Daily',
        scripCode: { isin: 'INE001HD' },
        vendorCode: { etm: { primary: 'HIGHDAILY' } },
        quote: {
          nse: {
            price: 200,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
          },
        },
      };
      const lowDaily: Holding = {
        ...mockSellHolding,
        id: 'ld',
        name: 'Low Daily',
        scripCode: { isin: 'INE001LD' },
        vendorCode: { etm: { primary: 'LOWDAILY' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.DOWN, percentage: -1, value: -1 },
          },
        },
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [lowDaily, highDaily],
      });
      createComponent();
      renderWithPortfolio();

      component.sortPortfolio('daily_profit_loss' as any, 'dsc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('High Daily');
      expect(rows[1].textContent).toContain('Low Daily');
    }));

    it('should sort by overall profit loss ascending and descending', fakeAsync(() => {
      const highOverall: Holding = {
        ...mockHolding,
        id: 'ho',
        name: 'High Overall',
        scripCode: { isin: 'INE001HO' },
        vendorCode: { etm: { primary: 'HIGHOVERALL' } },
        totalProfitLoss: {
          direction: Direction.UP,
          percentage: 20,
          value: 200,
        },
      };
      const lowOverall: Holding = {
        ...mockSellHolding,
        id: 'lo',
        name: 'Low Overall',
        scripCode: { isin: 'INE001LO' },
        vendorCode: { etm: { primary: 'LOWOVERALL' } },
        totalProfitLoss: { direction: Direction.UP, percentage: 5, value: 50 },
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [lowOverall, highOverall],
      });
      createComponent();
      renderWithPortfolio();

      component.sortPortfolio('overall_profit_loss' as any, 'asc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      let rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Low Overall');
      expect(rows[1].textContent).toContain('High Overall');

      component.sortPortfolio('overall_profit_loss' as any, 'dsc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('High Overall');
      expect(rows[1].textContent).toContain('Low Overall');
    }));

    it('should filter holdings with missing quote properties (no crash)', fakeAsync(() => {
      const noQuoteHolding: Holding = {
        ...mockHolding,
        id: 'nq2',
        name: 'No Quote',
        scripCode: { isin: 'INE001NQ2' },
        vendorCode: { etm: { primary: 'NOQUOTE' } },
        quote: { nse: { price: 100 } as any },
        totalProfitLoss: undefined as any,
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [noQuoteHolding, mockHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('day_gainers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Reliance');
    }));

    it('should filter day gainers when holding has no quote object', fakeAsync(() => {
      const noQuote: Holding = {
        ...mockHolding,
        id: 'nq3',
        name: 'No Quote Obj',
        scripCode: { isin: 'INE001NQ3' },
        vendorCode: { etm: { primary: 'NOQUOTE3' } },
        quote: undefined as any,
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [noQuote, mockHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('day_gainers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Reliance');
    }));

    it('should filter day losers when holding has quote but no nse', fakeAsync(() => {
      const noNse: Holding = {
        ...mockHolding,
        id: 'nonse',
        name: 'No NSE',
        scripCode: { isin: 'INE001NSE' },
        vendorCode: { etm: { primary: 'NONSE' } },
        quote: {} as any,
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [noNse, mockSellHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.filterPortfolio('day_losers' as any);
      tick();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('TCS');
    }));

    it('should sort by name ascending', fakeAsync(() => {
      const aHolding: Holding = { ...mockHolding, id: 'a1', name: 'A Infra' };
      const bHolding: Holding = {
        ...mockSellHolding,
        id: 'b1',
        name: 'B Corp',
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [bHolding, aHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.sortPortfolio('name' as any, 'asc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('A Infra');
      expect(rows[1].textContent).toContain('B Corp');
    }));

    it('should sort by name descending', fakeAsync(() => {
      const aHolding: Holding = { ...mockHolding, id: 'a2', name: 'A Infra' };
      const bHolding: Holding = {
        ...mockSellHolding,
        id: 'b2',
        name: 'B Corp',
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [aHolding, bHolding],
      });
      createComponent();
      renderWithPortfolio();

      component.sortPortfolio('name' as any, 'dsc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('B Corp');
      expect(rows[1].textContent).toContain('A Infra');
    }));

    it('should sort by daily profit loss ascending', fakeAsync(() => {
      const highDaily: Holding = {
        ...mockHolding,
        id: 'hdasc',
        name: 'High Daily',
        scripCode: { isin: 'INE001HDA' },
        vendorCode: { etm: { primary: 'HIGHDAILYA' } },
        quote: {
          nse: {
            price: 200,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
          },
        },
      };
      const lowDaily: Holding = {
        ...mockSellHolding,
        id: 'ldasc',
        name: 'Low Daily',
        scripCode: { isin: 'INE001LDA' },
        vendorCode: { etm: { primary: 'LOWDAILYA' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.DOWN, percentage: -1, value: -1 },
          },
        },
      };
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [highDaily, lowDaily],
      });
      createComponent();
      renderWithPortfolio();

      component.sortPortfolio('daily_profit_loss' as any, 'asc' as any);
      tick();
      tick(300);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Low Daily');
      expect(rows[1].textContent).toContain('High Daily');
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

    it('should not search when query equals selected stock name', fakeAsync(() => {
      createComponent();
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = { name: 'RELIANCE' };
      component.name.set('RELIANCE');

      fixture.detectChanges();
      tick();
      tick(600);
      fixture.detectChanges();

      expect(mockMarketService.search).not.toHaveBeenCalled();
    }));

    it('should search in portfolio holdings for sell transaction', fakeAsync(() => {
      portfolioSubject.next({
        ...mockPortfolio,
        holdings: [mockHolding, mockSellHolding],
      });
      createComponent();
      component.transactionType = TransactionType.SELL;
      component.name.set('tcs');

      fixture.detectChanges();
      tick();
      tick(600);
      fixture.detectChanges();

      expect(component.showSearchResults).toBe(true);
    }));

    it('should clear selectedStock when query changes', fakeAsync(() => {
      createComponent();
      component.transactionType = TransactionType.BUY;
      (component as any).selectedStock = { name: 'OLD' };
      component.name.set('NEW');

      fixture.detectChanges();
      tick();
      tick(600);
      fixture.detectChanges();

      expect((component as any).selectedStock).toBeUndefined();
    }));
  });

  describe('user interactions', () => {
    it('should open Sell drawer when Sell button is clicked', async () => {
      createComponent();
      fixture.detectChanges();
      const sellBtn = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b: HTMLButtonElement) => b.textContent.trim() === 'Sell');
      expect(sellBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(sellBtn!);
      fixture.detectChanges();
      expect(component.transactionType).toBe(TransactionType.SELL);
    });

    it('should open Buy drawer when Buy button is clicked', async () => {
      createComponent();
      fixture.detectChanges();
      const buyBtn = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b: HTMLButtonElement) => b.textContent.trim() === 'Buy');
      expect(buyBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(buyBtn!);
      fixture.detectChanges();
      expect(component.transactionType).toBe(TransactionType.BUY);
    });
  });
});
