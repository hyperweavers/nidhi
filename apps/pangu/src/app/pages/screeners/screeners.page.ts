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
import { Screener } from '../../models/screener';
import { ScreenerService } from '../../services/screener.service';

export enum ScreenersSortType {
  NAME = 'name',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum ScreenersSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

@UntilDestroy()
@Component({
  selector: 'app-screeners',
  imports: [CommonModule, FormsModule],
  templateUrl: './screeners.page.html',
  styleUrl: './screeners.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenersPage implements AfterViewInit {
  private readonly screenerService = inject(ScreenerService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private sortDropdown?: Dropdown;

  public readonly screeners = signal<Screener[]>([]);
  public readonly loading = signal(true);

  public readonly searchQuery = signal('');
  public readonly sortBy = signal<ScreenersSortType>(ScreenersSortType.NAME);
  public readonly sortOrder = signal<ScreenersSortOrder>(
    ScreenersSortOrder.ASC,
  );

  public readonly showDeleteConfirm = signal(false);
  public readonly deleteTarget = signal<Screener | undefined>(undefined);

  public readonly Routes = Constants.routes;
  public readonly ScreenersSortType = ScreenersSortType;
  public readonly ScreenersSortOrder = ScreenersSortOrder;

  public readonly filteredScreeners = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.screeners().filter(
      (s) => !q || s.name.toLowerCase().includes(q),
    );

    const sortKey = this.sortBy();
    const dir = this.sortOrder() === ScreenersSortOrder.ASC ? 1 : -1;

    return [...list].sort((a, b) => {
      const aFav = a.isFavorite ? 1 : 0;
      const bFav = b.isFavorite ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      switch (sortKey) {
        case ScreenersSortType.CREATED_AT:
          return dir * ((a.createdAt || 0) - (b.createdAt || 0));
        case ScreenersSortType.UPDATED_AT:
          return dir * ((a.updatedAt || 0) - (b.updatedAt || 0));
        default:
          return dir * a.name.localeCompare(b.name);
      }
    });
  });

  constructor() {
    this.screenerService.screeners$
      .pipe(untilDestroyed(this))
      .subscribe((list) => {
        this.screeners.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      });

    toObservable(this.searchQuery)
      .pipe(
        untilDestroyed(this),
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
      )
      .subscribe(() => this.syncQueryParams());

    this.restoreFromQueryParams();
  }

  public openScreener(s: Screener): void {
    this.router.navigate(['/', Constants.routes.SCREENER, s.id]);
  }

  public editScreener(s: Screener, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/', Constants.routes.SCREENER, 'edit', s.id]);
  }

  public async toggleFavorite(s: Screener, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      await this.screenerService.setFavorite(s.id, !s.isFavorite);
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    }
  }

  public openDeleteConfirm(s: Screener, event?: Event): void {
    event?.stopPropagation();
    this.deleteTarget.set(s);
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
      await this.screenerService.deleteScreener(target.id);
      this.toastService.show('Screener deleted');
    } catch (e) {
      this.toastService.show((e as Error).message, ToastType.ERROR);
    } finally {
      this.closeDeleteConfirm();
    }
  }

  public ngAfterViewInit(): void {
    setTimeout(
      () => this.initFlowbiteInstances(),
      Constants.configs.defaults.FLOWBITE_INITIALIZATION_DELAY,
    );
  }

  public setSort(type: ScreenersSortType, order: ScreenersSortOrder): void {
    this.sortBy.set(type);
    this.sortOrder.set(order);
    this.syncQueryParams();
    this.sortDropdown?.hide();
  }

  public clearFiltersAndSort(): void {
    if (
      this.sortBy() !== ScreenersSortType.NAME ||
      this.sortOrder() !== ScreenersSortOrder.ASC ||
      this.searchQuery()
    ) {
      this.sortBy.set(ScreenersSortType.NAME);
      this.sortOrder.set(ScreenersSortOrder.ASC);
      this.searchQuery.set('');
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });

      this.sortDropdown?.hide();
    }
  }

  public formatDate(epoch: number | undefined): string {
    if (!epoch) return '--';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatToParts(new Date(epoch));
    const get = (type: string): string =>
      parts.find((p) => p.type === type)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')}`;
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortBy = params.get('sortBy') as ScreenersSortType | null;
    const sortOrder = params.get('sortOrder') as ScreenersSortOrder | null;
    if (
      sortBy &&
      sortOrder &&
      Object.values(ScreenersSortType).includes(sortBy) &&
      Object.values(ScreenersSortOrder).includes(sortOrder)
    ) {
      this.sortBy.set(sortBy);
      this.sortOrder.set(sortOrder);
    }
    const search = params.get('search');
    if (search) this.searchQuery.set(search);
  }

  private syncQueryParams(): void {
    const qp: Record<string, string> = {};
    if (
      this.sortBy() !== ScreenersSortType.NAME ||
      this.sortOrder() !== ScreenersSortOrder.ASC
    ) {
      qp['sortBy'] = this.sortBy();
      qp['sortOrder'] = this.sortOrder();
    }
    if (this.searchQuery()) qp['search'] = this.searchQuery();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      replaceUrl: true,
    });
  }

  private initFlowbiteInstances(): void {
    const sortEl = document.getElementById('screenersSortDropdown');
    const sortBtn = document.getElementById('screenersSortDropdownButton');
    if (sortBtn && sortEl) {
      this.sortDropdown = new Dropdown(sortEl, sortBtn);
    }
  }
}
