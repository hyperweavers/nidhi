import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  of,
  share,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Constants } from '../../constants';
import { Flowbite } from '../../decorators/flowbite.decorator';
import { DrawerClosedDirective } from '../../directives/drawer-closed/drawer-closed.directive';
import { Direction } from '../../models/market';
import { Holding, Portfolio, TransactionType } from '../../models/portfolio';
import { Stock } from '../../models/stock';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
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

@Flowbite()
@Component({
  selector: 'app-portfolio',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DrawerClosedDirective,
    ValueOrPlaceholderPipe,
  ],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage implements AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);
  private readonly marketService = inject(MarketService);

  private readonly transactionDateInputRef = viewChild<ElementRef>(
    'transactionDateInput',
  );

  public portfolio$: Observable<Portfolio>;
  public stockSearchResults$: Observable<Stock[]>;

  private portfolioSearchQuery$: Observable<string>;

  private portfolioFilter$ = new BehaviorSubject<PortfolioFilter>(
    PortfolioFilter.NONE,
  );
  private portfolioSort$ = new BehaviorSubject<
    [PortfolioSortType, PortfolioSortOrder]
  >([PortfolioSortType.DAY_PROFIT_LOSS, PortfolioSortOrder.DSC]);

  public readonly Routes = Constants.routes;
  public readonly Direction = Direction;
  public readonly TransactionType = TransactionType;
  public readonly PortfolioFilter = PortfolioFilter;
  public readonly PortfolioSortType = PortfolioSortType;
  public readonly PortfolioSortOrder = PortfolioSortOrder;

  public readonly portfolioSearchQuery = signal('');

  public readonly name = signal('');
  public readonly date = signal('');
  public readonly price = signal(0);
  public readonly quantity = signal(0);
  public readonly charges = signal(0);
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

  constructor() {
    const portfolioService = inject(PortfolioService);

    this.portfolioSearchQuery$ = toObservable(this.portfolioSearchQuery).pipe(
      debounceTime(200),
      distinctUntilChanged(),
    );

    this.portfolio$ = combineLatest([
      portfolioService.portfolio$,
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
                return holding.quote?.nse?.change?.direction === Direction.UP;

              case PortfolioFilter.DAY_LOSERS:
                return holding.quote?.nse?.change?.direction === Direction.DOWN;

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
                  ? (h1.quote?.nse?.change?.percentage || 0) -
                      (h2.quote?.nse?.change?.percentage || 0)
                  : (h2.quote?.nse?.change?.percentage || 0) -
                      (h1.quote?.nse?.change?.percentage || 0);

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
      debounceTime(500), // TODO: Review the time
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
          portfolioService.portfolio$.pipe(
            map((portfolio) =>
              portfolio.holdings.filter(
                (holding) =>
                  holding.quantity &&
                  holding.quantity > 0 &&
                  holding.name.toLowerCase().includes(query.toLowerCase()),
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

  public ngAfterViewInit(): void {
    this.initDatePicker();

    setTimeout(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.sortDropdown = (window as any).FlowbiteInstances.getInstance(
          'Dropdown',
          'sortDropdown',
        )),
      200,
    );

    setTimeout(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.filterDropdown = (window as any).FlowbiteInstances.getInstance(
          'Dropdown',
          'filterDropdown',
        )),
      200,
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
      // TODO: Catch storage exceptions in main pages (import, export, date, profile, ...)
    }
  }

  public openAddTransactionDrawer(type: TransactionType): void {
    this.transactionType = type;
  }

  public selectStock(stock: Stock | Holding): void {
    if (!stock.scripCode.isin) {
      this.marketService
        .getStock(stock.vendorCode.etm.primary, true)
        .pipe(
          switchMap((stockDetails) => {
            if (
              stockDetails &&
              (stockDetails.scripCode.nse || stockDetails.scripCode.bse)
            ) {
              return this.marketService
                .searchSecondary(
                  stockDetails.scripCode.nse ||
                    stockDetails.scripCode.bse ||
                    '',
                )
                .pipe(
                  map((searchResults) => {
                    if (searchResults.length > 0) {
                      const stockDetailsSecondary = searchResults.find(
                        (result) =>
                          (result.scripCode.isin &&
                            result.scripCode.isin ===
                              stockDetails.scripCode.isin) ||
                          (result.scripCode.nse &&
                            result.scripCode.nse ===
                              stockDetails.scripCode.nse) ||
                          (result.scripCode.bse &&
                            result.scripCode.bse ===
                              stockDetails.scripCode.bse),
                      );

                      return stockDetailsSecondary
                        ? {
                            ...stockDetails,
                            vendorCode: {
                              ...stockDetails.vendorCode,
                              mc: stockDetailsSecondary.vendorCode.mc,
                            },
                          }
                        : stockDetails;
                    } else {
                      return stockDetails;
                    }
                  }),
                );
            } else {
              return of(null);
            }
          }),
          take(1),
        )
        .subscribe((combinedStockDetails) => {
          if (combinedStockDetails) {
            this.selectedStock = {
              ...stock,
              scripCode: combinedStockDetails.scripCode,
              vendorCode: {
                ...stock.vendorCode,
                mc: combinedStockDetails.vendorCode.mc,
              },
            };

            this.name.set(stock.name);
          } else {
            this.showTransactionFormError(
              'Unable to get the details of the selected stock!',
            );
          }
        });
    } else {
      this.selectedStock = stock;

      this.name.set(stock.name);
    }

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

    this.datepicker?.hide();
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

  private resetDatepicker(): void {
    this.datepicker?.setDate(Date.now(), { clear: true });
  }

  private initDatePicker(): void {
    const transactionDateInputRef = this.transactionDateInputRef();
    if (transactionDateInputRef) {
      this.datepicker = new Datepicker(transactionDateInputRef.nativeElement, {
        autohide: true,
        format: 'dd/mm/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        todayHighlight: true,
        maxDate: Date.now(),
      });

      transactionDateInputRef.nativeElement.addEventListener(
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
