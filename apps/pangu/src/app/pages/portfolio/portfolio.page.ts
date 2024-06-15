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
import { Observable, switchMap } from 'rxjs';

import { Direction, Stock } from '../../models/stock';
import { Portfolio } from '../../models/portfolio';
import { PortfolioService } from '../../services/portfolio.service';
import { MarketService } from '../../services/core/market.service';

import { BasePage } from '../base.page';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Datepicker: any;

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(
    private portfolioService: PortfolioService,
    private marketService: MarketService
  ) {
    super();

    this.portfolio$ = this.portfolioService.portfolio$;

    this.stockSearchResults$ = toObservable(this.name).pipe(
      switchMap((query) => this.marketService.search(query))
    );
  }

  public ngOnInit(): void {
    this.initDatePickerElement();
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
