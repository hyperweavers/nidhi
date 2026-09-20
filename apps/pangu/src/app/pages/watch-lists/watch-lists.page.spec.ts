import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ToastService } from '@nidhi/shared-toast';
import { Constants } from '../../constants';
import { WatchList } from '../../models/watch-list';
import { WatchListService } from '../../services/watch-list.service';
import {
  WatchListsPage,
  WatchListsSortOrder,
  WatchListsSortType,
} from './watch-lists.page';

const mockLists: WatchList[] = [
  { id: 'wl-1', name: 'My Watchlist', isDefault: true },
  { id: 'wl-2', name: 'Tech Stocks', isDefault: false },
  { id: 'wl-3', name: 'Blue Chips', isDefault: false },
];

describe('WatchListsPage', () => {
  let component: WatchListsPage;
  let fixture: ComponentFixture<WatchListsPage>;
  let watchListService: jest.Mocked<WatchListService>;
  let toastService: jest.Mocked<ToastService>;
  let router: Router;
  let watchListStocksAllSubject: Subject<any[]>;

  beforeEach(async () => {
    watchListStocksAllSubject = new Subject<any[]>();
    watchListService = {
      watchLists$: of(mockLists),
      watchListStocksAll$: watchListStocksAllSubject.asObservable(),
      getWatchList$: jest.fn(),
      getWatchListStocks$: jest.fn(),
      ensureDefaultWatchList: jest.fn(),
      createWatchList: jest.fn().mockResolvedValue('new-list'),
      renameWatchList: jest.fn().mockResolvedValue(undefined),
      deleteWatchList: jest.fn().mockResolvedValue(undefined),
      setDefaultWatchList: jest.fn().mockResolvedValue(undefined),
      addStock: jest.fn(),
      addStockToMultipleLists: jest.fn(),
      removeStock: jest.fn(),
      moveStock: jest.fn(),
      getListsWithoutStock: jest.fn().mockResolvedValue([]),
    } as any;

    toastService = {
      show: jest.fn(),
      toasts: jest.fn().mockReturnValue([]),
      dismiss: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [WatchListsPage],
      providers: [
        provideRouter([]),
        { provide: WatchListService, useValue: watchListService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(WatchListsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display watch lists in table', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(3);
  });

  it('should navigate to watchlist detail on openWatchList', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.openWatchList({ id: 'wl-1', name: 'Test', isDefault: false });
    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      Constants.routes.WATCH_LIST,
      'wl-1',
    ]);
  });

  it('should open rename modal', () => {
    const list: WatchList = {
      id: 'wl-2',
      name: 'Tech Stocks',
      isDefault: false,
    };
    component.openRenameModal(list);
    expect(component.showRenameModal()).toBe(true);
    expect(component.renameTarget()).toBe(list);
    expect(component.renameName()).toBe('Tech Stocks');
  });

  it('should close rename modal', () => {
    component.showRenameModal.set(true);
    component.renameTarget.set(mockLists[0]);
    component.closeRenameModal();
    expect(component.showRenameModal()).toBe(false);
    expect(component.renameTarget()).toBeUndefined();
  });

  it('should confirm rename', fakeAsync(async () => {
    component.renameTarget.set(mockLists[1]);
    component.renameName.set('New Name');
    await component.confirmRename();
    expect(watchListService.renameWatchList).toHaveBeenCalledWith(
      'wl-2',
      'New Name',
    );
    expect(toastService.show).toHaveBeenCalledWith(
      'Watchlist renamed successfully!',
    );
  }));

  it('should show error on rename failure', fakeAsync(async () => {
    watchListService.renameWatchList.mockRejectedValue(
      new Error('Name exists'),
    );
    component.renameTarget.set(mockLists[1]);
    component.renameName.set('New Name');
    await component.confirmRename();
    expect(toastService.show).toHaveBeenCalledWith('Name exists', 'error');
  }));

  it('should open delete confirm modal', () => {
    const list: WatchList = {
      id: 'wl-2',
      name: 'Tech Stocks',
      isDefault: false,
    };
    component.openDeleteConfirm(list);
    expect(component.showDeleteConfirm()).toBe(true);
    expect(component.deleteTarget()).toBe(list);
  });

  it('should close delete confirm', () => {
    component.showDeleteConfirm.set(true);
    component.deleteTarget.set(mockLists[0]);
    component.closeDeleteConfirm();
    expect(component.showDeleteConfirm()).toBe(false);
    expect(component.deleteTarget()).toBeUndefined();
  });

  it('should confirm delete', fakeAsync(async () => {
    component.deleteTarget.set(mockLists[1]);
    await component.confirmDelete();
    expect(watchListService.deleteWatchList).toHaveBeenCalledWith('wl-2');
    expect(toastService.show).toHaveBeenCalledWith(
      'Watchlist deleted successfully!',
    );
  }));

  it('should show error on delete failure', fakeAsync(async () => {
    watchListService.deleteWatchList.mockRejectedValue(
      new Error('Cannot delete default'),
    );
    component.deleteTarget.set(mockLists[1]);
    await component.confirmDelete();
    expect(toastService.show).toHaveBeenCalledWith(
      'Cannot delete default',
      'error',
    );
  }));

  it('should open default confirm modal', () => {
    const list: WatchList = {
      id: 'wl-2',
      name: 'Tech Stocks',
      isDefault: false,
    };
    component.openDefaultConfirm(list);
    expect(component.showDefaultConfirm()).toBe(true);
    expect(component.defaultTarget()).toBe(list);
  });

  it('should close default confirm', () => {
    component.showDefaultConfirm.set(true);
    component.defaultTarget.set(mockLists[0]);
    component.closeDefaultConfirm();
    expect(component.showDefaultConfirm()).toBe(false);
    expect(component.defaultTarget()).toBeUndefined();
  });

  it('should confirm set default', fakeAsync(async () => {
    component.defaultTarget.set(mockLists[1]);
    await component.confirmDefault();
    expect(watchListService.setDefaultWatchList).toHaveBeenCalledWith('wl-2');
    expect(toastService.show).toHaveBeenCalledWith(
      'Tech Stocks is now the default watchlist!',
    );
  }));

  it('should show error on set default failure', fakeAsync(async () => {
    watchListService.setDefaultWatchList.mockRejectedValue(
      new Error('Not found'),
    );
    component.defaultTarget.set(mockLists[1]);
    await component.confirmDefault();
    expect(toastService.show).toHaveBeenCalledWith('Not found', 'error');
  }));

  it('should get stock count for a list', fakeAsync(() => {
    component.stockCounts.set(new Map([['wl-1', 3]]));
    tick();
    const count = component.getStockCount('wl-1');
    expect(count).toBe(3);
  }));

  it('should rename with trimmed name', fakeAsync(async () => {
    component.renameTarget.set(mockLists[1]);
    component.renameName.set('  Trimmed Name  ');
    await component.confirmRename();
    expect(watchListService.renameWatchList).toHaveBeenCalledWith(
      'wl-2',
      'Trimmed Name',
    );
  }));

  it('should not rename without target or name', fakeAsync(async () => {
    await component.confirmRename();
    expect(watchListService.renameWatchList).not.toHaveBeenCalled();
    component.renameTarget.set(mockLists[1]);
    component.renameName.set('');
    await component.confirmRename();
    expect(watchListService.renameWatchList).not.toHaveBeenCalled();
  }));

  it('should not confirm delete without target', fakeAsync(async () => {
    await component.confirmDelete();
    expect(watchListService.deleteWatchList).not.toHaveBeenCalled();
  }));

  it('should not confirm default without target', fakeAsync(async () => {
    await component.confirmDefault();
    expect(watchListService.setDefaultWatchList).not.toHaveBeenCalled();
  }));

  it('should return 0 for missing stock count', () => {
    expect(component.getStockCount('missing-id')).toBe(0);
  });

  describe('setSort', () => {
    it('should set sort key and order', () => {
      component.setSort(WatchListsSortType.NAME, WatchListsSortOrder.ASC);
      expect(component.sortBy()).toBe(WatchListsSortType.NAME);
      expect(component.sortOrder()).toBe(WatchListsSortOrder.ASC);
      component.setSort(WatchListsSortType.NAME, WatchListsSortOrder.DSC);
      expect(component.sortBy()).toBe(WatchListsSortType.NAME);
      expect(component.sortOrder()).toBe(WatchListsSortOrder.DSC);
    });

    it('should set new sort key with specified order', () => {
      component.setSort(WatchListsSortType.CREATED_AT, WatchListsSortOrder.ASC);
      expect(component.sortBy()).toBe(WatchListsSortType.CREATED_AT);
      expect(component.sortOrder()).toBe(WatchListsSortOrder.ASC);
      component.setSort(
        WatchListsSortType.STOCK_COUNT,
        WatchListsSortOrder.DSC,
      );
      expect(component.sortBy()).toBe(WatchListsSortType.STOCK_COUNT);
      expect(component.sortOrder()).toBe(WatchListsSortOrder.DSC);
    });
  });

  it('should sort filteredWatchLists by createdAt', () => {
    component.watchLists.set([
      { id: '1', name: 'B List', isDefault: false, createdAt: 100 },
      { id: '2', name: 'A List', isDefault: false, createdAt: 200 },
    ]);
    component.sortBy.set(WatchListsSortType.CREATED_AT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('1');
  });

  it('should sort filteredWatchLists by stockCount', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false },
      { id: '2', name: 'B List', isDefault: false },
    ]);
    component.stockCounts.set(
      new Map([
        ['1', 5],
        ['2', 3],
      ]),
    );
    component.sortBy.set(WatchListsSortType.STOCK_COUNT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('2');
  });

  it('should build stock counts from watchListStocksAll$', fakeAsync(() => {
    watchListStocksAllSubject.next([
      { watchListId: 'wl-1', scripCode: { isin: 'INE001' } },
      { watchListId: 'wl-1', scripCode: { isin: 'INE002' } },
      { watchListId: 'wl-2', scripCode: { isin: 'INE003' } },
    ]);
    tick();
    fixture.detectChanges();
    expect(component.getStockCount('wl-1')).toBe(2);
    expect(component.getStockCount('wl-2')).toBe(1);
    expect(component.getStockCount('wl-3')).toBe(0);
  }));

  it('should filter lists by search query', () => {
    component.searchQuery.set('Tech');
    const result = component.filteredWatchLists();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Tech Stocks');
  });

  it('should sort filteredWatchLists in desc order', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false, createdAt: 100 },
      { id: '2', name: 'B List', isDefault: false, createdAt: 200 },
    ]);
    component.sortBy.set(WatchListsSortType.NAME);
    component.sortOrder.set(WatchListsSortOrder.DSC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('2');
  });

  it('should handle falsy createdAt in sort', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false } as WatchList,
      { id: '2', name: 'B List', isDefault: false, createdAt: 100 },
    ]);
    component.sortBy.set(WatchListsSortType.CREATED_AT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('1');
  });

  it('should handle missing stockCount in sort', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false },
      { id: '2', name: 'B List', isDefault: false },
    ]);
    component.stockCounts.set(new Map([['2', 5]]));
    component.sortBy.set(WatchListsSortType.STOCK_COUNT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('1');
  });

  it('should handle second item with falsy createdAt in sort', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false, createdAt: 200 },
      { id: '2', name: 'B List', isDefault: false } as WatchList,
    ]);
    component.sortBy.set(WatchListsSortType.CREATED_AT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('2');
  });

  it('should handle second item with missing stockCount in sort', () => {
    component.watchLists.set([
      { id: '1', name: 'A List', isDefault: false },
      { id: '2', name: 'B List', isDefault: false },
    ]);
    component.stockCounts.set(new Map([['1', 5]]));
    component.sortBy.set(WatchListsSortType.STOCK_COUNT);
    component.sortOrder.set(WatchListsSortOrder.ASC);
    const result = component.filteredWatchLists();
    expect(result[0].id).toBe('2');
  });

  it('should clear filters and sort', () => {
    component.sortBy.set(WatchListsSortType.STOCK_COUNT);
    component.sortOrder.set(WatchListsSortOrder.DSC);
    component.searchQuery.set('test');
    component.clearFiltersAndSort();
    expect(component.sortBy()).toBe(WatchListsSortType.NAME);
    expect(component.sortOrder()).toBe(WatchListsSortOrder.ASC);
    expect(component.searchQuery()).toBe('');
  });
});
