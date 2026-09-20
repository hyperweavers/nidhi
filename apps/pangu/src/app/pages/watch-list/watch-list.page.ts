import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  skip,
  switchMap,
} from 'rxjs';

import { ToastService, ToastType } from '@nidhi/shared-toast';
import { Drawer, Dropdown } from 'flowbite';
import { PortfolioPopoverComponent } from '../../components/portfolio-popover/portfolio-popover.component';
import {
  SelectWatchListComponent,
  WatchListSelectionMode,
} from '../../components/select-watch-list/select-watch-list.component';
import { Constants } from '../../constants';
import { Direction, ExchangeName } from '../../models/market';
import { Holding } from '../../models/portfolio';
import { Stock } from '../../models/stock';
import { WatchList, WatchListStock } from '../../models/watch-list';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { PortfolioService } from '../../services/portfolio.service';
import { WatchListService } from '../../services/watch-list.service';

enum WatchListSortType {
  NAME = 'name',
  CHANGE_PERCENTAGE = 'change_percentage',
  CHANGE_VALUE = 'change_value',
  PRICE = 'price',
  VOLUME = 'volume',
}

enum WatchListSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

enum WatchListFilter {
  NONE = 'none',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  NSE = 'nse',
  BSE = 'bse',
}

@UntilDestroy()
@Component({
  selector: 'app-watch-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ValueOrPlaceholderPipe,
    SelectWatchListComponent,
    PortfolioPopoverComponent,
  ],
  templateUrl: './watch-list.page.html',
  styleUrl: './watch-list.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class WatchListPage implements AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly watchListService = inject(WatchListService);
  private readonly marketService = inject(MarketService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly toastService = inject(ToastService);

  private readonly stockSearchBox = viewChild<ElementRef>('stockSearchBox');

  public readonly id = input<string>('');

  public readonly Routes = Constants.routes;
  public readonly Direction = Direction;

  public readonly watchList = signal<WatchList | undefined>(undefined);
  public readonly editMode = signal(false);
  public readonly searchQuery = signal('');
  public readonly stockSearchQuery = signal('');
  public readonly stockSearchResults = signal<Stock[]>([]);
  public readonly showStockSearchResults = signal(true);
  public readonly showStockSearchDrawer = signal(false);
  public readonly selectedDrawerStocks = signal<Stock[]>([]);
  public readonly showMoveModal = signal(false);
  public readonly showDeleteConfirm = signal(false);
  public readonly moveStockTarget = signal<WatchListStock | undefined>(
    undefined,
  );
  public readonly deleteStockTarget = signal<WatchListStock | undefined>(
    undefined,
  );
  public readonly availableListsForMove = signal<WatchList[]>([]);
  public readonly selectedMoveList = signal<string>('');
  public readonly loading = signal(true);
  public readonly stocks = signal<(WatchListStock & { liveData?: Stock })[]>(
    [],
  );
  protected readonly holdingsByCode = signal<Map<string, Holding>>(new Map());
  public readonly filteredStocks = signal<
    (WatchListStock & { liveData?: Stock })[]
  >([]);

  public readonly WatchListSortType = WatchListSortType;
  public readonly WatchListSortOrder = WatchListSortOrder;
  public readonly WatchListFilter = WatchListFilter;
  public readonly WatchListSelectionMode = WatchListSelectionMode;

  private sortDropdown?: Dropdown;
  private filterDropdown?: Dropdown;
  private addStockDrawer?: Drawer;

  private sortType = signal<WatchListSortType>(WatchListSortType.NAME);
  public sortOrder = signal<WatchListSortOrder>(WatchListSortOrder.ASC);
  private filter = signal<WatchListFilter>(WatchListFilter.NONE);

  constructor() {
    const marketService = inject(MarketService);

    // Portfolio holdings by vendor code for the in-portfolio indicator.
    this.portfolioService.portfolio$
      .pipe(untilDestroyed(this))
      .subscribe((portfolio) => {
        this.holdingsByCode.set(
          new Map(
            (portfolio.holdings || [])
              .filter(
                (h) => h.vendorCode?.etm?.primary && (h.quantity || 0) > 0,
              )
              .map((h) => [h.vendorCode.etm.primary as string, h]),
          ),
        );
      });

    // Load watchlist stocks and live prices
    toObservable(this.id)
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        switchMap((watchListId) => {
          if (!watchListId) {
            return of<[WatchList | undefined, WatchListStock[]]>([
              undefined,
              [],
            ]);
          }

          return combineLatest([
            this.watchListService.getWatchList$(watchListId),
            this.watchListService.getWatchListStocks$(watchListId),
          ]);
        }),
        switchMap(([list, watchListStocks]) => {
          this.watchList.set(list);

          const stocks = watchListStocks ?? [];

          // Reflect storage state immediately; live quotes merge in below.
          const prevLive = new Map(
            this.stocks().flatMap((s) => {
              const key = s.vendorCode?.etm?.primary;
              return key ? [[key, s.liveData]] : [];
            }),
          );

          this.stocks.set(
            stocks.map((wls) => ({
              ...wls,
              liveData: prevLive.get(wls.vendorCode?.etm?.primary),
            })),
          );
          this.loading.set(false);
          this.applyFilters();

          const codes = stocks
            .map((s) => s.vendorCode?.etm?.primary)
            .filter(Boolean) as string[];

          if (codes.length === 0) return of(null);

          return this.marketService.getStocks(codes).pipe(
            map((liveStocks: Stock[]) => {
              const liveMap = new Map(
                liveStocks.flatMap((s) => {
                  const key = s.vendorCode?.etm?.primary;
                  return key ? [[key, s]] : [];
                }),
              );

              return stocks.map((wls) => ({
                ...wls,
                liveData: liveMap.get(wls.vendorCode?.etm?.primary),
              }));
            }),
          );
        }),
      )
      .subscribe((stocks) => {
        if (stocks) {
          this.stocks.set(stocks);
          this.applyFilters();
          this.cdr.markForCheck();
        }
      });

    // Initialize Flowbite instances after loading completes (elements exist in DOM)
    toObservable(this.loading)
      .pipe(
        untilDestroyed(this),
        skip(1),
        filter((v) => !v),
      )
      .subscribe(() => {
        setTimeout(() => this.initFlowbiteInstances());
      });

    // Stock search for "Add Stock" drawer
    toObservable(this.stockSearchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        switchMap((query) =>
          query.length >= Constants.configs.defaults.MIN_SEARCH_CHARS
            ? marketService.search(query)
            : of([]),
        ),
      )
      .subscribe((results) => {
        const existingPrimaryCodes = new Set(
          this.stocks()
            .map((s) => s.vendorCode?.etm?.primary)
            .filter(Boolean),
        );
        const selectedPrimaryCodes = new Set(
          this.selectedDrawerStocks()
            .map((s) => s.vendorCode?.etm?.primary)
            .filter(Boolean),
        );

        this.stockSearchResults.set(
          results.filter(
            (r) =>
              !existingPrimaryCodes.has(r.vendorCode?.etm?.primary) &&
              !selectedPrimaryCodes.has(r.vendorCode?.etm?.primary),
          ),
        );
        this.showStockSearchResults.set(true);

        this.cdr.markForCheck();
      });

    // Filter/sort when search, sort, or filter changes
    toObservable(this.searchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.applyFilters();
      });

    toObservable(this.sortType)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.applyFilters());
    toObservable(this.sortOrder)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.applyFilters());
    toObservable(this.filter)
      .pipe(untilDestroyed(this))
      .subscribe(() => this.applyFilters());

    // Restore query params
    this.restoreFromQueryParams();
  }

  public ngAfterViewInit(): void {
    setTimeout(
      () => this.initFlowbiteInstances(),
      Constants.configs.defaults.FLOWBITE_INITIALIZATION_DELAY,
    );
  }

  public onDocumentClick(event: MouseEvent): void {
    if (!this.showStockSearchResults()) return;

    const box = this.stockSearchBox()?.nativeElement as HTMLElement | undefined;

    if (box && !box.contains(event.target as Node)) {
      this.showStockSearchResults.set(false);

      this.cdr.markForCheck();
    }
  }

  public onHeaderWatchListSelected(listOrLists: WatchList | WatchList[]): void {
    if (Array.isArray(listOrLists)) return;

    this.router.navigate(['/', Constants.routes.WATCH_LIST, listOrLists.id]);
  }

  public toggleEditMode(): void {
    this.editMode.update((v) => !v);
  }

  public openStockSearchDrawer(): void {
    this.showStockSearchDrawer.set(true);
    this.stockSearchQuery.set('');
    this.stockSearchResults.set([]);
    this.showStockSearchResults.set(true);
    this.selectedDrawerStocks.set([]);
    this.addStockDrawer?.show();
  }

  public closeStockSearchDrawer(): void {
    this.showStockSearchDrawer.set(false);
    this.addStockDrawer?.hide();
  }

  public isDrawerStockSelected(stock: Stock): boolean {
    const key = stock.vendorCode?.etm?.primary;

    if (!key) return false;

    return this.selectedDrawerStocks().some(
      (s) => s.vendorCode?.etm?.primary === key,
    );
  }

  public toggleDrawerStock(stock: Stock): void {
    const key = stock.vendorCode?.etm?.primary;

    if (!key) return;

    if (this.isDrawerStockSelected(stock)) {
      this.selectedDrawerStocks.update((list) =>
        list.filter((s) => s.vendorCode?.etm?.primary !== key),
      );
      this.stockSearchResults.update((results) => [...results, stock]);
    } else {
      this.selectedDrawerStocks.update((list) => [...list, stock]);
      this.stockSearchResults.update((results) =>
        results.filter((r) => r.vendorCode?.etm?.primary !== key),
      );
    }
  }

  public removeDrawerStock(stock: Stock): void {
    this.toggleDrawerStock(stock);
  }

  public async addSelectedFromDrawer(): Promise<void> {
    const listId = this.id();

    if (!listId) return;

    const selected = this.selectedDrawerStocks();

    if (selected.length === 0) return;

    this.loading.set(true);

    for (const stock of selected) {
      try {
        const enriched = await firstValueFrom(
          this.marketService.getStock(stock.vendorCode.etm.primary, true),
        );

        if (enriched?.scripCode?.isin) {
          await this.watchListService.addStock(
            listId,
            enriched.scripCode,
            enriched.vendorCode,
          );
        }
      } catch {
        // Skip
      }
    }

    this.loading.set(false);
    this.toastService.show('Stocks added to watchlist!');
    this.closeStockSearchDrawer();
    this.marketService.refresh();
  }

  public openMoveModal(stock: WatchListStock): void {
    this.moveStockTarget.set(stock);
    this.selectedMoveList.set('');

    this.watchListService
      .getListsWithoutStock(stock.scripCode?.isin || '', this.id())
      .then((lists) => {
        this.availableListsForMove.set(lists);
        this.showMoveModal.set(true);
        this.cdr.markForCheck();
      });
  }

  public onMoveListSelected(listOrLists: WatchList | WatchList[]): void {
    if (Array.isArray(listOrLists)) return;

    this.selectedMoveList.set(listOrLists.id);
  }

  public closeMoveModal(): void {
    this.showMoveModal.set(false);
    this.moveStockTarget.set(undefined);
    this.selectedMoveList.set('');
  }

  public async confirmMove(): Promise<void> {
    const target = this.moveStockTarget();
    const toListId = this.selectedMoveList();

    if (!target || !toListId) return;

    try {
      await this.watchListService.moveStock(
        this.id(),
        toListId,
        target.scripCode,
        target.vendorCode,
      );

      this.toastService.show('Stock moved successfully!');
      this.marketService.refresh();
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeMoveModal();
    }
  }

  public openDeleteConfirm(stock: WatchListStock): void {
    this.deleteStockTarget.set(stock);
    this.showDeleteConfirm.set(true);
  }

  public closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteStockTarget.set(undefined);
  }

  public async confirmDelete(): Promise<void> {
    const target = this.deleteStockTarget();

    if (!target || !target.scripCode?.isin) return;

    try {
      await this.watchListService.removeStock(this.id(), target.scripCode.isin);

      this.toastService.show('Stock removed from watchlist!');
      this.marketService.refresh();
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeDeleteConfirm();
    }
  }

  public navigateToWatchLists(): void {
    this.router.navigate(['/', Constants.routes.WATCH_LIST]);
  }

  public sort(type: WatchListSortType, order: WatchListSortOrder): void {
    this.sortType.set(type);
    this.sortOrder.set(order);
    this.syncQueryParams();
    this.sortDropdown?.hide();
  }

  public setFilter(filter: WatchListFilter): void {
    this.filter.set(filter);
    this.syncQueryParams();
    this.filterDropdown?.hide();
  }

  public clearFiltersAndSort(): void {
    if (
      this.sortType() !== WatchListSortType.NAME ||
      this.sortOrder() !== WatchListSortOrder.ASC ||
      this.filter() !== WatchListFilter.NONE ||
      this.searchQuery()
    ) {
      this.sortType.set(WatchListSortType.NAME);
      this.sortOrder.set(WatchListSortOrder.ASC);
      this.filter.set(WatchListFilter.NONE);
      this.searchQuery.set('');

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });

      this.sortDropdown?.hide();
      this.filterDropdown?.hide();
    }
  }

  public getExchange(stock: WatchListStock): string {
    if (stock.scripCode?.nse) return ExchangeName.NSE;
    if (stock.scripCode?.bse) return ExchangeName.BSE;
    return '';
  }

  protected holdingFor(primary?: string): Holding | undefined {
    if (!primary) return undefined;
    return this.holdingsByCode().get(primary);
  }

  private applyFilters(): void {
    const query = this.searchQuery().toLowerCase();
    const currentFilter = this.filter();
    const currentSortType = this.sortType();
    const currentSortOrder = this.sortOrder();

    let filtered = this.stocks().filter((s) => {
      const name = s.liveData?.name || '';

      if (query && !name.toLowerCase().includes(query)) return false;

      const change = s.liveData?.quote?.nse?.change;
      const exchange = this.getExchange(s).toLowerCase();

      switch (currentFilter) {
        case WatchListFilter.GAINERS:
          return change?.direction === Direction.UP;
        case WatchListFilter.LOSERS:
          return change?.direction === Direction.DOWN;
        case WatchListFilter.NSE:
          return exchange === ExchangeName.NSE;
        case WatchListFilter.BSE:
          return exchange === ExchangeName.BSE;
        default:
          return true;
      }
    });

    filtered = [...filtered].sort((a, b) => {
      const aData = a.liveData;
      const bData = b.liveData;
      const dir = currentSortOrder === WatchListSortOrder.ASC ? 1 : -1;

      switch (currentSortType) {
        case WatchListSortType.NAME: {
          const an = aData?.name || a.vendorCode?.etm?.primary || '';
          const bn = bData?.name || b.vendorCode?.etm?.primary || '';
          return dir * an.localeCompare(bn);
        }
        case WatchListSortType.CHANGE_PERCENTAGE:
          return (
            dir *
            ((aData?.quote?.nse?.change?.percentage || 0) -
              (bData?.quote?.nse?.change?.percentage || 0))
          );
        case WatchListSortType.CHANGE_VALUE:
          return (
            dir *
            ((aData?.quote?.nse?.change?.value || 0) -
              (bData?.quote?.nse?.change?.value || 0))
          );
        case WatchListSortType.PRICE:
          return (
            dir *
            ((aData?.quote?.nse?.price || 0) - (bData?.quote?.nse?.price || 0))
          );
        case WatchListSortType.VOLUME:
          return (
            dir *
            ((aData?.quote?.nse?.volume || 0) -
              (bData?.quote?.nse?.volume || 0))
          );
        default:
          return 0;
      }
    });

    this.filteredStocks.set(filtered);
    this.cdr.markForCheck();
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortType = params.get('sortType') as WatchListSortType | null;
    const sortOrder = params.get('sortOrder') as WatchListSortOrder | null;

    if (
      sortType &&
      sortOrder &&
      Object.values(WatchListSortType).includes(sortType) &&
      Object.values(WatchListSortOrder).includes(sortOrder)
    ) {
      this.sortType.set(sortType);
      this.sortOrder.set(sortOrder);
    }

    const filter = params.get('filter') as WatchListFilter | null;
    if (filter && Object.values(WatchListFilter).includes(filter)) {
      this.filter.set(filter);
    }

    const search = params.get('search');
    if (search) {
      this.searchQuery.set(search);
    }
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string> = {};

    if (
      this.sortType() !== WatchListSortType.NAME ||
      this.sortOrder() !== WatchListSortOrder.ASC
    ) {
      queryParams['sortType'] = this.sortType();
      queryParams['sortOrder'] = this.sortOrder();
    }

    if (this.filter() !== WatchListFilter.NONE) {
      queryParams['filter'] = this.filter();
    }

    if (this.searchQuery()) {
      queryParams['search'] = this.searchQuery();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  private initFlowbiteInstances(): void {
    const sortEl = document.getElementById('sortDropdown');
    const sortBtn = document.getElementById('sortDropdownButton');
    if (sortBtn && sortEl) {
      this.sortDropdown = new Dropdown(sortEl, sortBtn);
    }

    const filterEl = document.getElementById('filterDropdown');
    const filterBtn = document.getElementById('filterDropdownButton');
    if (filterBtn && filterEl) {
      this.filterDropdown = new Dropdown(filterEl, filterBtn);
    }

    const drawerEl = document.getElementById('add-stock-drawer');
    if (drawerEl) {
      this.addStockDrawer = new Drawer(drawerEl, { placement: 'right' });
    }
  }
}
