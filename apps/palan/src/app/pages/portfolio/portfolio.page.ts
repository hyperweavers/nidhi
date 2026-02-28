import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  Signal,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { toSignal } from '@angular/core/rxjs-interop';
import { Constants } from '../../constants';
import { DrawerClosedDirective } from '../../directives/drawer-closed/drawer-closed.directive';
import { Currency } from '../../models/currency';
import { Direction } from '../../models/market';
import { Plan } from '../../models/plan';
import {
  ContributionSource,
  Portfolio,
  Transaction,
  TransactionType,
} from '../../models/portfolio';
import { PlanService } from '../../services/core/plan.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule, FormsModule, RouterLink, DrawerClosedDirective],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);

  private readonly transactionDateInputRef = viewChild<ElementRef>(
    'transactionDateInput',
  );

  public portfolio$: Observable<Portfolio>;

  private plan: Signal<Plan | undefined>;

  public purchaseCurrency: Signal<Currency | undefined> = computed(
    () => this.plan()?.currencies.purchase,
  );
  public contributionCurrency: Signal<Currency | undefined> = computed(
    () => this.plan()?.currencies.contribution,
  );

  public readonly Routes = Constants.routes;
  public readonly Direction = Direction;
  public readonly TransactionType = TransactionType;
  public readonly ContributionSource = ContributionSource;

  public readonly source = signal(ContributionSource.EMPLOYEE);
  public readonly date = signal('');
  public readonly price = signal(0);
  public readonly quantity = signal(0);
  public readonly contribution = signal(0);
  public readonly charges = signal(0);
  public readonly discount = signal(0);
  public readonly fmv = signal(0);

  public transactionType?: TransactionType;
  public showStatusModal?: boolean;
  public showTransactionProgress?: boolean;
  public transactionFormError?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private datepicker?: any;

  constructor() {
    const portfolioService = inject(PortfolioService);
    const planService = inject(PlanService);

    this.portfolio$ = portfolioService.portfolio$.pipe(
      map((portfolio) => ({
        ...portfolio,
        holdings: portfolio.holdings.filter(
          (holding) => holding.quantity && holding.quantity > 0,
        ),
      })),
    );

    this.plan = toSignal<Plan | undefined>(planService.plan$);
  }

  public ngOnInit(): void {
    this.initDatePicker();
  }

  public async addTransaction(): Promise<void> {
    if (
      this.purchaseCurrency() &&
      this.contributionCurrency() &&
      this.transactionType &&
      this.source() &&
      this.date() &&
      this.price() > 0 &&
      this.contribution() > 0 &&
      this.quantity() > 0 &&
      (!this.charges() || this.charges() > 0)
    ) {
      const dateFragments = this.date().split('/');
      const date = new Date(
        `${dateFragments[2]}/${dateFragments[1]}/${dateFragments[0]}`,
      );

      if (date < new Date()) {
        this.showTransactionProgress = true;

        const transaction: Transaction = {
          id: uuid(),
          type: this.transactionType,
          date: date.getTime(),
          price: {
            value: this.price(),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            currency: this.purchaseCurrency()!,
          },
          quantity: this.quantity(),
          source: this.source(),
          contribution: {
            value: this.contribution(),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            currency: this.contributionCurrency()!,
          },
          charges: {
            value: this.charges(),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            currency: this.purchaseCurrency()!,
          },
        };

        await this.storageService.addOrUpdate(transaction);

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

  public resetTransactionForm(): void {
    this.source.set(ContributionSource.EMPLOYEE);
    this.date.set(this.datepicker?.getDate('dd/mm/yyyy') || '');
    this.price.set(0);
    this.contribution.set(0);
    this.quantity.set(0);
    this.charges.set(0);
    this.discount.set(0);
    this.fmv.set(0);

    this.resetDatepicker();

    this.datepicker?.hide();
  }

  public closeStatusModal(retainTransactionType?: boolean): void {
    this.showStatusModal = false;

    if (!retainTransactionType) {
      this.transactionType = undefined;
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
