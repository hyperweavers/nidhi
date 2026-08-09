import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dropdown } from 'flowbite';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  share,
  skip,
} from 'rxjs';

import { TransactionDrawerComponent } from '../../components/transaction-drawer/transaction-drawer.component';
import { Constants } from '../../constants';
import { Flowbite } from '../../decorators/flowbite.decorator';
import { Direction } from '../../models/market';
import { Portfolio, TransactionType } from '../../models/portfolio';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { PortfolioService } from '../../services/portfolio.service';

enum PortfolioFilter {
  NONE = 'none',
  DAY_GAINERS = 'day_gainers',
  DAY_LOSERS = 'day_losers',
  OVERALL_GAINERS = 'overall_gainers',
  OVERALL_LOSERS = 'overall_losers',
}

enum PortfolioSortType {
  NAME = 'name',
  DAY_PROFIT_LOSS = 'daily_profit_loss',
  OVERALL_PROFIT_LOSS = 'overall_profit_loss',
}

enum PortfolioSortOrder {
  ASC = 'asc',
  DSC = 'dsc',
}

@Flowbite()
@Component({
  selector: 'app-portfolio',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ScrollingModule,
    ValueOrPlaceholderPipe,
    TransactionDrawerComponent,
  ],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage implements AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public portfolio$: Observable<Portfolio>;

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

  public transactionType = signal<TransactionType | undefined>(undefined);

  private sortDropdown?: Dropdown;
  private filterDropdown?: Dropdown;

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

    this.portfolioSearchQuery$
      .pipe(skip(1))
      .subscribe(() => this.syncQueryParams());

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
        ).FlowbiteInstances.getInstance('Dropdown', 'sortDropdown')),
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
        ).FlowbiteInstances.getInstance('Dropdown', 'filterDropdown')),
      200,
    );
  }

  public openAddTransactionDrawer(type: TransactionType): void {
    this.transactionType.set(type);
  }

  public onDrawerClosed(): void {
    this.transactionType.set(undefined);
  }

  public filterPortfolio(filter: PortfolioFilter): void {
    this.portfolioFilter$.next(filter);
    this.syncQueryParams();
    this.filterDropdown?.hide();
  }

  public clearPortfolioFilters(): void {
    this.portfolioFilter$.next(PortfolioFilter.NONE);
    this.syncQueryParams();
    this.filterDropdown?.hide();
  }

  public sortPortfolio(
    type: PortfolioSortType,
    order: PortfolioSortOrder,
  ): void {
    this.portfolioSort$.next([type, order]);
    this.syncQueryParams();
    this.sortDropdown?.hide();
  }

  public clearFiltersAndSort(): void {
    const [sortType, sortOrder] = this.portfolioSort$.getValue();
    const filter = this.portfolioFilter$.getValue();

    if (
      sortType !== PortfolioSortType.DAY_PROFIT_LOSS ||
      sortOrder !== PortfolioSortOrder.DSC ||
      filter !== PortfolioFilter.NONE
    ) {
      this.portfolioFilter$.next(PortfolioFilter.NONE);
      this.portfolioSort$.next([
        PortfolioSortType.DAY_PROFIT_LOSS,
        PortfolioSortOrder.DSC,
      ]);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });

      this.sortDropdown?.hide();
      this.filterDropdown?.hide();
    }
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const sortType = params.get('sortType') as PortfolioSortType | null;
    const sortOrder = params.get('sortOrder') as PortfolioSortOrder | null;

    if (
      sortType &&
      sortOrder &&
      Object.values(PortfolioSortType).includes(sortType) &&
      Object.values(PortfolioSortOrder).includes(sortOrder)
    ) {
      this.portfolioSort$.next([sortType, sortOrder]);
    }

    const filter = params.get('filter') as PortfolioFilter | null;

    if (filter && Object.values(PortfolioFilter).includes(filter)) {
      this.portfolioFilter$.next(filter);
    }

    const search = params.get('search');

    if (search) {
      this.portfolioSearchQuery.set(search);
    }
  }

  private syncQueryParams(): void {
    const [sortType, sortOrder] = this.portfolioSort$.getValue();
    const filter = this.portfolioFilter$.getValue();
    const search = this.portfolioSearchQuery();
    const queryParams: Record<string, string> = {};

    if (
      sortType !== PortfolioSortType.DAY_PROFIT_LOSS ||
      sortOrder !== PortfolioSortOrder.DSC
    ) {
      queryParams['sortType'] = sortType;
      queryParams['sortOrder'] = sortOrder;
    }

    if (filter !== PortfolioFilter.NONE) {
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
