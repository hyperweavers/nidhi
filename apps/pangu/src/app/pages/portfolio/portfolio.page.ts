import {
  ChangeDetectionStrategy,
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

import { DrawerClosedDirective } from '../../directives/click-outside/drawer-closed.directive';
import { Direction, Stock } from '../../models/stock';
import { Portfolio, TransactionType } from '../../models/portfolio';
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
  @ViewChild('investmentDateInput', { static: true })
  private investmentDateInput?: ElementRef;

  public portfolio$: Observable<Portfolio>;
  public stockSearchResults$: Observable<Stock[]>;

  public readonly Direction = Direction;

  public name = signal('');
  public date = signal('');
  public price = signal(0);
  public quantity = signal(0);
  public charges = signal(0);
  public readonly gross = computed(() => this.price() * this.quantity());
  public readonly net = computed(() => this.gross() + this.charges());

  public showSearchResults = false;

  private selectedStock?: Stock;

  constructor(
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
    this.initDatePickerElement();
  }

  public async addStock(): Promise<void> {
    if (
      this.selectedStock &&
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
        await this.storageService.insert({
          ...this.selectedStock,
          transactions: [
            {
              id: uuid(),
              type: TransactionType.BUY,
              date: date.getTime(),
              price: this.price(),
              quantity: this.quantity(),
              charges: this.charges(),
            },
          ],
        });

        this.resetAddNewStockForm();

        // TODO: show a modal to add another stock confirmation. On cancel, close the drawer.
      } else {
        console.log('Date in future!');
        // TODO: show modal
      }
    } else {
      console.log('Invalid data!');
      // TODO: show modal
      // TODO: Catch storage exceptions in main pages (import, export, date, profile, ...)
    }
  }

  public selectStock(stock: Stock): void {
    this.selectedStock = stock;

    this.name.set(stock.name);

    this.showSearchResults = false;
  }

  public resetAddNewStockForm(): void {
    this.selectedStock = undefined;

    this.showSearchResults = false;

    this.name.set('');
    this.date.set('');
    this.price.set(0);
    this.quantity.set(0);
    this.charges.set(0);
  }

  private initDatePickerElement(): void {
    if (this.investmentDateInput) {
      new Datepicker(this.investmentDateInput.nativeElement, {
        autohide: true,
        format: 'dd/mm/yyyy',
        todayBtn: true,
        clearBtn: true,
        todayBtnMode: 1,
        todayHighlight: true,
        maxDate: Date.now(),
      });

      this.investmentDateInput.nativeElement.addEventListener(
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
