import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ToastService } from '@nidhi/shared-toast';
import { firstValueFrom, take } from 'rxjs';

import { QueryBuilderComponent } from '../../components/query-builder/query-builder.component';
import { Constants } from '../../constants';
import { Direction, ExchangeName } from '../../models/market';
import { QueryChange, QueryGroupNode } from '../../models/query-builder';
import { Screener, ScreenerPreviewResult } from '../../models/screener';
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
  selector: 'app-add-screener',
  imports: [
    CommonModule,
    FormsModule,
    QueryBuilderComponent,
    ScrollingModule,
    ValueOrPlaceholderPipe,
  ],
  templateUrl: './add-screener.page.html',
  styleUrl: './add-screener.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class AddScreenerPage implements OnInit {
  public readonly id = input<string | undefined>(undefined);

  private readonly screenerService = inject(ScreenerService);
  private readonly marketService = inject(MarketService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly helpBox = viewChild<ElementRef>('helpBox');
  private readonly queryBuilder = viewChild(QueryBuilderComponent);

  public readonly properties = signal<string[]>([]);
  public readonly loading = signal(true);
  public readonly query = signal('');
  public readonly isValid = signal(false);
  public readonly showHelp = signal(false);

  public readonly screener = signal<Screener | undefined>(undefined);
  public readonly screenerLoading = signal(false);

  public readonly initialTree = computed<QueryGroupNode | null>(
    () => this.screener()?.queryTree ?? null,
  );

  public readonly pageTitle = computed(
    () => this.screener()?.name ?? 'Add New Screener',
  );

  // Name prompt for create mode
  public readonly showNamePrompt = signal(false);
  public readonly nameDraft = signal('');
  public readonly nameError = signal('');

  // Preview results
  public readonly previewResults = signal<EnrichedScreenerResult[]>([]);
  public readonly previewTotal = signal(0);
  public readonly previewLoading = signal(false);
  public readonly loadingMore = signal(false);
  public readonly previewError = signal('');
  public readonly hasPreviewed = signal(false);

  public readonly resultSearchQuery = signal('');
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

  private currentPreviewQuery = '';
  private currentPage = 0;
  private readonly loadedPages = new Set<number>();

  public readonly hasMore = computed(
    () => this.previewResults().length < this.previewTotal(),
  );

  public readonly filteredResults = computed(() => {
    const q = this.resultSearchQuery().toLowerCase();
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

  public ngOnInit(): void {
    this.screenerService
      .getProperties()
      .pipe(untilDestroyed(this))
      .subscribe((properties) => {
        this.properties.set(properties);
        this.loading.set(false);
      });

    // Load screener if edit mode
    const maybeId = this.id();
    if (maybeId) {
      this.screenerLoading.set(true);
      this.screenerService
        .getScreener$(maybeId)
        .pipe(untilDestroyed(this))
        .subscribe((s) => {
          if (s) {
            this.screener.set(s);
            // Query will be emitted via builder's initialTree effect; also set fallback.
            this.query.set(s.query);
            this.isValid.set(!!s.query.trim());
          }
          this.screenerLoading.set(false);
        });
    }
  }

  public onQueryChange(change: QueryChange): void {
    this.query.set(change.query);
    this.isValid.set(change.isValid);
  }

  public toggleHelp(): void {
    this.showHelp.update((v) => !v);
  }

  public closeHelp(): void {
    this.showHelp.set(false);
  }

  public onEscape(): void {
    this.closeHelp();
    if (this.showNamePrompt()) this.closeNamePrompt();
  }

  public onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (this.showHelp()) {
      const box = this.helpBox()?.nativeElement as HTMLElement | undefined;
      if (box && !box.contains(target)) {
        this.showHelp.set(false);
      }
    }

    const sortEl = document.getElementById('screenerSortButton');
    const sortMenu = document.getElementById('screenerSortMenu');
    const filterEl = document.getElementById('screenerFilterButton');
    const filterMenu = document.getElementById('screenerFilterMenu');

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

  public async copyQuery(): Promise<void> {
    const text = this.query();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard unavailable — the query text remains selectable.
    }
  }

  public save(): void {
    const q = this.query();
    if (!q || !this.isValid()) return;

    const editId = this.id();
    if (editId) {
      // Edit mode: save directly, no prompt
      this.screenerLoading.set(true);
      const tree = this.queryBuilder()?.root() ?? undefined;
      this.screenerService
        .updateScreener(editId, q, tree)
        .then(() => {
          this.toastService.show('Screener updated');
          this.router.navigate(['/', Constants.routes.SCREENER, editId]);
        })
        .catch((e: unknown) => {
          this.toastService.show((e as Error).message);
        })
        .finally(() => this.screenerLoading.set(false));
    } else {
      // Create mode: prompt for name
      this.nameDraft.set('');
      this.nameError.set('');
      this.showNamePrompt.set(true);
    }
  }

  public closeNamePrompt(): void {
    this.showNamePrompt.set(false);
    this.nameDraft.set('');
    this.nameError.set('');
  }

  public async confirmNamePrompt(): Promise<void> {
    const name = this.nameDraft().trim();
    if (!name) {
      this.nameError.set('Name is required!');
      return;
    }

    const q = this.query();
    const tree = this.queryBuilder()?.root() ?? undefined;

    try {
      const exists = await this.screenerService.screenerNameExists(name);
      if (exists) {
        this.nameError.set('A screener with this name already exists!');
        return;
      }

      const id = await this.screenerService.createScreener(name, q, tree);

      this.toastService.show('Screener saved');
      this.closeNamePrompt();
      this.router.navigate(['/', Constants.routes.SCREENER, id]);
    } catch (e: unknown) {
      this.nameError.set((e as Error).message);
    }
  }

  public preview(): void {
    const q = this.query();
    if (!q || !this.isValid()) return;

    this.currentPreviewQuery = q;
    this.currentPage = 0;
    this.loadedPages.clear();
    this.previewResults.set([]);
    this.previewTotal.set(0);
    this.previewError.set('');
    this.hasPreviewed.set(true);

    this.loadPage(1);
  }

  private loadPage(pageNo: number): void {
    if (!this.currentPreviewQuery) return;
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
      .preview(this.currentPreviewQuery, {
        pagesize: PAGE_SIZE,
        pageno: pageNo,
      })
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

  public setSort(type: ScreenerSortType, order: ScreenerSortOrder): void {
    this.sortBy.set(type);
    this.sortOrder.set(order);
    this.showSortMenu.set(false);
  }

  public setFilter(filter: ScreenerFilter): void {
    this.filter.set(filter);
    this.showFilterMenu.set(false);
  }

  public clearFiltersAndSort(): void {
    if (
      this.sortBy() !== ScreenerSortType.NAME ||
      this.sortOrder() !== ScreenerSortOrder.ASC ||
      this.filter() !== ScreenerFilter.NONE ||
      this.resultSearchQuery()
    ) {
      this.sortBy.set(ScreenerSortType.NAME);
      this.sortOrder.set(ScreenerSortOrder.ASC);
      this.filter.set(ScreenerFilter.NONE);
      this.resultSearchQuery.set('');
      this.showSortMenu.set(false);
      this.showFilterMenu.set(false);
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
}
