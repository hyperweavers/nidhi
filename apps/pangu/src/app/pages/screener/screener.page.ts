import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, distinctUntilChanged, firstValueFrom, take } from 'rxjs';

import { Constants } from '../../constants';
import { Direction, ExchangeName } from '../../models/market';
import { ScreenerPreviewResult } from '../../models/screener';
import { Stock } from '../../models/stock';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { ScreenerService } from '../../services/screener.service';

export enum ScreenerSortType {
  NAME = 'name',
  CHANGE_PERCENTAGE = 'change_percentage',
  CHANGE_VALUE = 'change_value',
  PRICE = 'price',
  VOLUME = 'volume',
}

export enum ScreenerSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

export enum ScreenerFilter {
  NONE = 'none',
  GAINERS = 'gainers',
  LOSERS = 'losers',
  NSE = 'nse',
  BSE = 'bse',
}

export type EnrichedScreenerResult = ScreenerPreviewResult & {
  liveData?: Stock;
};

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 8;

@UntilDestroy()
@Component({
  selector: 'app-screener',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ScrollingModule,
    ValueOrPlaceholderPipe,
  ],
  templateUrl: './screener.page.html',
  styleUrl: './screener.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ScreenerPage implements OnInit {
  public readonly id = input<string>('');

  private readonly screenerService = inject(ScreenerService);
  private readonly marketService = inject(MarketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly screenerName = signal('');
  public readonly query = signal('');
  public readonly loading = signal(true);
  public readonly notFound = signal(false);

  public readonly previewResults = signal<EnrichedScreenerResult[]>([]);
  public readonly previewTotal = signal(0);
  public readonly previewLoading = signal(false);
  public readonly loadingMore = signal(false);
  public readonly previewError = signal('');

  public readonly searchQuery = signal('');
  public readonly sortBy = signal<ScreenerSortType>(ScreenerSortType.NAME);
  public readonly sortOrder = signal<ScreenerSortOrder>(ScreenerSortOrder.ASC);
  public readonly filter = signal<ScreenerFilter>(ScreenerFilter.NONE);
  public readonly showSortMenu = signal(false);
  public readonly showFilterMenu = signal(false);

  public readonly Routes = Constants.routes;
  public readonly ScreenerSortType = ScreenerSortType;
  public readonly ScreenerSortOrder = ScreenerSortOrder;
  public readonly ScreenerFilter = ScreenerFilter;
  public readonly Direction = Direction;

  private currentQuery = '';
  private currentPage = 0;
  private readonly loadedPages = new Set<number>();

  public readonly hasMore = computed(
    () => this.previewResults().length < this.previewTotal(),
  );

  public readonly filteredResults = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const f = this.filter();
    const sortKey = this.sortBy();
    const order = this.sortOrder() === ScreenerSortOrder.ASC ? 1 : -1;

    const list = this.previewResults().filter((r) => {
      const name = (r.liveData?.name || r.assetName || '').toLowerCase();
      if (q && !name.includes(q)) return false;

      const change = r.liveData?.quote?.nse?.change;
      const exchange = this.getExchange(r).toLowerCase();

      switch (f) {
        case ScreenerFilter.GAINERS:
          return change?.direction === Direction.UP;
        case ScreenerFilter.LOSERS:
          return change?.direction === Direction.DOWN;
        case ScreenerFilter.NSE:
          return exchange === ExchangeName.NSE;
        case ScreenerFilter.BSE:
          return exchange === ExchangeName.BSE;
        default:
          return true;
      }
    });

    return [...list].sort((a, b) => {
      const aData = a.liveData;
      const bData = b.liveData;
      const dir = order;

      switch (sortKey) {
        case ScreenerSortType.NAME: {
          const an = aData?.name || a.assetName || '';
          const bn = bData?.name || b.assetName || '';
          return dir * an.localeCompare(bn);
        }
        case ScreenerSortType.CHANGE_PERCENTAGE:
          return (
            dir *
            ((aData?.quote?.nse?.change?.percentage || 0) -
              (bData?.quote?.nse?.change?.percentage || 0))
          );
        case ScreenerSortType.CHANGE_VALUE:
          return (
            dir *
            ((aData?.quote?.nse?.change?.value || 0) -
              (bData?.quote?.nse?.change?.value || 0))
          );
        case ScreenerSortType.PRICE:
          return (
            dir *
            ((aData?.quote?.nse?.price || 0) - (bData?.quote?.nse?.price || 0))
          );
        case ScreenerSortType.VOLUME:
          return (
            dir *
            ((aData?.quote?.nse?.volume || 0) -
              (bData?.quote?.nse?.volume || 0))
          );
        default:
          return 0;
      }
    });
  });

  constructor() {
    toObservable(this.searchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
      )
      .subscribe(() => this.syncQueryParams());

    this.restoreFromQueryParams();
  }

  public ngOnInit(): void {
    const sid = this.id();
    if (!sid) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.screenerService
      .getScreener$(sid)
      .pipe(untilDestroyed(this))
      .subscribe((s) => {
        if (!s) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.screenerName.set(s.name);
        this.query.set(s.query);
        this.loading.set(false);
        this.resetAndLoad(s.query);
      });
  }

  private resetAndLoad(query: string): void {
    this.currentQuery = query;
    this.currentPage = 0;
    this.loadedPages.clear();
    this.previewResults.set([]);
    this.previewTotal.set(0);
    this.previewError.set('');
    this.loadPage(1);
  }

  private loadPage(pageNo: number): void {
    if (!this.currentQuery) return;
    if (this.previewLoading() || this.loadingMore()) return;
    if (this.loadedPages.has(pageNo)) return;
    if (
      this.previewTotal() > 0 &&
      (pageNo - 1) * PAGE_SIZE >= this.previewTotal()
    ) {
      return;
    }

    const isFirst = pageNo === 1;
    if (isFirst) {
      this.previewLoading.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.previewError.set('');

    this.screenerService
      .preview(this.currentQuery, { pagesize: PAGE_SIZE, pageno: pageNo })
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (res) => {
          this.loadedPages.add(pageNo);
          this.currentPage = Math.max(this.currentPage, pageNo);
          this.previewTotal.set(res.totalRecords);
          const enriched: EnrichedScreenerResult[] = res.results.map((r) => ({
            ...r,
          }));
          this.previewResults.update((all) => [...all, ...enriched]);
          if (isFirst) {
            this.previewLoading.set(false);
          } else {
            this.loadingMore.set(false);
          }
          this.cdr.markForCheck();
          void this.enrichWithLiveData(enriched);
        },
        error: (err: unknown) => {
          const msg =
            (err as { message?: string })?.message ?? 'Failed to load preview';
          this.previewError.set(String(msg));
          this.previewLoading.set(false);
          this.loadingMore.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private async enrichWithLiveData(
    rows: EnrichedScreenerResult[],
  ): Promise<void> {
    const ids = rows.map((r) => r.assetId).filter(Boolean);
    if (ids.length === 0) return;
    try {
      const live = await firstValueFrom(
        this.marketService.getStocks(ids).pipe(take(1)),
      );
      if (!live || live.length === 0) return;
      const map = new Map(
        live.flatMap((s) => {
          const key = s.vendorCode?.etm?.primary;
          return key ? [[key, s]] : [];
        }),
      );
      if (map.size === 0) return;
      this.previewResults.update((all) =>
        all.map((r) => {
          const ld = map.get(r.assetId);
          return ld ? { ...r, liveData: ld } : r;
        }),
      );
      this.cdr.markForCheck();
    } catch {
      // Live enrichment is best-effort; preview data remains usable.
    }
  }

  public loadMore(): void {
    if (this.previewLoading() || this.loadingMore()) return;
    if (!this.hasMore()) return;
    this.loadPage(this.currentPage + 1);
  }

  public onScrolled(index: number): void {
    const len = this.filteredResults().length;
    if (len === 0) return;
    if (index + SCROLL_THRESHOLD >= len) {
      this.loadMore();
    }
  }

  public edit(): void {
    const sid = this.id();
    if (!sid) return;
    this.router.navigate(['/', Constants.routes.SCREENER, 'edit', sid]);
  }

  public setSort(type: ScreenerSortType, order: ScreenerSortOrder): void {
    this.sortBy.set(type);
    this.sortOrder.set(order);
    this.showSortMenu.set(false);
    this.syncQueryParams();
  }

  public setFilter(filter: ScreenerFilter): void {
    this.filter.set(filter);
    this.showFilterMenu.set(false);
    this.syncQueryParams();
  }

  public clearFiltersAndSort(): void {
    if (
      this.sortBy() !== ScreenerSortType.NAME ||
      this.sortOrder() !== ScreenerSortOrder.ASC ||
      this.filter() !== ScreenerFilter.NONE ||
      this.searchQuery()
    ) {
      this.sortBy.set(ScreenerSortType.NAME);
      this.sortOrder.set(ScreenerSortOrder.ASC);
      this.filter.set(ScreenerFilter.NONE);
      this.searchQuery.set('');
      this.showSortMenu.set(false);
      this.showFilterMenu.set(false);
      this.syncQueryParams();
    }
  }

  public getExchange(row: EnrichedScreenerResult): string {
    if (row.liveData?.scripCode?.nse) return ExchangeName.NSE;
    if (row.liveData?.scripCode?.bse) return ExchangeName.BSE;
    return '';
  }

  public displayName(row: EnrichedScreenerResult): string {
    return row.liveData?.name || row.assetName || '';
  }

  public trackByAssetId(index: number, row: EnrichedScreenerResult): string {
    return row.assetId || `${index}`;
  }

  public openResult(row: EnrichedScreenerResult): void {
    if (!row.assetId) return;
    this.router.navigate(['/', Constants.routes.STOCKS, row.assetId]);
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortBy = params.get('sortBy') as ScreenerSortType | null;
    const sortOrder = params.get('sortOrder') as ScreenerSortOrder | null;
    if (
      sortBy &&
      sortOrder &&
      Object.values(ScreenerSortType).includes(sortBy) &&
      Object.values(ScreenerSortOrder).includes(sortOrder)
    ) {
      this.sortBy.set(sortBy);
      this.sortOrder.set(sortOrder);
    }
    const filter = params.get('filter') as ScreenerFilter | null;
    if (filter && Object.values(ScreenerFilter).includes(filter)) {
      this.filter.set(filter);
    }
    const search = params.get('search');
    if (search) this.searchQuery.set(search);
  }

  private syncQueryParams(): void {
    const qp: Record<string, string> = {};
    if (
      this.sortBy() !== ScreenerSortType.NAME ||
      this.sortOrder() !== ScreenerSortOrder.ASC
    ) {
      qp['sortBy'] = this.sortBy();
      qp['sortOrder'] = this.sortOrder();
    }
    if (this.filter() !== ScreenerFilter.NONE) qp['filter'] = this.filter();
    if (this.searchQuery()) qp['search'] = this.searchQuery();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
    });
  }

  public onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const sortEl = document.getElementById('detailSortButton');
    const sortMenu = document.getElementById('detailSortMenu');
    const filterEl = document.getElementById('detailFilterButton');
    const filterMenu = document.getElementById('detailFilterMenu');
    if (
      this.showSortMenu() &&
      sortEl &&
      sortMenu &&
      !sortEl.contains(target) &&
      !sortMenu.contains(target)
    ) {
      this.showSortMenu.set(false);
    }
    if (
      this.showFilterMenu() &&
      filterEl &&
      filterMenu &&
      !filterEl.contains(target) &&
      !filterMenu.contains(target)
    ) {
      this.showFilterMenu.set(false);
    }
  }
}
