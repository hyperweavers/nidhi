import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject, of } from 'rxjs';

import { Direction } from '../../models/market';
import {
  Holding,
  TransactionEditContext,
  TransactionType,
} from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import {
  TransactionItem,
  TransactionSortType,
  TransactionsPage,
} from './transactions.page';

@Component({
  selector: 'app-transaction-drawer',
  template: '',
  standalone: true,
})
class MockTransactionDrawerComponent {
  @Input() mode!: string;
  @Input() editContext?: TransactionEditContext;
  @Input() drawerId!: string;
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}

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
      type: TransactionType.SELL,
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

describe('TransactionsPage', () => {
  let component: TransactionsPage;
  let fixture: ComponentFixture<TransactionsPage>;
  let stocksSubject: BehaviorSubject<Holding[]>;
  let mockMarketService: jest.Mocked<Partial<MarketService>>;
  let mockStorageService: jest.Mocked<Partial<StorageService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;

  const loggerStub = () => ({
    captureException: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  });

  const marketServiceStub = () => mockMarketService;
  const storageServiceStub = () => mockStorageService;
  const routerStub = () => mockRouter;

  function createComponent(): void {
    fixture = TestBed.createComponent(TransactionsPage);
    component = fixture.componentInstance;
  }

  function detectChangesAndTick(): void {
    fixture.detectChanges();
    tick();
    tick(300);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    stocksSubject = new BehaviorSubject<Holding[]>([mockHolding]);

    mockMarketService = {
      search: jest.fn().mockReturnValue(of([])),
      getStocks: jest.fn().mockReturnValue(of([])),
      getStock: jest.fn().mockReturnValue(of(null)),
      searchSecondary: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<Partial<MarketService>>;

    mockStorageService = {
      stocks$: stocksSubject.asObservable(),
      deleteTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Partial<StorageService>>;

    mockRouter = {
      navigate: jest.fn(),
    };

    (window as any).FlowbiteInstances = {
      getInstance: jest.fn().mockReturnValue({ hide: jest.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionsPage, MockTransactionDrawerComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOGGER, useFactory: loggerStub },
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
      detectChangesAndTick();
      expect(component).toBeTruthy();
    }));
  });

  describe('transactions rendering', () => {
    it('should render transactions list', fakeAsync(() => {
      createComponent();
      detectChangesAndTick();

      const viewport = fixture.nativeElement.querySelector(
        'cdk-virtual-scroll-viewport',
      );
      expect(viewport).toBeTruthy();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].stockName).toBe('Reliance Industries');
      });
    }));

    it('should show empty state when no transactions', fakeAsync(() => {
      stocksSubject.next([]);
      createComponent();
      detectChangesAndTick();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl.textContent).toContain('No transactions found!');
    }));

    it('should handle empty holdings gracefully', fakeAsync(() => {
      stocksSubject.next([]);
      createComponent();
      detectChangesAndTick();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl).toBeTruthy();
      expect(statusEl.textContent).toContain('No transactions found!');
      expect(component.transactions$).toBeDefined();
    }));
  });

  describe('filter', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should filter by buy', () => {
      component.filterTransactions('buy' as any);
      expect((component as any).filter$.getValue()).toBe('buy');
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should filter by sell', () => {
      component.filterTransactions('sell' as any);
      expect((component as any).filter$.getValue()).toBe('sell');
      expect(mockRouter.navigate).toHaveBeenCalled();
    });

    it('should clear filter', () => {
      component.filterTransactions('buy' as any);
      component.clearFilter();
      expect((component as any).filter$.getValue()).toBe('all');
      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    });

    it('should hide filter dropdown when filtering', () => {
      const hideMock = jest.fn();
      (component as any).filterDropdown = { hide: hideMock };
      component.filterTransactions('buy' as any);
      expect(hideMock).toHaveBeenCalled();
    });

    it('should hide filter dropdown when clearing filter', () => {
      const hideMock = jest.fn();
      (component as any).filterDropdown = { hide: hideMock };
      component.clearFilter();
      expect(hideMock).toHaveBeenCalled();
    });

    it('should handle null filterDropdown on filterTransactions', () => {
      (component as any).filterDropdown = undefined;
      expect(() => component.filterTransactions('buy' as any)).not.toThrow();
    });

    it('should handle null filterDropdown on clearFilter', () => {
      (component as any).filterDropdown = undefined;
      expect(() => component.clearFilter()).not.toThrow();
    });
  });

  describe('sort', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should sort by stock name ascending', () => {
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect((component as any).sort$.getValue()).toEqual(['name', 'asc']);
    });

    it('should sort by stock name descending', () => {
      component.sortTransactions(TransactionSortType.NAME, 'dsc' as any);
      expect((component as any).sort$.getValue()).toEqual(['name', 'dsc']);
    });

    it('should sort by date ascending', () => {
      component.sortTransactions(TransactionSortType.DATE, 'asc' as any);
      expect((component as any).sort$.getValue()).toEqual(['date', 'asc']);
    });

    it('should sort by date descending', () => {
      component.sortTransactions(TransactionSortType.DATE, 'dsc' as any);
      expect((component as any).sort$.getValue()).toEqual(['date', 'dsc']);
    });

    it('should hide sort dropdown when sorting', () => {
      const hideMock = jest.fn();
      (component as any).sortDropdown = { hide: hideMock };
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect(hideMock).toHaveBeenCalled();
    });

    it('should handle null sortDropdown on sortTransactions', () => {
      (component as any).sortDropdown = undefined;
      expect(() =>
        component.sortTransactions(TransactionSortType.NAME, 'asc' as any),
      ).not.toThrow();
    });

    it('should sync query params on sort', () => {
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { sortType: 'name', sortOrder: 'asc' },
        }),
      );
    });
  });

  describe('search', () => {
    it('should filter and sort by search query', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.searchQuery.set('tcs');
      tick(300);
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].stockName).toBe('TCS');
      });
    }));

    it('should show empty state when search does not match', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.searchQuery.set('nonexistent');
      fixture.detectChanges();
      tick(300);
      fixture.detectChanges();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl.textContent).toContain('No transactions found!');
    }));
  });

  describe('edit drawer', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should open edit drawer with correct context', () => {
      const item: TransactionItem = {
        transactionId: 't1',
        holdingId: 'h1',
        stockName: 'Test Stock',
        type: TransactionType.BUY,
        date: 1700000000000,
        quantity: 10,
        price: 2000,
        charges: 50,
      };

      component.openEditDrawer(item);

      expect(component.editDrawerOpen()).toBe(true);
      expect(component.editContext()).toEqual({
        transaction: {
          id: 't1',
          type: TransactionType.BUY,
          date: 1700000000000,
          quantity: 10,
          price: 2000,
          charges: 50,
        },
        holdingId: 'h1',
        holdingName: 'Test Stock',
      });
    });

    it('should close edit drawer on edit saved', () => {
      component.editDrawerOpen.set(true);
      component.editContext.set({
        transaction: {
          id: 't1',
          type: TransactionType.BUY,
          date: 1700000000000,
          quantity: 10,
          price: 2000,
        },
        holdingId: 'h1',
        holdingName: 'Test',
      });

      component.onEditSaved();

      expect(component.editDrawerOpen()).toBe(false);
      expect(component.editContext()).toBeUndefined();
    });

    it('should close edit drawer on edit closed', () => {
      component.editDrawerOpen.set(true);
      component.editContext.set({
        transaction: {
          id: 't1',
          type: TransactionType.BUY,
          date: 1700000000000,
          quantity: 10,
          price: 2000,
        },
        holdingId: 'h1',
        holdingName: 'Test',
      });

      component.onEditClosed();

      expect(component.editDrawerOpen()).toBe(false);
      expect(component.editContext()).toBeUndefined();
    });
  });

  describe('delete confirmation', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should open delete confirmation', () => {
      component.openDeleteConfirmation('h1', 't1');
      expect(component.showDeleteModal).toBe(true);
      expect(component.deleteTarget).toEqual({
        holdingId: 'h1',
        transactionId: 't1',
      });
    });

    it('should confirm delete', fakeAsync(() => {
      component.openDeleteConfirmation('h1', 't1');
      component.confirmDelete();
      tick();

      expect(mockStorageService.deleteTransaction).toHaveBeenCalledWith(
        'h1',
        't1',
      );
      expect(component.showDeleteModal).toBe(false);
      expect(component.deleteTarget).toBeUndefined();
    }));

    it('should cancel delete', () => {
      component.openDeleteConfirmation('h1', 't1');
      component.cancelDelete();
      expect(component.showDeleteModal).toBe(false);
      expect(component.deleteTarget).toBeUndefined();
    });

    it('should not call deleteTransaction when deleteTarget is null', fakeAsync(() => {
      component.confirmDelete();
      tick();
      expect(mockStorageService.deleteTransaction).not.toHaveBeenCalled();
    }));
  });

  describe('query param restoration', () => {
    it('should restore sort, filter, and search from query params', fakeAsync(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [TransactionsPage, MockTransactionDrawerComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: StorageService, useFactory: storageServiceStub },
          { provide: MarketService, useFactory: marketServiceStub },
          { provide: Router, useFactory: routerStub },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                queryParamMap: {
                  get: jest.fn((key: string) => {
                    if (key === 'sortType') return 'name';
                    if (key === 'sortOrder') return 'asc';
                    if (key === 'filter') return 'buy';
                    if (key === 'search') return 'reliance';
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

      expect((component as any).sort$.getValue()).toEqual(['name', 'asc']);
      expect((component as any).filter$.getValue()).toBe('buy');
      expect(component.searchQuery()).toBe('reliance');
    }));

    it('should ignore invalid query param values', fakeAsync(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [TransactionsPage, MockTransactionDrawerComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: StorageService, useFactory: storageServiceStub },
          { provide: MarketService, useFactory: marketServiceStub },
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

      expect((component as any).sort$.getValue()).toEqual(['date', 'dsc']);
      expect((component as any).filter$.getValue()).toBe('all');
      expect(component.searchQuery()).toBe('');
    }));
  });

  describe('query param sync', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should sync query params on sort', () => {
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { sortType: 'name', sortOrder: 'asc' },
        }),
      );
    });

    it('should sync query params on filter', () => {
      component.filterTransactions('buy' as any);
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { filter: 'buy' },
        }),
      );
    });
  });

  describe('clear filters and sort', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      detectChangesAndTick();
    }));

    it('should clear filters and sort when non-default', () => {
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);

      component.clearFiltersAndSort();
      expect((component as any).sort$.getValue()).toEqual(['date', 'dsc']);
      expect((component as any).filter$.getValue()).toBe('all');
      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    });

    it('should not reset anything when already default', () => {
      component.clearFiltersAndSort();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should hide both dropdowns on clearFiltersAndSort when non-default', () => {
      const hideSort = jest.fn();
      const hideFilter = jest.fn();
      (component as any).sortDropdown = { hide: hideSort };
      (component as any).filterDropdown = { hide: hideFilter };
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      component.clearFiltersAndSort();
      expect(hideSort).toHaveBeenCalledTimes(2);
      expect(hideFilter).toHaveBeenCalledTimes(1);
    });

    it('should handle null dropdowns on clearFiltersAndSort when non-default', () => {
      (component as any).sortDropdown = undefined;
      (component as any).filterDropdown = undefined;
      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      expect(() => component.clearFiltersAndSort()).not.toThrow();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(2023, 0, 15);
      expect(component.formatDate(date.getTime())).toBe('15/01/2023');
    });

    it('should pad single digit day and month', () => {
      const date = new Date(2023, 2, 5);
      expect(component.formatDate(date.getTime())).toBe('05/03/2023');
    });
  });

  describe('transactions$ pipeline', () => {
    it('should filter by buy type', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.filterTransactions('buy' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].stockName).toBe('Reliance Industries');
        expect(items[0].type).toBe(TransactionType.BUY);
      });
    }));

    it('should filter by sell type', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.filterTransactions('sell' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].stockName).toBe('TCS');
        expect(items[0].type).toBe(TransactionType.SELL);
      });
    }));

    it('should sort by stock name ascending', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.sortTransactions(TransactionSortType.NAME, 'asc' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(2);
        expect(items[0].stockName).toBe('Reliance Industries');
        expect(items[1].stockName).toBe('TCS');
      });
    }));

    it('should sort by stock name descending', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.sortTransactions(TransactionSortType.NAME, 'dsc' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(2);
        expect(items[0].stockName).toBe('TCS');
        expect(items[1].stockName).toBe('Reliance Industries');
      });
    }));

    it('should sort by date ascending', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.sortTransactions(TransactionSortType.DATE, 'asc' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(2);
        expect(items[0].stockName).toBe('TCS');
        expect(items[1].stockName).toBe('Reliance Industries');
      });
    }));

    it('should sort by date descending', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.sortTransactions(TransactionSortType.DATE, 'dsc' as any);
      tick();
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(2);
        expect(items[0].stockName).toBe('Reliance Industries');
        expect(items[1].stockName).toBe('TCS');
      });
    }));

    it('should filter by search query', fakeAsync(() => {
      stocksSubject.next([mockHolding, mockSellHolding]);
      createComponent();
      detectChangesAndTick();

      component.searchQuery.set('reliance');
      tick(300);
      fixture.detectChanges();

      component.transactions$.subscribe((items) => {
        expect(items.length).toBe(1);
        expect(items[0].stockName).toBe('Reliance Industries');
      });
    }));
  });

  describe('edit drawer in template', () => {
    it('should keep drawer hidden when closed', fakeAsync(() => {
      createComponent();
      detectChangesAndTick();

      const drawerPanel = fixture.nativeElement.querySelector(
        '#edit-transaction-drawer',
      ) as HTMLElement;
      expect(drawerPanel).toBeTruthy();
      expect(drawerPanel.getAttribute('aria-hidden')).toBe('true');
      expect(drawerPanel.classList.contains('translate-x-full')).toBe(true);
    }));

    it('should render drawer when open', fakeAsync(() => {
      createComponent();
      detectChangesAndTick();

      component.editDrawerOpen.set(true);
      component.editContext.set({
        transaction: {
          id: 't1',
          type: TransactionType.BUY,
          date: 1700000000000,
          quantity: 10,
          price: 2000,
        },
        holdingId: 'h1',
        holdingName: 'Test',
      });
      fixture.detectChanges();

      const drawer = fixture.nativeElement.querySelector(
        'app-transaction-drawer',
      );
      expect(drawer).toBeTruthy();
    }));
  });

  describe('delete modal', () => {
    it('should show delete modal when showDeleteModal is true', fakeAsync(() => {
      createComponent();
      detectChangesAndTick();

      component.openDeleteConfirmation('h1', 't1');
      fixture.detectChanges();

      const deleteButton = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b: HTMLButtonElement) => b.textContent.includes("Yes, I'm sure"));
      expect(deleteButton).toBeTruthy();

      const cancelButton = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b: HTMLButtonElement) => b.textContent.includes('No, cancel'));
      expect(cancelButton).toBeTruthy();
    }));
  });

  describe('loading spinner', () => {
    it('should show loading spinner when transactions$ has not emitted', fakeAsync(() => {
      const delayedSubject = new BehaviorSubject<Holding[]>([]);
      const delayedStorage = {
        stocks$: delayedSubject,
      } as unknown as jest.Mocked<Partial<StorageService>>;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [TransactionsPage, MockTransactionDrawerComponent],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: LOGGER, useFactory: loggerStub },
          { provide: MarketService, useFactory: marketServiceStub },
          { provide: StorageService, useValue: delayedStorage },
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
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[role="status"]');
      expect(spinner.textContent).toContain('Loading');
    }));
  });
});
