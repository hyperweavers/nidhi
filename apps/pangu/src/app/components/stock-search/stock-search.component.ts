import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  filter,
  iif,
  map,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { Holding } from '../../models/portfolio';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { PortfolioService } from '../../services/portfolio.service';

@UntilDestroy()
@Component({
  selector: 'app-stock-search',
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-search.component.html',
  styleUrl: './stock-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockSearchComponent {
  private readonly marketService = inject(MarketService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly router = inject(Router);

  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  public readonly mode = input<'sitewide' | 'buy' | 'sell'>('sitewide');
  public readonly placeholder = input('Search stocks');
  public readonly autoFocus = input(false);
  public readonly query = model('');
  public readonly stockSelected = output<Stock>();

  public readonly results = signal<(Stock | Holding)[]>([]);
  public readonly showDropdown = signal(false);

  private readonly searchSubject = new BehaviorSubject<string>('');
  private readonly clear$ = new Subject<void>();

  constructor() {
    effect(() => {
      const q = this.query();
      if (q.length >= 3) {
        this.searchSubject.next(q);
      } else {
        this.results.set([]);
        this.showDropdown.set(false);
      }
    });

    effect(() => {
      if (this.autoFocus()) {
        queueMicrotask(() => {
          this.searchInput()?.nativeElement?.focus();
        });
      }
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((q) => q.length >= 2),
        switchMap((query) =>
          iif(
            () => this.mode() === 'sell',
            this.portfolioService.portfolio$.pipe(
              map((portfolio) =>
                portfolio.holdings.filter(
                  (h) =>
                    h.quantity &&
                    h.quantity > 0 &&
                    h.name.toLowerCase().includes(query.toLowerCase()),
                ),
              ),
            ),
            this.marketService.search(query),
          ),
        ),
        tap((results) => {
          this.results.set(results as (Stock | Holding)[]);
          this.showDropdown.set(results.length > 0);
        }),
        untilDestroyed(this),
      )
      .subscribe();

    this.clear$
      .pipe(
        tap(() => {
          this.results.set([]);
          this.showDropdown.set(false);
        }),
        untilDestroyed(this),
      )
      .subscribe();
  }

  onInput(value: string): void {
    this.query.set(value);
  }

  selectStock(stock: Stock | Holding): void {
    this.showDropdown.set(false);
    this.results.set([]);
    this.stockSelected.emit(stock);
  }

  onBlur(): void {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
  }

  clear(): void {
    this.clear$.next();
    this.query.set('');
  }

  navigateToStock(stock: Stock): void {
    this.query.set('');
    this.results.set([]);
    this.showDropdown.set(false);
    this.stockSelected.emit(stock);
    this.router.navigate(['/stocks', stock.vendorCode.etm.primary]);
  }
}
