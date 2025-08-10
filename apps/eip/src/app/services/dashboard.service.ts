import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Constants } from '../constants';
import { Kpi, KpiCard } from '../models/kpi';
import { Portfolio } from '../models/portfolio';
import { PortfolioService } from './portfolio.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  public kpi$: Observable<Kpi>;

  private portfolio$: Observable<Portfolio>;

  constructor(portfolioService: PortfolioService) {
    this.portfolio$ = portfolioService.portfolio$;

    this.kpi$ = this.portfolio$.pipe(
      map((portfolio) => ({
        cards: [
          ...(portfolio.holdings.length > 0
            ? [
                {
                  id: 'portfolio.day',
                  title: 'Portfolio',
                  subtitle: 'Day',
                  value: portfolio.marketValue,
                  change: portfolio.dayProfitLoss,
                  routeLink: Constants.routes.PORTFOLIO,
                },
                {
                  id: 'portfolio.total',
                  title: 'Portfolio',
                  subtitle: 'Total',
                  value: portfolio.marketValue,
                  change: portfolio.totalProfitLoss,
                  routeLink: Constants.routes.PORTFOLIO,
                },
              ]
            : []),
        ] as KpiCard[],
      })),
    );
  }
}
