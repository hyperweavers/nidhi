import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  Observable,
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

import { StockSearchComponent } from '../../components/stock-search/stock-search.component';
import { Flowbite } from '../../decorators/flowbite.decorator';
import { DrawerClosedDirective } from '../../directives/drawer-closed/drawer-closed.directive';
import {
  Holding,
  TransactionEditContext,
  TransactionType,
} from '../../models/portfolio';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

@Flowbite()
@Component({
  selector: 'app-transaction-drawer',
  imports: [
    CommonModule,
    FormsModule,
    DrawerClosedDirective,
    StockSearchComponent,
  ],
  templateUrl: './transaction-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDrawerComponent implements AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);
  private readonly marketService = inject(MarketService);
  private readonly portfolioService = inject(PortfolioService);

  private readonly dateInputRef = viewChild<ElementRef>('dateInput');

  public readonly mode = input<'add' | 'edit'>('add');
  public readonly transactionType = input<TransactionType>();
  public readonly editContext = input<TransactionEditContext | undefined>();
  public readonly drawerId = input('add-transaction-drawer');

  public readonly saved = output<void>();
  public readonly closed = output<void>();

  public readonly TransactionType = TransactionType;

  public readonly name = signal('');
  public readonly date = signal('');
  public readonly price = signal(0);
  public readonly quantity = signal(0);
  public readonly charges = signal(0);
  public readonly gross = computed(() => this.price() * this.quantity());
  public readonly net = computed(
    () =>
      this.gross() +
      (this.transactionType() === TransactionType.SELL ||
      this.editContext()?.transaction.type === TransactionType.SELL
        ? -this.charges()
        : this.charges()),
  );

  public showSearchResults?: boolean;
  public showTransactionProgress?: boolean;
  public showStatusModal?: boolean;
  public transactionFormError?: string;

  public stockSearchResults$: Observable<Stock[]>;

  public readonly selectedStock = signal<Stock | Holding | undefined>(
    undefined,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor() {
    this.stockSearchResults$ = toObservable(this.name).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap((query) => {
        this.showSearchResults = false;

        if (query !== this.selectedStock()?.name) {
          this.selectedStock.set(undefined);
        }
      }),
      filter(
        (query) => query.length > 2 && query !== this.selectedStock()?.name,
      ),
      switchMap((query) =>
        iif(
          () => this.transactionType() === TransactionType.BUY,
          this.marketService.search(query),
          this.portfolioService.portfolio$.pipe(
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
      share(),
    );

    effect(() => {
      if (this.editContext()) {
        this.name.set(this.editContext()?.holdingName || '');
        this.price.set(this.editContext()?.transaction.price || 0);
        this.quantity.set(this.editContext()?.transaction.quantity || 0);
        this.charges.set(this.editContext()?.transaction.charges || 0);

        this.datepicker?.setDate(
          new Date(this.editContext()?.transaction.date || Date.now()),
          { clear: true },
        );
      }
    });
  }

  public ngAfterViewInit(): void {
    this.initDatepicker();
  }

  public async save(): Promise<void> {
    if (this.mode() === 'add') {
      await this.addTransaction();
    } else {
      await this.updateTransaction();
    }
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
            this.selectedStock.set({
              ...stock,
              scripCode: combinedStockDetails.scripCode,
              vendorCode: {
                ...stock.vendorCode,
                mc: combinedStockDetails.vendorCode.mc,
              },
              details: combinedStockDetails.details,
              metrics: combinedStockDetails.metrics,
            });

            this.name.set(stock.name);
          } else {
            this.showTransactionFormError(
              'Unable to get the details of the selected stock!',
            );
          }
        });
    } else {
      this.selectedStock.set(stock);

      this.name.set(stock.name);
    }

    this.showSearchResults = false;
  }

  public resetForm(): void {
    this.selectedStock.set(undefined);

    this.showSearchResults = false;

    this.name.set('');
    this.date.set(this.datepicker?.getDate('dd/mm/yyyy') || '');
    this.price.set(0);
    this.quantity.set(0);
    this.charges.set(0);

    this.resetDatepicker();

    this.datepicker?.hide();
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private async addTransaction(): Promise<void> {
    const stock = this.selectedStock();
    if (
      stock &&
      this.transactionType() &&
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
          type: this.transactionType() as TransactionType,
          date: date.getTime(),
          price: this.price(),
          quantity: this.quantity(),
          charges: this.charges(),
        };

        await this.storageService.addOrUpdate(stock, transaction);

        this.resetForm();

        this.showTransactionProgress = false;
        this.showStatusModal = true;
      } else {
        this.showTransactionFormError('Date is in future!');
      }
    } else {
      this.showTransactionFormError(
        'One or more field(s) containing invalid value(s)!',
      );
    }
  }

  private async updateTransaction(): Promise<void> {
    const ctx = this.editContext();

    if (
      ctx &&
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

        await this.storageService.updateTransaction(
          ctx.holdingId,
          ctx.transaction.id,
          {
            date: date.getTime(),
            price: this.price(),
            quantity: this.quantity(),
            charges: this.charges(),
          },
        );

        this.showTransactionProgress = false;
        this.showStatusModal = true;
      } else {
        this.showTransactionFormError('Date is in future!');
      }
    } else {
      this.showTransactionFormError(
        'One or more field(s) containing invalid value(s)!',
      );
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

  private initDatepicker(): void {
    const dateInputRef = this.dateInputRef();

    if (dateInputRef) {
      this.datepicker = new Datepicker(dateInputRef.nativeElement, {
        autohide: true,
        format: 'dd/mm/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        todayHighlight: true,
        maxDate: Date.now(),
      });

      dateInputRef.nativeElement.addEventListener(
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
