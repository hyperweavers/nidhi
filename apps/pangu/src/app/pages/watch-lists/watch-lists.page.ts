import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { Dropdown } from 'flowbite';

import { ToastService, ToastType } from '@nidhi/shared-toast';
import { Constants } from '../../constants';
import { WatchList } from '../../models/watch-list';
import { WatchListService } from '../../services/watch-list.service';

export enum WatchListsSortType {
  NAME = 'name',
  CREATED_AT = 'created_at',
  STOCK_COUNT = 'stock_count',
}

export enum WatchListsSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

@UntilDestroy()
@Component({
  selector: 'app-watch-lists',
  imports: [CommonModule, FormsModule],
  templateUrl: './watch-lists.page.html',
  styleUrl: './watch-lists.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchListsPage implements AfterViewInit {
  private readonly watchListService = inject(WatchListService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private sortDropdown?: Dropdown;

  public readonly watchLists = signal<WatchList[]>([]);
  public readonly stockCounts = signal<Map<string, number>>(new Map());
  public readonly loading = signal(true);

  public readonly searchQuery = signal('');
  public readonly sortBy = signal<WatchListsSortType>(WatchListsSortType.NAME);
  public readonly sortOrder = signal<WatchListsSortOrder>(
    WatchListsSortOrder.ASC,
  );

  public readonly filteredWatchLists = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const lists = this.watchLists().filter(
      (l) => !query || l.name.toLowerCase().includes(query),
    );
    const sortKey = this.sortBy();
    const dir = this.sortOrder() === WatchListsSortOrder.ASC ? 1 : -1;

    return [...lists].sort((a, b) => {
      switch (sortKey) {
        case WatchListsSortType.CREATED_AT:
          return dir * ((a.createdAt || 0) - (b.createdAt || 0));
        case WatchListsSortType.STOCK_COUNT:
          return (
            dir *
            ((this.stockCounts().get(a.id) || 0) -
              (this.stockCounts().get(b.id) || 0))
          );
        default:
          return dir * a.name.localeCompare(b.name);
      }
    });
  });

  public readonly showRenameModal = signal(false);
  public readonly showDeleteConfirm = signal(false);
  public readonly showDefaultConfirm = signal(false);
  public readonly renameTarget = signal<WatchList | undefined>(undefined);
  public readonly renameName = signal('');
  public readonly deleteTarget = signal<WatchList | undefined>(undefined);
  public readonly defaultTarget = signal<WatchList | undefined>(undefined);

  public readonly Routes = Constants.routes;

  public readonly WatchListsSortType = WatchListsSortType;
  public readonly WatchListsSortOrder = WatchListsSortOrder;

  constructor() {
    this.watchListService.watchLists$
      .pipe(untilDestroyed(this))
      .subscribe((lists) => {
        this.watchLists.set(lists);
        this.loading.set(false);
        this.cdr.markForCheck();
      });

    this.watchListService.watchListStocksAll$
      .pipe(untilDestroyed(this))
      .subscribe((stocks) => {
        const map = new Map<string, number>();
        for (const stock of stocks) {
          map.set(stock.watchListId, (map.get(stock.watchListId) || 0) + 1);
        }
        this.stockCounts.set(map);

        this.cdr.markForCheck();
      });

    // Sync search to query params on change
    toObservable(this.searchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.syncQueryParams();
      });

    this.restoreFromQueryParams();
  }

  public openWatchList(list: WatchList): void {
    this.router.navigate(['/', Constants.routes.WATCH_LIST, list.id]);
  }

  public openRenameModal(list: WatchList): void {
    this.renameTarget.set(list);
    this.renameName.set(list.name);
    this.showRenameModal.set(true);
  }

  public closeRenameModal(): void {
    this.showRenameModal.set(false);
    this.renameTarget.set(undefined);
    this.renameName.set('');
  }

  public async confirmRename(): Promise<void> {
    const target = this.renameTarget();
    const name = this.renameName().trim();

    if (!target || !name) return;

    try {
      await this.watchListService.renameWatchList(target.id, name);

      this.toastService.show('Watch list renamed successfully!');
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeRenameModal();
    }
  }

  public openDeleteConfirm(list: WatchList): void {
    this.deleteTarget.set(list);
    this.showDeleteConfirm.set(true);
  }

  public closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(undefined);
  }

  public async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();

    if (!target) return;

    try {
      await this.watchListService.deleteWatchList(target.id);

      this.toastService.show('Watch list deleted successfully!');
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeDeleteConfirm();
    }
  }

  public openDefaultConfirm(list: WatchList): void {
    this.defaultTarget.set(list);
    this.showDefaultConfirm.set(true);
  }

  public closeDefaultConfirm(): void {
    this.showDefaultConfirm.set(false);
    this.defaultTarget.set(undefined);
  }

  public async confirmDefault(): Promise<void> {
    const target = this.defaultTarget();

    if (!target) return;

    try {
      await this.watchListService.setDefaultWatchList(target.id);

      this.toastService.show(`${target.name} is now the default watch list!`);
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeDefaultConfirm();
    }
  }

  public ngAfterViewInit(): void {
    setTimeout(
      () => this.initFlowbiteInstances(),
      Constants.configs.defaults.FLOWBITE_INITIALIZATION_DELAY,
    );
  }

  public setSort(key: WatchListsSortType, order: WatchListsSortOrder): void {
    this.sortBy.set(key);
    this.sortOrder.set(order);
    this.syncQueryParams();
    this.sortDropdown?.hide();
  }

  public clearFiltersAndSort(): void {
    if (
      this.sortBy() !== WatchListsSortType.NAME ||
      this.sortOrder() !== WatchListsSortOrder.ASC ||
      this.searchQuery()
    ) {
      this.sortBy.set(WatchListsSortType.NAME);
      this.sortOrder.set(WatchListsSortOrder.ASC);
      this.searchQuery.set('');

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });

      this.sortDropdown?.hide();
    }
  }

  public getStockCount(listId: string): number {
    return this.stockCounts().get(listId) || 0;
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortBy = params.get('sortBy') as WatchListsSortType | null;
    const sortOrder = params.get('sortOrder') as WatchListsSortOrder | null;

    if (
      sortBy &&
      sortOrder &&
      Object.values(WatchListsSortType).includes(sortBy) &&
      Object.values(WatchListsSortOrder).includes(sortOrder)
    ) {
      this.sortBy.set(sortBy);
      this.sortOrder.set(sortOrder);
    }

    const search = params.get('search');
    if (search) {
      this.searchQuery.set(search);
    }
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string> = {};

    if (
      this.sortBy() !== WatchListsSortType.NAME ||
      this.sortOrder() !== WatchListsSortOrder.ASC
    ) {
      queryParams['sortBy'] = this.sortBy();
      queryParams['sortOrder'] = this.sortOrder();
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
  }
}
