import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Dropdown } from 'flowbite';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  share,
} from 'rxjs';

import { TransactionDrawerComponent } from '../../components/transaction-drawer/transaction-drawer.component';
import { Flowbite } from '../../decorators/flowbite.decorator';
import {
  Holding,
  TransactionEditContext,
  TransactionType,
} from '../../models/portfolio';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { StorageService } from '../../services/core/storage.service';

export interface TransactionItem {
  transactionId: string;
  holdingId: string;
  stockName: string;
  type: TransactionType;
  date: number;
  quantity: number;
  price: number;
  charges?: number;
}

enum TransactionFilter {
  ALL = 'all',
  BUY = 'buy',
  SELL = 'sell',
}

export enum TransactionSortType {
  NAME = 'name',
  DATE = 'date',
}

enum TransactionSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

@Flowbite()
@Component({
  selector: 'app-transactions',
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    ValueOrPlaceholderPipe,
    TransactionDrawerComponent,
  ],
  templateUrl: './transactions.page.html',
  styleUrl: './transactions.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage implements AfterViewInit {
  private readonly storageService = inject(StorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly searchQuery$: Observable<string>;
  private readonly filter$ = new BehaviorSubject<TransactionFilter>(
    TransactionFilter.ALL,
  );
  private readonly sort$ = new BehaviorSubject<
    [TransactionSortType, TransactionSortOrder]
  >([TransactionSortType.DATE, TransactionSortOrder.DSC]);

  public readonly TransactionsFilter = TransactionFilter;
  public readonly TransactionSortType = TransactionSortType;
  public readonly TransactionSortOrder = TransactionSortOrder;
  public readonly TransactionType = TransactionType;

  public readonly searchQuery = signal('');

  public transactions$: Observable<TransactionItem[]>;

  public readonly editDrawerOpen = signal(false);
  public readonly editContext = signal<TransactionEditContext | undefined>(
    undefined,
  );

  public showDeleteModal?: boolean;
  public deleteTarget?: { holdingId: string; transactionId: string };

  private sortDropdown?: Dropdown;
  private filterDropdown?: Dropdown;

  constructor() {
    this.searchQuery$ = toObservable(this.searchQuery).pipe(
      debounceTime(200),
      distinctUntilChanged(),
    );

    // Flatten all holdings' transactions into a flat list
    const allTransactions$ = from(this.storageService.stocks$).pipe(
      map((holdings: Holding[]) =>
        holdings.flatMap((holding) =>
          (holding.transactions || []).map((t) => ({
            transactionId: t.id,
            holdingId: holding.id ?? '',
            stockName: holding.name,
            type: t.type,
            date: t.date,
            quantity: t.quantity,
            price: t.price,
            charges: t.charges,
          })),
        ),
      ),
    );

    this.transactions$ = combineLatest([
      allTransactions$,
      this.filter$,
      this.sort$,
      this.searchQuery$,
    ]).pipe(
      map(([items, filter, [sortType, sortOrder], query]) =>
        items
          .filter((item) => {
            if (filter === TransactionFilter.BUY) {
              return item.type === TransactionType.BUY;
            }
            if (filter === TransactionFilter.SELL) {
              return item.type === TransactionType.SELL;
            }
            return true;
          })
          .filter((item) =>
            item.stockName.toLowerCase().includes(query.toLowerCase()),
          )
          .sort((a, b) => {
            switch (sortType) {
              case TransactionSortType.NAME:
                return sortOrder === TransactionSortOrder.ASC
                  ? a.stockName.localeCompare(b.stockName)
                  : b.stockName.localeCompare(a.stockName);

              case TransactionSortType.DATE:
                return sortOrder === TransactionSortOrder.ASC
                  ? a.date - b.date
                  : b.date - a.date;

              default:
                return 0;
            }
          }),
      ),
      share(),
    );

    this.restoreFromQueryParams();
  }

  public ngAfterViewInit(): void {
    setTimeout(
      () =>
        (this.sortDropdown = (
          window as unknown as {
            FlowbiteInstances: {
              getInstance: (type: string, id: string) => Dropdown;
            };
          }
        ).FlowbiteInstances.getInstance(
          'Dropdown',
          'transactionsSortDropdown',
        )),
      200,
    );

    setTimeout(
      () =>
        (this.filterDropdown = (
          window as unknown as {
            FlowbiteInstances: {
              getInstance: (type: string, id: string) => Dropdown;
            };
          }
        ).FlowbiteInstances.getInstance(
          'Dropdown',
          'transactionsFilterDropdown',
        )),
      200,
    );
  }

  public filterTransactions(filter: TransactionFilter): void {
    this.filter$.next(filter);
    this.syncQueryParams();
    this.filterDropdown?.hide();
  }

  public clearFilter(): void {
    this.filter$.next(TransactionFilter.ALL);
    this.syncQueryParams();
    this.filterDropdown?.hide();
  }

  public sortTransactions(
    type: TransactionSortType,
    order: TransactionSortOrder,
  ): void {
    this.sort$.next([type, order]);
    this.syncQueryParams();
    this.sortDropdown?.hide();
  }

  public clearFiltersAndSort(): void {
    const [sortType, sortOrder] = this.sort$.getValue();
    const filter = this.filter$.getValue();

    if (
      sortType !== TransactionSortType.DATE ||
      sortOrder !== TransactionSortOrder.DSC ||
      filter !== TransactionFilter.ALL
    ) {
      this.filter$.next(TransactionFilter.ALL);
      this.sort$.next([TransactionSortType.DATE, TransactionSortOrder.DSC]);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });

      this.sortDropdown?.hide();
      this.filterDropdown?.hide();
    }
  }

  public openEditDrawer(item: TransactionItem): void {
    this.editContext.set({
      transaction: {
        id: item.transactionId,
        type: item.type,
        date: item.date,
        quantity: item.quantity,
        price: item.price,
        charges: item.charges,
      },
      holdingId: item.holdingId,
      holdingName: item.stockName,
    });
    this.editDrawerOpen.set(true);
  }

  public onEditSaved(): void {
    this.editDrawerOpen.set(false);
    this.editContext.set(undefined);
  }

  public onEditClosed(): void {
    this.editDrawerOpen.set(false);
    this.editContext.set(undefined);
  }

  public openDeleteConfirmation(
    holdingId: string,
    transactionId: string,
  ): void {
    this.deleteTarget = { holdingId, transactionId };
    this.showDeleteModal = true;
  }

  public async confirmDelete(): Promise<void> {
    if (this.deleteTarget) {
      await this.storageService.deleteTransaction(
        this.deleteTarget.holdingId,
        this.deleteTarget.transactionId,
      );

      this.cancelDelete();
    }
  }

  public cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteTarget = undefined;
  }

  public formatDate(epoch: number): string {
    const date = new Date(epoch);

    return epoch && date
      ? `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
      : '';
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortType = params.get('sortType') as TransactionSortType | null;
    const sortOrder = params.get('sortOrder') as TransactionSortOrder | null;

    if (
      sortType &&
      sortOrder &&
      Object.values(TransactionSortType).includes(sortType) &&
      Object.values(TransactionSortOrder).includes(sortOrder)
    ) {
      this.sort$.next([sortType, sortOrder]);
    }

    const filter = params.get('filter') as TransactionFilter | null;

    if (filter && Object.values(TransactionFilter).includes(filter)) {
      this.filter$.next(filter);
    }

    const search = params.get('search');

    if (search) {
      this.searchQuery.set(search);
    }
  }

  private syncQueryParams(): void {
    const [sortType, sortOrder] = this.sort$.getValue();
    const filter = this.filter$.getValue();
    const search = this.searchQuery();
    const queryParams: Record<string, string> = {};

    if (
      sortType !== TransactionSortType.DATE ||
      sortOrder !== TransactionSortOrder.DSC
    ) {
      queryParams['sortType'] = sortType;
      queryParams['sortOrder'] = sortOrder;
    }

    if (filter !== TransactionFilter.ALL) {
      queryParams['filter'] = filter;
    }

    if (search) {
      queryParams['search'] = search;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }
}
