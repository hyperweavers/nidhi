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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { DrawerClosedDirective } from '../../directives/drawer-closed/drawer-closed.directive';
import { Direction, Stock } from '../../models/stock';
import { Holding, Portfolio, TransactionType } from '../../models/portfolio';
import { PortfolioService } from '../../services/portfolio.service';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';

import { BasePage } from '../base.page';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawerClosedDirective],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage extends BasePage implements OnInit {
  @ViewChild('transactionDateInput', { static: true })
  private transactionDateInput?: ElementRef;

  public portfolio$: Observable<Portfolio>;
  public stockSearchResults$: Observable<Stock[]>;

  public readonly Direction = Direction;
  public readonly TransactionType = TransactionType;

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

  private selectedStock?: Stock;

  constructor(
    private cdr: ChangeDetectorRef,
    private portfolioService: PortfolioService,
    private marketService: MarketService,
    private storageService: StorageService
  ) {
    super();

    this.portfolio$ = this.portfolioService.portfolio$;

    this.stockSearchResults$ = toObservable(this.name).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      filter((query) => query.length > 2 && query !== this.selectedStock?.name),
      switchMap((query) => this.marketService.search(query)),
      tap(() => {
        this.selectedStock = undefined;
        this.showSearchResults = true;
      })
    );
  }

  public ngOnInit(): void {
    this.initDatePicker();
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
        `${dateFragments[2]}/${dateFragments[1]}/${dateFragments[0]}`
      );

      if (date < new Date()) {
        this.showTransactionProgress = true;

        const stock = {
          ...this.selectedStock,
          transactions: [
            {
              id: uuid(),
              type: this.transactionType,
              date: date.getTime(),
              price: this.price(),
              quantity: this.quantity(),
              charges: this.charges(),
            },
          ],
        };

        if (stock.id) {
          await this.storageService.update(stock);
        } else {
          await this.storageService.insert(stock);
        }

        this.resetTransactionForm();

        this.showTransactionProgress = false;
        this.showStatusModal = true;
      } else {
        this.showTransactionFormError('Date is in future!');
      }
    } else {
      this.showTransactionFormError(
        'One or more field(s) containing invalid value(s)!'
      );
      // TODO: Catch storage exceptions in main pages (import, export, date, profile, ...)
    }
  }

  public openAddTransactionDrawer(
    type: TransactionType,
    stock?: Holding
  ): void {
    this.transactionType = type;

    if (stock) {
      this.selectedStock = stock;

      this.name.set(stock.name);
    }
  }

  public selectStock(stock: Stock): void {
    this.selectedStock = stock;

    this.name.set(stock.name);

    this.showSearchResults = false;
  }

  public resetTransactionForm(): void {
    this.selectedStock = undefined;
    this.transactionType = undefined;

    this.showSearchResults = false;

    this.name.set('');
    this.date.set('');
    this.price.set(0);
    this.quantity.set(0);
    this.charges.set(0);
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private showTransactionFormError(message: string): void {
    this.transactionFormError = message;

    setTimeout(() => {
      this.transactionFormError = '';

      this.cdr.markForCheck();
    }, 2000);
  }

  private initDatePicker(): void {
    if (this.transactionDateInput) {
      new Datepicker(this.transactionDateInput.nativeElement, {
        autohide: true,
        format: 'dd/mm/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        todayHighlight: true,
        maxDate: Date.now(),
      });

      this.transactionDateInput.nativeElement.addEventListener(
        'changeDate',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const value = e.target.value;

          this.date.set(value);
        }
      );
    }
  }
}
