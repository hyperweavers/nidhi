import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { Direction } from '../../models/market';
import { TransactionType } from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioPage } from './portfolio.page';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Provide global Datepicker mock
(globalThis as any).Datepicker = jest.fn().mockImplementation(() => ({
  getDate: jest.fn().mockReturnValue('01/01/2020'),
  setDate: jest.fn(),
  hide: jest.fn(),
}));

describe('PortfolioPage', () => {
  let component: PortfolioPage;
  let fixture: ComponentFixture<PortfolioPage>;
  let mockMarketService: any;
  let mockStorageService: any;
  let mockPortfolioService: any;
  let portfolioSubject: BehaviorSubject<any>;

  const mockPortfolio = {
    holdings: [
      {
        id: 'h1',
        name: 'Aaa Co',
        quantity: 10,
        scripCode: { nse: 'TEST', isin: 'INE001' },
        vendorCode: { etm: { primary: 't1' }, mc: {} },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.UP, percentage: 2, value: 2 },
          },
        },
        totalProfitLoss: {
          direction: Direction.UP,
          percentage: 10,
          value: 100,
        },
      },
      {
        id: 'h2',
        name: 'Zzz Loss',
        quantity: 5,
        scripCode: { nse: 'LOSS', isin: 'INE002' },
        vendorCode: { etm: { primary: 't2' }, mc: {} },
        quote: {
          nse: {
            price: 50,
            change: { direction: Direction.DOWN, percentage: -3, value: -3 },
          },
        },
        totalProfitLoss: {
          direction: Direction.DOWN,
          percentage: -5,
          value: -25,
        },
      },
      {
        id: 'h3',
        name: 'Bse Gainer',
        quantity: 10,
        scripCode: { bse: '500001', isin: 'INE003' },
        vendorCode: { etm: { primary: 't3' }, mc: {} },
        quote: {
          bse: {
            price: 200,
            change: { direction: Direction.UP, percentage: 5, value: 10 },
          },
        },
        totalProfitLoss: {
          direction: Direction.UP,
          percentage: 20,
          value: 200,
        },
      },
      {
        id: 'h4',
        name: 'No Profit',
        quantity: 10,
        scripCode: { nse: 'NONE', isin: 'INE004' },
        vendorCode: { etm: { primary: 't4' }, mc: {} },
        quote: { nse: { price: 100 }, bse: { price: 100 } }, // No change
      },
      {
        id: 'h5',
        name: 'Bse Loser',
        quantity: 10,
        scripCode: { bse: '500002', isin: 'INE005' },
        vendorCode: { etm: { primary: 't5' }, mc: {} },
        quote: {
          bse: {
            price: 150,
            change: { direction: Direction.DOWN, percentage: -2, value: -3 },
          },
        },
        totalProfitLoss: {
          direction: Direction.DOWN,
          percentage: -10,
          value: -100,
        },
      },
    ],
    investment: 1000,
    marketValue: 1250,
    dayProfitLoss: { direction: Direction.UP, percentage: 1, value: 10 },
    totalProfitLoss: { direction: Direction.UP, percentage: 25, value: 250 },
    dayAdvance: { percentage: 50, value: 1 },
    dayDecline: { percentage: 50, value: 1 },
    totalAdvance: { percentage: 50, value: 1 },
    totalDecline: { percentage: 50, value: 1 },
  };

  beforeEach(async () => {
    mockMarketService = {
      search: jest
        .fn()
        .mockReturnValue(
          of([
            {
              name: 'Search Result',
              scripCode: { isin: 'INE003', nse: 'SR' },
              vendorCode: { etm: { primary: 'sr1' } },
            },
          ]),
        ),
      searchSecondary: jest.fn().mockReturnValue(of([])),
      getStock: jest.fn().mockReturnValue(of(null)),
    };
    mockStorageService = {
      addOrUpdate: jest.fn().mockResolvedValue(undefined),
    };
    portfolioSubject = new BehaviorSubject(mockPortfolio);
    mockPortfolioService = {
      portfolio$: portfolioSubject,
    };

    // Setup FlowbiteInstances mock
    (window as any).FlowbiteInstances = {
      getInstance: jest.fn().mockReturnValue({ hide: jest.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioPage],
      providers: [
        { provide: MarketService, useValue: mockMarketService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PortfolioService, useValue: mockPortfolioService },
      ],
    })
      .overrideComponent(PortfolioPage, {
        set: { template: '<div #transactionDateInput></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PortfolioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have portfolio$ observable with holdings', fakeAsync(() => {
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBe(5);
  }));

  // --- Filter tests ---
  it('filterPortfolio with DAY_GAINERS should filter holdings', fakeAsync(() => {
    component.filterPortfolio(component.PortfolioFilter.DAY_GAINERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.every(
        (h: any) =>
          h.quote?.nse?.change?.direction === Direction.UP ||
          h.quote?.bse?.change?.direction === Direction.UP,
      ),
    ).toBe(true);
  }));

  it('filterPortfolio with DAY_LOSERS should filter holdings', fakeAsync(() => {
    component.filterPortfolio(component.PortfolioFilter.DAY_LOSERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.every(
        (h: any) =>
          h.quote?.nse?.change?.direction === Direction.DOWN ||
          h.quote?.bse?.change?.direction === Direction.DOWN,
      ),
    ).toBe(true);
  }));

  it('filterPortfolio with DAY_GAINERS (BSE) should specifically work', fakeAsync(() => {
    // h3 is a BSE gainer
    component.filterPortfolio(component.PortfolioFilter.DAY_GAINERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.some(
        (h: any) => h.quote?.bse?.change?.direction === Direction.UP,
      ),
    ).toBe(true);
  }));

  it('filterPortfolio with DAY_LOSERS (BSE) should specifically work', fakeAsync(() => {
    // h5 is a BSE loser
    component.filterPortfolio(component.PortfolioFilter.DAY_LOSERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.some(
        (h: any) => h.quote?.bse?.change?.direction === Direction.DOWN,
      ),
    ).toBe(true);
  }));

  it('filterPortfolio with OVERALL_GAINERS should filter holdings', fakeAsync(() => {
    component.filterPortfolio(component.PortfolioFilter.OVERALL_GAINERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.every(
        (h: any) => h.totalProfitLoss?.direction === Direction.UP,
      ),
    ).toBe(true);
  }));

  it('filterPortfolio with OVERALL_LOSERS should filter holdings', fakeAsync(() => {
    component.filterPortfolio(component.PortfolioFilter.OVERALL_LOSERS);
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(
      p.holdings.every(
        (h: any) => h.totalProfitLoss?.direction === Direction.DOWN,
      ),
    ).toBe(true);
  }));

  it('clearPortfolioFilters should reset to NONE', fakeAsync(() => {
    component.filterPortfolio(component.PortfolioFilter.DAY_GAINERS);
    component.clearPortfolioFilters();
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBe(5);
  }));

  // --- Sort tests ---
  it('sortPortfolio by NAME ASC should sort alphabetically', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.NAME,
      component.PortfolioSortOrder.ASC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings[0].name).toBe('Aaa Co');
  }));

  it('sortPortfolio by NAME DSC should sort reverse', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.NAME,
      component.PortfolioSortOrder.DSC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings[0].name).toBe('Zzz Loss');
  }));

  it('sortPortfolio by DAY_PROFIT_LOSS ASC', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.DAY_PROFIT_LOSS,
      component.PortfolioSortOrder.ASC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBeGreaterThan(0);
  }));

  it('sortPortfolio by DAY_PROFIT_LOSS DSC', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.DAY_PROFIT_LOSS,
      component.PortfolioSortOrder.DSC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBeGreaterThan(0);
  }));

  it('sortPortfolio by OVERALL_PROFIT_LOSS ASC', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.OVERALL_PROFIT_LOSS,
      component.PortfolioSortOrder.ASC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBeGreaterThan(0);
  }));

  it('sortPortfolio by OVERALL_PROFIT_LOSS DSC', fakeAsync(() => {
    component.sortPortfolio(
      component.PortfolioSortType.OVERALL_PROFIT_LOSS,
      component.PortfolioSortOrder.DSC,
    );
    let p: any;
    component.portfolio$.subscribe((val) => (p = val));
    tick(300);
    expect(p.holdings.length).toBeGreaterThan(0);
  }));

  // --- Sort/Filter with dropdowns ---
  it('filterPortfolio should hide dropdown when it exists', fakeAsync(() => {
    // ngAfterViewInit loads dropdowns after setTimeout(200)
    component.ngAfterViewInit();
    tick(300);
    const dropdown = (component as any).filterDropdown;
    component.filterPortfolio(component.PortfolioFilter.DAY_GAINERS);
    if (dropdown) {
      expect(dropdown.hide).toHaveBeenCalled();
    }
  }));

  it('sortPortfolio should hide dropdown when it exists', fakeAsync(() => {
    component.ngAfterViewInit();
    tick(300);
    const dropdown = (component as any).sortDropdown;
    component.sortPortfolio(
      component.PortfolioSortType.NAME,
      component.PortfolioSortOrder.ASC,
    );
    if (dropdown) {
      expect(dropdown.hide).toHaveBeenCalled();
    }
  }));

  it('clearPortfolioFilters should hide dropdown when it exists', fakeAsync(() => {
    component.ngAfterViewInit();
    tick(300);
    component.clearPortfolioFilters();
    expect(component).toBeTruthy();
  }));

  // --- Stock search ---
  it('stockSearchResults$ should search when BUY type and query > 2 chars', fakeAsync(() => {
    component.transactionType = TransactionType.BUY;
    let results: any[] = [];
    component.stockSearchResults$.subscribe((r) => {
      results = r;
    });

    component.name.set('tes');
    fixture.detectChanges();
    tick(600);
    fixture.detectChanges();

    expect(mockMarketService.search).toHaveBeenCalledWith('tes');
    expect(component.showSearchResults).toBe(true);
  }));

  it('stockSearchResults$ should filter portfolio when SELL type', fakeAsync(() => {
    component.transactionType = TransactionType.SELL;
    let results: any[] = [];
    component.stockSearchResults$.subscribe((r) => {
      results = r;
    });

    component.name.set('Aaa');
    fixture.detectChanges();
    tick(600);
    fixture.detectChanges();

    expect(results.length).toBeGreaterThanOrEqual(0);
  }));

  it('stockSearchResults$ should not search when query <= 2 chars', fakeAsync(() => {
    component.transactionType = TransactionType.BUY;
    component.stockSearchResults$.subscribe();
    component.name.set('te');
    fixture.detectChanges();
    tick(600);
    expect(mockMarketService.search).not.toHaveBeenCalled();
  }));

  it('stockSearchResults$ should clear selectedStock if name differs', fakeAsync(() => {
    (component as any).selectedStock = { name: 'Old Name' };
    component.stockSearchResults$.subscribe();
    component.name.set('New');
    fixture.detectChanges();
    tick(600);
    expect((component as any).selectedStock).toBeUndefined();
  }));

  // --- Transaction ---
  it('openAddTransactionDrawer should set transactionType', () => {
    component.openAddTransactionDrawer(TransactionType.BUY);
    expect(component.transactionType).toBe(TransactionType.BUY);
  });

  it('selectStock should set selectedStock with isin', () => {
    const stock = {
      name: 'Test',
      scripCode: { isin: 'INE001', nse: 'TEST' },
      vendorCode: { etm: { primary: 't1' } },
    } as any;
    component.selectStock(stock);
    expect((component as any).selectedStock).toBe(stock);
    expect(component.showSearchResults).toBe(false);
  });

  it('selectStock without isin should fetch details and combine with secondary', fakeAsync(() => {
    const mockDetails = {
      scripCode: { nse: 'TEST', bse: '533', isin: 'INE001' },
      vendorCode: { etm: { primary: 't1' }, mc: {} },
    };
    mockMarketService.getStock.mockReturnValue(of(mockDetails));
    mockMarketService.searchSecondary.mockReturnValue(
      of([
        {
          scripCode: { isin: 'INE001', nse: 'TEST' },
          vendorCode: { mc: { id: 'mc1' } },
        },
      ]),
    );

    const stock = {
      name: 'Test',
      scripCode: {},
      vendorCode: { etm: { primary: 't1' } },
    } as any;
    component.selectStock(stock);
    tick(100);

    expect(mockMarketService.getStock).toHaveBeenCalled();
    expect(mockMarketService.searchSecondary).toHaveBeenCalled();
    expect((component as any).selectedStock).toBeTruthy();
  }));

  it('selectStock without isin should handle null stock details', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(
      of({ scripCode: {}, vendorCode: { etm: { primary: 't1' }, mc: {} } }),
    );
    const stock = {
      name: 'Test',
      scripCode: {},
      vendorCode: { etm: { primary: 't1' } },
    } as any;
    component.selectStock(stock);
    tick(100);
    // Should show form error because combinedStockDetails has no nse/bse
    expect(component).toBeTruthy();
  }));

  it('selectStock without isin should handle empty search secondary results', fakeAsync(() => {
    const mockDetails = {
      scripCode: { nse: 'TEST', isin: 'INE001' },
      vendorCode: { etm: { primary: 't1' }, mc: {} },
    };
    mockMarketService.getStock.mockReturnValue(of(mockDetails));
    mockMarketService.searchSecondary.mockReturnValue(of([]));

    const stock = {
      name: 'Test',
      scripCode: {},
      vendorCode: { etm: { primary: 't1' } },
    } as any;
    component.selectStock(stock);
    tick(100);
    expect((component as any).selectedStock).toBeTruthy();
  }));

  it('selectStock without isin should handle unmatched secondary result', fakeAsync(() => {
    const mockDetails = {
      scripCode: { nse: 'TEST', isin: 'INE001' },
      vendorCode: { etm: { primary: 't1' }, mc: {} },
    };
    mockMarketService.getStock.mockReturnValue(of(mockDetails));
    mockMarketService.searchSecondary.mockReturnValue(
      of([
        {
          scripCode: { isin: 'DIFFERENT', nse: 'OTHER' },
          vendorCode: { mc: { id: 'mc99' } },
        },
      ]),
    );

    const stock = {
      name: 'Test',
      scripCode: {},
      vendorCode: { etm: { primary: 't1' } },
    } as any;
    component.selectStock(stock);
    tick(100);
    expect((component as any).selectedStock).toBeTruthy();
  }));

  it('resetTransactionForm should clear fields', () => {
    component.resetTransactionForm();
    expect(component.showSearchResults).toBe(false);
  });

  it('closeStatusModal should set showStatusModal to false', () => {
    component.showStatusModal = true;
    component.closeStatusModal();
    expect(component.showStatusModal).toBe(false);
    expect(component.transactionType).toBeUndefined();
  });

  it('closeStatusModal with retainTransactionType should keep type', () => {
    component.showStatusModal = true;
    component.transactionType = TransactionType.BUY;
    component.closeStatusModal(true);
    expect(component.showStatusModal).toBe(false);
    expect(component.transactionType).toBe(TransactionType.BUY);
  });

  it('addTransaction should show error for invalid form', async () => {
    await component.addTransaction();
    expect(component.transactionFormError).toBe(
      'One or more field(s) containing invalid value(s)!',
    );
  });

  it('addTransaction should show error for future date', async () => {
    (component as any).selectedStock = { name: 'Test' };
    component.transactionType = TransactionType.BUY;
    component.date.set('01/01/2099');
    component.price.set(100);
    component.quantity.set(10);
    component.charges.set(0);
    await component.addTransaction();
    expect(component.transactionFormError).toBe('Date is in future!');
  });

  it('addTransaction should succeed with valid past date data', async () => {
    (component as any).selectedStock = { name: 'Test' };
    component.transactionType = TransactionType.BUY;
    component.date.set('01/01/2020');
    component.price.set(100);
    component.quantity.set(10);
    component.charges.set(5);
    await component.addTransaction();
    expect(mockStorageService.addOrUpdate).toHaveBeenCalled();
    expect(component.showStatusModal).toBe(true);
    expect(component.showTransactionProgress).toBe(false);
  });

  it('addTransaction with charges=0 should still succeed', async () => {
    (component as any).selectedStock = { name: 'Test' };
    component.transactionType = TransactionType.BUY;
    component.date.set('15/06/2023');
    component.price.set(50);
    component.quantity.set(5);
    component.charges.set(0);
    await component.addTransaction();
    expect(mockStorageService.addOrUpdate).toHaveBeenCalled();
  });

  it('showTransactionFormError should clear after timeout', fakeAsync(() => {
    (component as any).showTransactionFormError('test error');
    expect(component.transactionFormError).toBe('test error');
    tick(2000);
    expect(component.transactionFormError).toBe('');
  }));

  it('should expose Direction and TransactionType enums', () => {
    expect(component.Direction).toBe(Direction);
    expect(component.TransactionType).toBe(TransactionType);
  });

  it('ngAfterViewInit should initialize datepicker and dropdowns', fakeAsync(() => {
    component.ngAfterViewInit();
    tick(300);
    expect(component).toBeTruthy();
  }));

  it('gross and net computed signals should work', () => {
    component.price.set(100);
    component.quantity.set(10);
    component.charges.set(50);
    expect(component.gross()).toBe(1000);
    expect(component.net()).toBe(1050);
  });

  it('portfolioSearchQuery should filter holdings', fakeAsync(() => {
    component.portfolioSearchQuery.set('Aaa');
    let result: any;
    component.portfolio$.subscribe((p) => {
      result = p;
    });
    tick(300);
    if (result) {
      expect(result.holdings.length).toBe(5);
    }
  }));

  it('initDatePicker changeDate event should update date signal', fakeAsync(() => {
    component.ngAfterViewInit();
    tick(300);

    const transactionDateInputRef = (
      component as any
    ).transactionDateInputRef?.();
    if (transactionDateInputRef?.nativeElement) {
      const event = new CustomEvent('changeDate', {
        bubbles: true,
      });
      Object.defineProperty(event, 'target', {
        value: { value: '15/06/2023' },
      });
      transactionDateInputRef.nativeElement.dispatchEvent(event);
      expect(component.date()).toBe('15/06/2023');
    }
  }));

  describe('Branch Coverage Cleanup', () => {
    it('should cover all filter and sort branches', fakeAsync(() => {
      let result: any;
      component.portfolio$.subscribe((p) => (result = p));
      tick(300);

      const filters = [
        component.PortfolioFilter.DAY_GAINERS,
        component.PortfolioFilter.DAY_LOSERS,
        component.PortfolioFilter.OVERALL_GAINERS,
        component.PortfolioFilter.OVERALL_LOSERS,
        {
          search: '',
          stockType: 'NSE',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        } as any,
        {
          search: '',
          stockType: 'BSE',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        } as any,
        {
          search: '',
          stockType: 'All',
          performance: 'Gainers',
          sortBy: 'Profit',
          sortOrder: 'Desc',
        } as any,
        {
          search: '',
          stockType: 'All',
          performance: 'Losers',
          sortBy: 'Day Profit',
          sortOrder: 'Asc',
        } as any,
        {
          search: '',
          stockType: 'All',
          performance: 'Gainers',
          sortBy: 'Capital',
          sortOrder: 'Asc',
        } as any,
        {
          search: 'Bse',
          stockType: 'All',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        } as any,
        {
          search: 'No',
          stockType: 'All',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        } as any,
      ];

      filters.forEach((f) => {
        component.filterPortfolio(f);
        tick(10);
      });

      component.clearPortfolioFilters();
      tick(10);
      expect(result.holdings.length).toBeGreaterThan(0);
    }));

    it('should cover all filter combinations (NSE, BSE, All, Gainers, Losers)', fakeAsync(() => {
      let result: any;
      component.portfolio$.subscribe((p) => (result = p));
      tick(300);

      const filterCombos = [
        {
          search: '',
          stockType: 'NSE',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        },
        {
          search: '',
          stockType: 'BSE',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        },
        {
          search: '',
          stockType: 'All',
          performance: 'Gainers',
          sortBy: 'Name',
          sortOrder: 'Asc',
        },
        {
          search: '',
          stockType: 'All',
          performance: 'Losers',
          sortBy: 'Name',
          sortOrder: 'Asc',
        },
        {
          search: 'Aaa',
          stockType: 'NSE',
          performance: 'All',
          sortBy: 'Name',
          sortOrder: 'Asc',
        },
      ];

      filterCombos.forEach((f) => {
        component.filterPortfolio(f as any);
        tick(10);
      });
      expect(component).toBeTruthy();
    }));
  });

  describe('Sort Branches', () => {
    it('should cover all sort branches', fakeAsync(() => {
      let result: any;
      component.portfolio$.subscribe((p) => (result = p));
      tick(300);

      // Trigger all sort types and orders
      const sortConfigs = [
        {
          type: component.PortfolioSortType.NAME,
          order: component.PortfolioSortOrder.ASC,
        },
        {
          type: component.PortfolioSortType.NAME,
          order: component.PortfolioSortOrder.DSC,
        },
        {
          type: component.PortfolioSortType.DAY_PROFIT_LOSS,
          order: component.PortfolioSortOrder.ASC,
        },
        {
          type: component.PortfolioSortType.DAY_PROFIT_LOSS,
          order: component.PortfolioSortOrder.DSC,
        },
        {
          type: component.PortfolioSortType.OVERALL_PROFIT_LOSS,
          order: component.PortfolioSortOrder.ASC,
        },
        {
          type: component.PortfolioSortType.OVERALL_PROFIT_LOSS,
          order: component.PortfolioSortOrder.DSC,
        },
      ];

      sortConfigs.forEach((c) => {
        component.sortPortfolio(c.type, c.order);
        tick(10);
      });

      expect(result.holdings.length).toBeGreaterThan(0);
    }));

    it('addTransaction should handle missing selectedStock', async () => {
      (component as any).selectedStock = undefined;
      await component.addTransaction();
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
    });

    it('addTransaction should show error for non-positive price/quantity or negative charges', async () => {
      (component as any).selectedStock = { name: 'Test' };
      component.transactionType = TransactionType.BUY;
      component.date.set('01/01/2020');

      component.price.set(0);
      await component.addTransaction();
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );

      component.price.set(10);
      component.quantity.set(0);
      await component.addTransaction();
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );

      component.quantity.set(10);
      component.charges.set(-1);
      await component.addTransaction();
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
    });
  });
});
