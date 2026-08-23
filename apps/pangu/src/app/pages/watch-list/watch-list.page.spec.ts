import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ToastService } from '@nidhi/shared-toast';
import { Constants } from '../../constants';
import { Direction, ExchangeName } from '../../models/market';
import { Stock } from '../../models/stock';
import { WatchList, WatchListStock } from '../../models/watch-list';
import { MarketService } from '../../services/core/market.service';
import { WatchListService } from '../../services/watch-list.service';
import { WatchListPage } from './watch-list.page';

const mockWatchList: WatchList = {
  id: 'wl-1',
  name: 'My List',
  isDefault: true,
};

const mockWatchListStocks: WatchListStock[] = [
  {
    id: 1,
    watchListId: 'wl-1',
    scripCode: { nse: 'RELIANCE', bse: '500325', isin: 'INE002A01018' } as any,
    vendorCode: { etm: { primary: 'comp-123', chart: 'RELIANCE' } } as any,
  },
  {
    id: 2,
    watchListId: 'wl-1',
    scripCode: { nse: 'TCS', bse: '', isin: 'INE467B01029' } as any,
    vendorCode: { etm: { primary: 'comp-456', chart: 'TCS' } } as any,
  },
];

const mockLiveStocks: Stock[] = [
  {
    name: 'Reliance Industries',
    scripCode: { nse: 'RELIANCE', bse: '500325', isin: 'INE002A01018' } as any,
    vendorCode: { etm: { primary: 'comp-123', chart: 'RELIANCE' } } as any,
    quote: {
      nse: {
        price: 2500,
        change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
        volume: 5000000,
      },
    },
  } as Stock,
  {
    name: 'TCS',
    scripCode: { nse: 'TCS', bse: '', isin: 'INE467B01029' } as any,
    vendorCode: { etm: { primary: 'comp-456', chart: 'TCS' } } as any,
    quote: {
      nse: {
        price: 3500,
        change: { direction: Direction.DOWN, percentage: -0.5, value: -17.5 },
        volume: 2000000,
      },
    },
  } as Stock,
];

describe('WatchListPage', () => {
  let component: WatchListPage;
  let fixture: ComponentFixture<WatchListPage>;
  let watchListService: jest.Mocked<WatchListService>;
  let marketService: jest.Mocked<MarketService>;
  let toastService: jest.Mocked<ToastService>;
  let router: Router;
  let watchListSubject: BehaviorSubject<WatchList | undefined>;
  let watchListStocksSubject: BehaviorSubject<WatchListStock[]>;

  beforeEach(async () => {
    watchListSubject = new BehaviorSubject<WatchList | undefined>(
      mockWatchList,
    );
    watchListStocksSubject = new BehaviorSubject<WatchListStock[]>(
      mockWatchListStocks,
    );

    watchListService = {
      watchLists$: of([mockWatchList]),
      getWatchList$: jest.fn().mockReturnValue(watchListSubject.asObservable()),
      getWatchListStocks$: jest
        .fn()
        .mockReturnValue(watchListStocksSubject.asObservable()),
      ensureDefaultWatchList: jest.fn(),
      createWatchList: jest.fn(),
      renameWatchList: jest.fn(),
      deleteWatchList: jest.fn(),
      setDefaultWatchList: jest.fn(),
      addStock: jest.fn().mockResolvedValue(undefined),
      addStockToMultipleLists: jest.fn(),
      removeStock: jest.fn().mockResolvedValue(undefined),
      moveStock: jest.fn().mockResolvedValue(undefined),
      getListsWithoutStock: jest.fn().mockResolvedValue([]),
    } as any;

    marketService = {
      getStocks: jest.fn().mockReturnValue(of(mockLiveStocks)),
      getStock: jest.fn().mockReturnValue(of(mockLiveStocks[0])),
      search: jest.fn().mockReturnValue(of(mockLiveStocks)),
      marketStatus$: of({ status: 'open' }),
      refresh: jest.fn(),
    } as any;

    toastService = {
      show: jest.fn(),
      toasts: jest.fn().mockReturnValue([]),
      dismiss: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [WatchListPage],
      providers: [
        provideRouter([]),
        { provide: WatchListService, useValue: watchListService },
        { provide: MarketService, useValue: marketService },
        { provide: ToastService, useValue: toastService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: new Map() },
            queryParamMap: of(new Map()),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WatchListPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'wl-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clears state when no watch list id is set', fakeAsync(() => {
    fixture.componentRef.setInput('id', '');
    fixture.detectChanges();
    tick();

    expect(component.watchList()).toBeUndefined();
    expect(component.stocks()).toEqual([]);
  }));

  it('hides drawer search results when clicking outside', () => {
    component.openStockSearchDrawer();
    fixture.detectChanges();

    expect(component.showStockSearchResults()).toBe(true);

    const companyInput = document.getElementById('stock-search-drawer');

    component.onDocumentClick({
      target: companyInput,
    } as unknown as MouseEvent);
    expect(component.showStockSearchResults()).toBe(true);

    component.onDocumentClick({
      target: document.body,
    } as unknown as MouseEvent);
    expect(component.showStockSearchResults()).toBe(false);
  });

  it('ignores outside clicks when drawer search results are hidden', () => {
    component.showStockSearchResults.set(false);

    component.onDocumentClick({
      target: document.body,
    } as unknown as MouseEvent);

    expect(component.showStockSearchResults()).toBe(false);
  });

  it('ignores outside clicks when the search box reference is unavailable', () => {
    jest.spyOn(component as any, 'stockSearchBox').mockReturnValue(undefined);

    component.onDocumentClick({
      target: document.body,
    } as unknown as MouseEvent);

    expect(component.showStockSearchResults()).toBe(true);
  });

  it('should show loading state initially', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('[role="status"]'));
    expect(spinner).toBeTruthy();
  });

  it('should load watch list and display stocks', fakeAsync(() => {
    component.loading.set(false);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
  }));

  it('should show empty state when no stocks', fakeAsync(() => {
    watchListStocksSubject.next([]);
    tick();
    fixture.detectChanges();
    const empty = fixture.debugElement.query(By.css('[role="status"]'));
    expect(empty).toBeTruthy();
  }));

  it('should toggle edit mode', () => {
    expect(component.editMode()).toBe(false);
    component.toggleEditMode();
    expect(component.editMode()).toBe(true);
    component.toggleEditMode();
    expect(component.editMode()).toBe(false);
  });

  it('should open and close stock search drawer', () => {
    component.openStockSearchDrawer();
    expect(component.showStockSearchDrawer()).toBe(true);
    component.closeStockSearchDrawer();
    expect(component.showStockSearchDrawer()).toBe(false);
  });

  it('should add stock from search', fakeAsync(async () => {
    component.id = () => 'wl-1';
    component.toggleDrawerStock(mockLiveStocks[0]);
    await component.addSelectedFromDrawer();
    tick();
    expect(watchListService.addStock).toHaveBeenCalledWith(
      'wl-1',
      mockLiveStocks[0].scripCode,
      mockLiveStocks[0].vendorCode,
    );
  }));

  it('should show toast after adding stock from drawer', fakeAsync(async () => {
    component.id = () => 'wl-1';
    component.toggleDrawerStock(mockLiveStocks[0]);
    await component.addSelectedFromDrawer();
    tick();
    expect(toastService.show).toHaveBeenCalledWith(
      'Stocks added to watch list!',
    );
  }));

  it('should not add stock if no list id', () => {
    component.id = () => '';
    component.toggleDrawerStock(mockLiveStocks[0]);
    component.addSelectedFromDrawer();
    expect(watchListService.addStock).not.toHaveBeenCalled();
  });

  it('should open move modal', fakeAsync(() => {
    watchListService.getListsWithoutStock.mockResolvedValue([
      { id: 'wl-2', name: 'Target', isDefault: false },
    ]);
    component.openMoveModal(mockWatchListStocks[0]);
    tick();
    expect(component.showMoveModal()).toBe(true);
    expect(component.availableListsForMove().length).toBe(1);
    expect(component.availableListsForMove()[0].id).toBe('wl-2');
  }));

  it('should close move modal', () => {
    component.showMoveModal.set(true);
    component.moveStockTarget.set(mockWatchListStocks[0]);
    component.selectedMoveList.set('wl-2');
    component.closeMoveModal();
    expect(component.showMoveModal()).toBe(false);
    expect(component.moveStockTarget()).toBeUndefined();
    expect(component.selectedMoveList()).toBe('');
  });

  it('should confirm move', fakeAsync(async () => {
    component.id = () => 'wl-1';
    component.moveStockTarget.set(mockWatchListStocks[0]);
    component.selectedMoveList.set('wl-2');
    await component.confirmMove();
    expect(watchListService.moveStock).toHaveBeenCalledWith(
      'wl-1',
      'wl-2',
      mockWatchListStocks[0].scripCode,
      mockWatchListStocks[0].vendorCode,
    );
    expect(toastService.show).toHaveBeenCalledWith('Stock moved successfully!');
  }));

  it('should not confirm move without target or list', fakeAsync(async () => {
    await component.confirmMove();
    expect(watchListService.moveStock).not.toHaveBeenCalled();
  }));

  it('should show error toast on move failure', fakeAsync(async () => {
    watchListService.moveStock.mockRejectedValue(new Error('Move failed'));
    component.id = () => 'wl-1';
    component.moveStockTarget.set(mockWatchListStocks[0]);
    component.selectedMoveList.set('wl-2');
    await component.confirmMove();
    expect(toastService.show).toHaveBeenCalledWith('Move failed', 'error');
  }));

  it('should open delete confirm', () => {
    component.openDeleteConfirm(mockWatchListStocks[0]);
    expect(component.showDeleteConfirm()).toBe(true);
    expect(component.deleteStockTarget()).toBe(mockWatchListStocks[0]);
  });

  it('should close delete confirm', () => {
    component.showDeleteConfirm.set(true);
    component.deleteStockTarget.set(mockWatchListStocks[0]);
    component.closeDeleteConfirm();
    expect(component.showDeleteConfirm()).toBe(false);
    expect(component.deleteStockTarget()).toBeUndefined();
  });

  it('should confirm delete', fakeAsync(async () => {
    component.id = () => 'wl-1';
    component.deleteStockTarget.set(mockWatchListStocks[0]);
    await component.confirmDelete();
    expect(watchListService.removeStock).toHaveBeenCalledWith(
      'wl-1',
      'INE002A01018',
    );
    expect(toastService.show).toHaveBeenCalledWith(
      'Stock removed from watch list!',
    );
  }));

  it('should not confirm delete without target', fakeAsync(async () => {
    await component.confirmDelete();
    expect(watchListService.removeStock).not.toHaveBeenCalled();
  }));

  it('should navigate to watch lists management', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.navigateToWatchLists();
    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      Constants.routes.WATCH_LIST,
    ]);
  });

  it('should get exchange name from scrip code', () => {
    const stock = {
      scripCode: { nse: 'RELIANCE', bse: '500325' },
    } as WatchListStock;
    expect(component.getExchange(stock)).toBe(ExchangeName.NSE);
    const bseStock = {
      scripCode: { nse: undefined, bse: '500325' },
    } as WatchListStock;
    expect(component.getExchange(bseStock)).toBe(ExchangeName.BSE);
    const noCode = { scripCode: {} } as WatchListStock;
    expect(component.getExchange(noCode)).toBe('');
  });

  it('should handle sort and filter', () => {
    const stockData = mockWatchListStocks.map((s) => ({
      ...s,
      liveData: mockLiveStocks.find(
        (l) => l.scripCode?.nse === s.scripCode?.nse,
      ),
    }));
    component.stocks.set(stockData);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    component.searchQuery.set('Reliance');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(1);
  });

  it('should set filter', () => {
    component.setFilter(component.WatchListFilter.GAINERS);
    expect(component['filter']()).toBe('gainers');
  });

  it('should clear filters and sort when changed', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.sortType.set('price');
    component.sortOrder.set('desc');
    component.filter.set('gainers');
    component.searchQuery.set('test');
    component.clearFiltersAndSort();
    expect(component.sortType()).toBe('name');
    expect(component.sortOrder()).toBe('asc');
    expect(component.filter()).toBe('none');
    expect(component.searchQuery()).toBe('');
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should handle header watch list selection', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.onHeaderWatchListSelected(mockWatchList);
    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      Constants.routes.WATCH_LIST,
      'wl-1',
    ]);
  });

  it('should ignore array in header watch list selection', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.onHeaderWatchListSelected([mockWatchList]);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should handle move list selection', () => {
    component.onMoveListSelected(mockWatchList);
    expect(component.selectedMoveList()).toBe('wl-1');
    component.onMoveListSelected([mockWatchList]);
    expect(component.selectedMoveList()).toBe('wl-1');
  });

  it('should restore query params', () => {
    (component as any).restoreFromQueryParams();
    expect(component.sortType()).toBe('name');
  });

  it('should sort and sync query params', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.sort('change_percentage', 'asc');
    expect(component.sortType()).toBe('change_percentage');
    expect(component.sortOrder()).toBe('asc');
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should call ngAfterViewInit', fakeAsync(() => {
    const spy = jest.spyOn(component as any, 'initFlowbiteInstances');
    component.ngAfterViewInit();
    tick(300);
    expect(spy).toHaveBeenCalled();
  }));

  it('should remove drawer stock via toggleDrawerStock', () => {
    component.toggleDrawerStock(mockLiveStocks[0]);
    expect(component.selectedDrawerStocks().length).toBe(1);
    component.removeDrawerStock(mockLiveStocks[0]);
    expect(component.selectedDrawerStocks().length).toBe(0);
  });

  it('should toggle drawer stock when already selected', () => {
    component.toggleDrawerStock(mockLiveStocks[0]);
    expect(component.selectedDrawerStocks().length).toBe(1);
    component.toggleDrawerStock(mockLiveStocks[0]);
    expect(component.selectedDrawerStocks().length).toBe(0);
    expect(component.stockSearchResults().length).toBeGreaterThanOrEqual(0);
  });

  it('should clear filters only when already at defaults', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.clearFiltersAndSort();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should apply gainers filter and sort by change percentage desc', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    component.setFilter(component.WatchListFilter.GAINERS);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(1);
  });

  it('should apply losers filter', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    component.setFilter(component.WatchListFilter.LOSERS);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(1);
  });

  it('should apply NSE filter', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    component.setFilter(component.WatchListFilter.NSE);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
  });

  it('should sort by all types', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    component.sort('change_value', 'asc');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    component.sort('price', 'desc');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    component.sort('volume', 'asc');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    component.sort('change_percentage', 'desc');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
  });

  it('should sort by name using default sort case', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    component.sort('name', 'asc');
    (component as any).applyFilters();
    const sorted = component.filteredStocks();
    expect(sorted.length).toBe(2);
    expect(sorted[0].liveData?.name).toBe('Reliance Industries');
  });

  it('should filter by BSE exchange', () => {
    const bseStock: WatchListStock = {
      ...mockWatchListStocks[0],
      scripCode: { nse: '', bse: '500325', isin: 'INE003A01012' } as any,
    };
    const bseLive: Stock = {
      ...mockLiveStocks[0],
      name: 'BSE Only Stock',
      scripCode: { nse: '', bse: '500325', isin: 'INE003A01012' } as any,
    };
    const stockData = [
      { ...bseStock, liveData: bseLive },
      {
        ...mockWatchListStocks[0],
        liveData: mockLiveStocks[0],
      },
    ];
    component.stocks.set(stockData);
    component.setFilter(component.WatchListFilter.BSE);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(1);
  });

  it('should handle delete failure', fakeAsync(async () => {
    watchListService.removeStock.mockRejectedValue(new Error('Delete failed'));
    component.id = () => 'wl-1';
    component.deleteStockTarget.set(mockWatchListStocks[0]);
    await component.confirmDelete();
    expect(toastService.show).toHaveBeenCalledWith('Delete failed', 'error');
  }));

  it('should sync query params with search', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.searchQuery.set('test');
    (component as any).syncQueryParams();
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ search: 'test' }),
      }),
    );
  });

  it('should restore query params from route', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot.queryParamMap as any) = {
      get: (key: string) => {
        if (key === 'sortType') return 'name';
        if (key === 'sortOrder') return 'dsc';
        if (key === 'filter') return 'gainers';
        if (key === 'search') return 'test';
        return null;
      },
    };
    (component as any).restoreFromQueryParams();
    expect((component as any).sortType()).toBe('name');
    expect(component.sortOrder()).toBe('dsc');
    expect((component as any).filter()).toBe('gainers');
    expect(component.searchQuery()).toBe('test');
  });

  it('should sync query params with non-default sort', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    (component as any).sortType.set('change_percentage');
    (component as any).sortOrder.set('dsc');
    (component as any).syncQueryParams();
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          sortType: 'change_percentage',
          sortOrder: 'dsc',
        }),
      }),
    );
  });

  it('should sync query params with filter', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    (component as any).filter.set('bse');
    (component as any).syncQueryParams();
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ filter: 'bse' }),
      }),
    );
  });

  it('should handle empty vendor codes in stock loading', fakeAsync(() => {
    const stocksNoVendor = mockWatchListStocks.map((s) => ({
      ...s,
      vendorCode: { etm: {} },
    }));
    watchListStocksSubject.next(stocksNoVendor);
    tick();
    fixture.detectChanges();
    expect(component.stocks().length).toBe(2);
    expect(component.stocks()[0].liveData).toBeUndefined();
    expect(component.loading()).toBe(false);
  }));

  it('should not attach live data from unkeyed stock responses', fakeAsync(() => {
    marketService.getStocks = jest
      .fn()
      .mockReturnValue(
        of([
          { ...mockLiveStocks[0], vendorCode: { etm: {} } },
          mockLiveStocks[1],
        ]),
      );
    watchListStocksSubject.next(mockWatchListStocks);
    tick();

    const byPrimary = (primary: string) =>
      component.stocks().find((s) => s.vendorCode?.etm?.primary === primary);

    expect(byPrimary('comp-123')?.liveData).toBeUndefined();
    expect(byPrimary('comp-456')?.liveData).toBeDefined();
  }));

  it('should exclude existing stocks from search results', () => {
    const searchStock = { ...mockLiveStocks[0] };
    marketService.search = jest.fn().mockReturnValue(of([searchStock]));
    component.stocks.set(
      mockWatchListStocks.map((s, i) => ({
        ...s,
        liveData: mockLiveStocks[i],
      })),
    );
    component.stockSearchQuery.set('Rel');
    fixture.detectChanges();
    const results = component.stockSearchResults();
    expect(
      results.find((r) => r.vendorCode?.etm?.primary === 'comp-123'),
    ).toBeUndefined();
  });

  it('should sort by unknown type returning default case', () => {
    const stockData = mockWatchListStocks.map((s, i) => ({
      ...s,
      liveData: mockLiveStocks[i],
    }));
    component.stocks.set(stockData);
    (component as any).sortType.set('unknown_type' as any);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
  });

  it('should init flowbite instances when loading completes', fakeAsync(() => {
    const spy = jest.spyOn(component as any, 'initFlowbiteInstances');
    component.loading.set(true);
    fixture.detectChanges();
    component.loading.set(false);
    fixture.detectChanges();
    tick();
    expect(spy).toHaveBeenCalled();
  }));

  it('should remove toggled drawer stock from search results', () => {
    component.stockSearchResults.set(mockLiveStocks);
    component.toggleDrawerStock(mockLiveStocks[0]);
    expect(component.selectedDrawerStocks()).toHaveLength(1);
    const results = component.stockSearchResults();
    expect(
      results.find((r) => r.vendorCode?.etm?.primary === 'comp-123'),
    ).toBeUndefined();
    expect(results).toHaveLength(1);
  });

  it('should not trigger search for queries shorter than 3 characters', fakeAsync(() => {
    const searchSpy = marketService.search as jest.Mock;
    searchSpy.mockClear();
    component.stockSearchQuery.set('ab');
    tick(300);
    expect(searchSpy).not.toHaveBeenCalled();
    expect(component.stockSearchResults()).toEqual([]);
  }));

  it('should report drawer stock selection state', () => {
    expect(component.isDrawerStockSelected(mockLiveStocks[0])).toBe(false);
    component.toggleDrawerStock(mockLiveStocks[0]);
    expect(component.isDrawerStockSelected(mockLiveStocks[0])).toBe(true);
  });

  it('should ignore drawer toggles for stocks without a vendor primary key', () => {
    const keyless = { vendorCode: { etm: {} } } as any;

    component.stockSearchResults.set([...mockLiveStocks]);
    component.toggleDrawerStock(keyless);

    expect(component.selectedDrawerStocks()).toHaveLength(0);
    expect(component.stockSearchResults()).toEqual(mockLiveStocks);
    expect(component.isDrawerStockSelected(keyless)).toBe(false);
  });

  it('should remove only the toggled stock when deselecting among keyed stocks', () => {
    component.toggleDrawerStock(mockLiveStocks[0]);
    component.toggleDrawerStock(mockLiveStocks[1]);

    component.toggleDrawerStock(mockLiveStocks[0]);

    const remaining = component.selectedDrawerStocks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].vendorCode?.etm?.primary).toBe('comp-456');
  });

  it('should not add stocks when drawer selection is empty', async () => {
    component.id = () => 'wl-1';
    await component.addSelectedFromDrawer();
    expect(marketService.getStock).not.toHaveBeenCalled();
    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('should skip enrichment results without isin', fakeAsync(async () => {
    const noIsin = { ...mockLiveStocks[0], scripCode: {} } as Stock;
    marketService.getStock = jest.fn().mockReturnValue(of(noIsin));
    component.id = () => 'wl-1';
    component.toggleDrawerStock(mockLiveStocks[0]);
    await component.addSelectedFromDrawer();
    tick();
    expect(watchListService.addStock).not.toHaveBeenCalled();
    expect(toastService.show).toHaveBeenCalledWith(
      'Stocks added to watch list!',
    );
  }));

  it('should continue adding remaining stocks when one lookup fails', fakeAsync(async () => {
    marketService.getStock = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('lookup failed')))
      .mockReturnValueOnce(of(mockLiveStocks[1]));
    component.id = () => 'wl-1';
    component.toggleDrawerStock(mockLiveStocks[0]);
    component.toggleDrawerStock(mockLiveStocks[1]);
    await component.addSelectedFromDrawer();
    tick();
    expect(watchListService.addStock).toHaveBeenCalledTimes(1);
    expect(toastService.show).toHaveBeenCalledWith(
      'Stocks added to watch list!',
    );
  }));

  it('should not move stock when only the target is set', async () => {
    component.id = () => 'wl-1';
    component.moveStockTarget.set(mockWatchListStocks[0]);
    await component.confirmMove();
    expect(watchListService.moveStock).not.toHaveBeenCalled();
  });

  it('should not move stock when only the target list is set', async () => {
    component.id = () => 'wl-1';
    component.selectedMoveList.set('wl-2');
    await component.confirmMove();
    expect(watchListService.moveStock).not.toHaveBeenCalled();
  });

  it('should not delete stock without an isin', async () => {
    const noIsinTarget = {
      ...mockWatchListStocks[0],
      scripCode: {},
    } as WatchListStock;
    component.id = () => 'wl-1';
    component.deleteStockTarget.set(noIsinTarget);
    await component.confirmDelete();
    expect(watchListService.removeStock).not.toHaveBeenCalled();
  });

  it('should sort safely when quote data is missing', () => {
    const partialData = [
      { ...mockWatchListStocks[0], liveData: undefined },
      { ...mockWatchListStocks[1], liveData: { name: 'TCS' } as Stock },
    ];
    component.stocks.set(partialData);
    (component as any).sortType.set('change_percentage');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    (component as any).sortType.set('change_value');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    (component as any).sortType.set('price');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
    (component as any).sortType.set('volume');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
  });

  it('should fall back to vendor code when sorting by name without live data', () => {
    const noLiveData = mockWatchListStocks.map((s) => ({
      ...s,
      liveData: undefined,
    }));
    component.stocks.set(noLiveData);
    (component as any).sortType.set('name');
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(2);
  });

  it('should exclude stocks with missing quotes from gainers and losers filters', () => {
    const noQuoteData = [
      { ...mockWatchListStocks[0], liveData: { name: 'No Quote' } as Stock },
      { ...mockWatchListStocks[1], liveData: mockLiveStocks[1] },
    ];
    component.stocks.set(noQuoteData);
    component.setFilter(component.WatchListFilter.GAINERS);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(0);
    component.setFilter(component.WatchListFilter.LOSERS);
    (component as any).applyFilters();
    expect(component.filteredStocks().length).toBe(1);
  });

  it('should ignore invalid query param values on restore', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot.queryParamMap as any) = {
      get: (key: string) => {
        if (key === 'sortType') return 'bogus';
        if (key === 'sortOrder') return 'bogus';
        if (key === 'filter') return 'nope';
        return null;
      },
    };
    (component as any).restoreFromQueryParams();
    expect((component as any).sortType()).toBe('name');
    expect(component.sortOrder()).toBe('asc');
    expect((component as any).filter()).toBe('none');
    expect(component.searchQuery()).toBe('');
  });

  it('should create flowbite instances when elements exist and use them', () => {
    document.body.innerHTML = `
      <div id="sortDropdown"></div><button id="sortDropdownButton"></button>
      <div id="filterDropdown"></div><button id="filterDropdownButton"></button>
      <div id="add-stock-drawer"></div>`;
    try {
      (component as any).initFlowbiteInstances();
      expect((component as any).sortDropdown).toBeDefined();
      expect((component as any).filterDropdown).toBeDefined();
      expect((component as any).addStockDrawer).toBeDefined();

      component.openStockSearchDrawer();
      expect(component.showStockSearchDrawer()).toBe(true);
      component.closeStockSearchDrawer();
      expect(component.showStockSearchDrawer()).toBe(false);

      component.sort('name', 'dsc');
      component.clearFiltersAndSort();
      expect((component as any).sortType()).toBe('name');
    } finally {
      document.body.innerHTML = '';
    }
  });
});
