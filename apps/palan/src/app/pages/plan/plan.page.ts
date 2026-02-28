import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Constants } from '../../constants';
import { Currency } from '../../models/currency';
import { Plan } from '../../models/plan';
import { Stock } from '../../models/stock';
import { CurrencyService } from '../../services/core/currency.service';
import { MarketService } from '../../services/core/market.service';
import { PlanService } from '../../services/core/plan.service';
import { DateUtils } from '../../utils/date.utils';

@Component({
  selector: 'app-plan',
  imports: [CommonModule, FormsModule],
  providers: [CurrencyService],
  templateUrl: './plan.page.html',
  styleUrl: './plan.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPage {
  private readonly planService = inject(PlanService);

  public stockSearchResults$: Observable<Stock[]>;
  public currencyList$: Observable<Currency[]>;

  public plan: Signal<Plan | undefined>;

  public readonly name = signal('');
  public readonly lockInPeriodYears = signal(0);
  public readonly lockInPeriodMonths = signal(0);
  public readonly lockInPeriodDays = signal(0);
  public readonly purchaseCurrency: WritableSignal<Currency | null> =
    signal(null);
  public readonly contributionCurrency: WritableSignal<Currency | null> =
    signal(null);

  public showSearchResults?: boolean;
  public isEditMode = false;

  private selectedStock?: Stock;

  constructor() {
    const marketService = inject(MarketService);
    const currencyService = inject(CurrencyService);

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
        marketService
          .search(query)
          .pipe(
            map((stocks) =>
              stocks.filter(
                (stock) =>
                  stock.scripCode.isin &&
                  stock.scripCode.ticker &&
                  stock.scripCode.country,
              ),
            ),
          ),
      ),
      tap(() => {
        if (!this.plan() || this.isEditMode) {
          this.showSearchResults = true;
        }
      }),
    );

    this.currencyList$ = currencyService
      .getCurrencyList()
      .pipe(
        map((currencies) =>
          currencies.filter((currency) =>
            Constants.currency.allowed.includes(currency.code),
          ),
        ),
      );

    this.plan = toSignal<Plan | undefined>(this.planService.plan$);

    effect(() => {
      if (this.plan()) {
        const lockInPeriod = DateUtils.convertDaysToYearsMonthsDays(
          this.plan()?.lockInPeriod || 0,
        );
        this.name.set(this.plan()?.stock?.name || '');
        this.lockInPeriodYears.set(lockInPeriod.years);
        this.lockInPeriodMonths.set(lockInPeriod.months);
        this.lockInPeriodDays.set(lockInPeriod.days);
        this.purchaseCurrency.set(this.plan()?.currencies?.purchase || null);
        this.contributionCurrency.set(
          this.plan()?.currencies?.contribution || null,
        );

        this.selectedStock = this.plan()?.stock;

        this.isEditMode = false;
      }
    });
  }

  public selectStock(stock: Stock): void {
    if (
      stock.scripCode.isin &&
      stock.scripCode.ticker &&
      stock.scripCode.country
    ) {
      this.selectedStock = stock;

      this.name.set(stock.name);
    }

    this.showSearchResults = false;
  }

  public async save() {
    if (!this.plan() || this.isEditMode) {
      if (
        this.selectedStock &&
        (this.lockInPeriodYears() > 0 ||
          this.lockInPeriodMonths() > 0 ||
          this.lockInPeriodDays() > 0) &&
        this.purchaseCurrency() &&
        this.contributionCurrency()
      ) {
        const plan: Plan = {
          id: this.plan()?.id || uuid(),
          stock: this.selectedStock,
          lockInPeriod:
            DateUtils.convertYearsMonthsDaysToDays(
              this.lockInPeriodYears(),
              this.lockInPeriodMonths(),
              this.lockInPeriodDays(),
            ) || 0,
          currencies: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            purchase: this.purchaseCurrency()!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            contribution: this.contributionCurrency()!,
          },
        };

        await this.planService.addOrUpdate(plan);
      }
    } else {
      this.isEditMode = true;
    }
  }
}
