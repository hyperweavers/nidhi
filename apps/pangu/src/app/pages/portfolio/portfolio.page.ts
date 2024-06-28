import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Dropdown } from 'flowbite';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  iif,
  map,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { DrawerClosedDirective } from '../../directives/drawer-closed/drawer-closed.directive';
import { Holding, Portfolio, TransactionType } from '../../models/portfolio';
import { Direction, Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

enum PortfolioFilter {
  NONE,
  DAY_GAINERS,
  DAY_LOSERS,
  OVERALL_GAINERS,
  OVERALL_LOSERS,
}

enum PortfolioSortType {
  NAME,
  DAY_PROFIT_LOSS,
  OVERALL_PROFIT_LOSS,
}

enum PortfolioSortOrder {
  ASC,
  DSC,
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawerClosedDirective],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage implements OnInit {
  @ViewChild('transactionDateInput', { static: true })
  private transactionDateInput?: ElementRef;

  public portfolio$: Observable<Portfolio>;
  public stockSearchResults$: Observable<Stock[]>;

  private portfolioSearchQuery$: Observable<string>;

  private portfolioFilter$ = new BehaviorSubject<PortfolioFilter>(
    PortfolioFilter.NONE,
  );
  private portfolioSort$ = new BehaviorSubject<
    [PortfolioSortType, PortfolioSortOrder]
  >([PortfolioSortType.DAY_PROFIT_LOSS, PortfolioSortOrder.DSC]);

  public readonly Direction = Direction;
  public readonly TransactionType = TransactionType;
  public readonly PortfolioFilter = PortfolioFilter;
  public readonly PortfolioSortType = PortfolioSortType;
  public readonly PortfolioSortOrder = PortfolioSortOrder;

  public portfolioSearchQuery = signal('');

  public name = signal('');
  public date = signal('');
  public price = signal(0);
  public quantity = signal(0);
  public charges = signal(0);
  public readonly gross = computed(() => this.price() * this.quantity());
  public readonly net = computed(() => this.gross() + this.charges());

  public transactionType?: TransactionType;
  public showSearchResults?: boolean;
  public showStatusModal?: boolean;
  public showTransactionProgress?: boolean;
  public transactionFormError?: string;

  private selectedStock?: Stock | Holding;
  private sortDropdown?: Dropdown;
  private filterDropdown?: Dropdown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private portfolioService: PortfolioService,
    private marketService: MarketService,
    private storageService: StorageService,
  ) {
    this.portfolioSearchQuery$ = toObservable(this.portfolioSearchQuery).pipe(
      debounceTime(200),
      distinctUntilChanged(),
    );

    this.portfolio$ = combineLatest([
      this.portfolioService.portfolio$,
      this.portfolioFilter$,
      this.portfolioSort$,
      this.portfolioSearchQuery$,
    ]).pipe(
      map(([portfolio, filter, [type, order], query]) => ({
        ...portfolio,
        holdings: portfolio.holdings
          .filter(
            (holding) =>
              holding.quantity &&
              holding.quantity > 0 &&
              holding.name.toLowerCase().includes(query.toLowerCase()),
          )
          .filter((holding) => {
            switch (filter) {
              case PortfolioFilter.DAY_GAINERS:
                return holding.quote?.change?.direction === Direction.UP;

              case PortfolioFilter.DAY_LOSERS:
                return holding.quote?.change?.direction === Direction.DOWN;

              case PortfolioFilter.OVERALL_GAINERS:
                return holding.totalProfitLoss?.direction === Direction.UP;

              case PortfolioFilter.OVERALL_LOSERS:
                return holding.totalProfitLoss?.direction === Direction.DOWN;

              default:
                return true;
            }
          })
          .sort((h1, h2) => {
            switch (type) {
              case PortfolioSortType.NAME:
                return order === PortfolioSortOrder.ASC
                  ? h1.name.localeCompare(h2.name)
                  : h2.name.localeCompare(h1.name);

              case PortfolioSortType.DAY_PROFIT_LOSS:
                return order === PortfolioSortOrder.ASC
                  ? (h1.quote?.change?.percentage || 0) -
                      (h2.quote?.change?.percentage || 0)
                  : (h2.quote?.change?.percentage || 0) -
                      (h1.quote?.change?.percentage || 0);

              case PortfolioSortType.OVERALL_PROFIT_LOSS:
                return order === PortfolioSortOrder.ASC
                  ? (h1.totalProfitLoss?.percentage || 0) -
                      (h2.totalProfitLoss?.percentage || 0)
                  : (h2.totalProfitLoss?.percentage || 0) -
                      (h1.totalProfitLoss?.percentage || 0);
            }
          }),
      })),
      share(),
    );

    this.stockSearchResults$ = toObservable(this.name).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap((query) => {
        this.showSearchResults = false;

        if (query !== this.selectedStock?.name) {
          this.selectedStock = undefined;
        }
      }),
      filter((query) => query.length > 2 && query !== this.selectedStock?.name),
      switchMap((query) =>
        iif(
          () => this.transactionType === TransactionType.BUY,
          this.marketService.search(query),
          this.portfolioService.portfolio$.pipe(
            map((portfolio) =>
              portfolio.holdings.filter(
                (holding) =>
                  (holding.quantity &&
                    holding.quantity > 0 &&
                    holding.name.toLowerCase().includes(query.toLowerCase())) ||
                  holding.scripCode.nse
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              ),
            ),
          ),
        ),
      ),
      tap(() => {
        this.showSearchResults = true;
      }),
    );
  }

  public ngOnInit(): void {
    this.initDatePicker();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.sortDropdown = (window as any).FlowbiteInstances.getInstance(
      'Dropdown',
      'sortDropdown',
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.filterDropdown = (window as any).FlowbiteInstances.getInstance(
      'Dropdown',
      'filterDropdown',
    );
  }

  public async addTransaction(): Promise<void> {
    if (
      this.selectedStock &&
      this.transactionType &&
      this.date() &&
      this.price() > 0 &&
      this.quantity() > 0 &&
      (!this.charges() || this.charges() > 0)
    ) {
      const dateFragments = this.date().split('/');
      const date = new Date(
        `${dateFragments[2]}/${dateFragments[1]}/${dateFragments[0]}`,
      );

      if (date < new Date()) {
        this.showTransactionProgress = true;

        const transaction = {
          id: uuid(),
          type: this.transactionType,
          date: date.getTime(),
          price: this.price(),
          quantity: this.quantity(),
          charges: this.charges(),
        };

        await this.storageService.addOrUpdate(this.selectedStock, transaction);

        this.resetTransactionForm();

        this.showTransactionProgress = false;
        this.showStatusModal = true;
      } else {
        this.showTransactionFormError('Date is in future!');
      }
    } else {
      this.showTransactionFormError(
        'One or more field(s) containing invalid value(s)!',
      );

      console.log(
        this.selectedStock,
        this.transactionType,
        this.date(),
        this.price(),
        this.quantity(),
        this.charges(),
      );
      // TODO: Catch storage exceptions in main pages (import, export, date, profile, ...)
    }
  }

  public openAddTransactionDrawer(type: TransactionType): void {
    this.transactionType = type;
  }

  public selectStock(stock: Stock | Holding): void {
    this.selectedStock = stock;

    this.name.set(stock.name);

    this.showSearchResults = false;
  }

  public resetTransactionForm(): void {
    this.selectedStock = undefined;

    this.showSearchResults = false;

    this.name.set('');
    this.date.set(this.datepicker?.getDate('dd/mm/yyyy') || '');
    this.price.set(0);
    this.quantity.set(0);
    this.charges.set(0);

    this.resetDatepicker();
  }

  public closeStatusModal(retainTransactionType?: boolean): void {
    this.showStatusModal = false;

    if (!retainTransactionType) {
      this.transactionType = undefined;
    }
  }

  public filterPortfolio(filter: PortfolioFilter): void {
    this.portfolioFilter$.next(filter);

    if (this.filterDropdown) {
      this.filterDropdown.hide();
    }
  }

  public clearPortfolioFilters(): void {
    this.portfolioFilter$.next(PortfolioFilter.NONE);

    if (this.filterDropdown) {
      this.filterDropdown.hide();
    }
  }

  public sortPortfolio(
    type: PortfolioSortType,
    order: PortfolioSortOrder,
  ): void {
    this.portfolioSort$.next([type, order]);

    if (this.sortDropdown) {
      this.sortDropdown.hide();
    }
  }

  private showTransactionFormError(message: string): void {
    this.transactionFormError = message;

    setTimeout(() => {
      this.transactionFormError = '';

      this.cdr.markForCheck();
    }, 2000);
  }

  private resetDatepicker() {
    this.datepicker?.setDate(Date.now(), { clear: true });
  }

  private initDatePicker(): void {
    if (this.transactionDateInput) {
      this.datepicker = new Datepicker(
        this.transactionDateInput.nativeElement,
        {
          autohide: true,
          format: 'dd/mm/yyyy',
          todayBtn: true,
          clearBtn: true,
          todayBtnMode: 1,
          todayHighlight: true,
          maxDate: Date.now(),
        },
      );

      this.transactionDateInput.nativeElement.addEventListener(
        'changeDate',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const value = e.target.value;

          this.date.set(value);
        },
      );

      this.resetDatepicker();
    }
  }
}
