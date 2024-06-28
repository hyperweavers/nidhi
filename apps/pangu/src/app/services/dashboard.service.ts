import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';

import { Constants } from '../constants';
import { Index } from '../models/index';
import { Kpi, KpiCard } from '../models/kpi';
import { IndexCodes } from '../models/market';
import { Portfolio } from '../models/portfolio';
import { MarketService } from './core/market.service';
import { PortfolioService } from './portfolio.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  public kpi$: Observable<Kpi>;

  private indices$: Observable<Index[]>;
  private portfolio$: Observable<Portfolio>;

  constructor(
    marketService: MarketService,
    portfolioService: PortfolioService,
  ) {
    this.indices$ = marketService.getIndices([
      IndexCodes.NIFTY_FIFTY,
      IndexCodes.SENSEX,
    ]);

    this.portfolio$ = portfolioService.portfolio$;

    this.kpi$ = combineLatest([this.indices$, this.portfolio$]).pipe(
      map(([indices, portfolio]) => ({
        cards: [
          ...(portfolio.holdings.length > 0
            ? [
                {
                  id: 'portfolio.day',
                  title: 'Portfolio',
                  subtitle: 'Day',
                  value: portfolio.marketValue,
                  change: portfolio.dayProfitLoss,
                  advance: portfolio.dayAdvance,
                  decline: portfolio.dayDecline,
                  routeLink: Constants.routes.PORTFOLIO,
                },
                {
                  id: 'portfolio.total',
                  title: 'Portfolio',
                  subtitle: 'Total',
                  value: portfolio.marketValue,
                  change: portfolio.totalProfitLoss,
                  advance: portfolio.totalAdvance,
                  decline: portfolio.totalDecline,
                  routeLink: Constants.routes.PORTFOLIO,
                },
              ]
            : []),
          ...indices.map(
            (index): KpiCard => ({
              id: index.id,
              title: index.name,
              value: index.quote?.value,
              change: index.quote?.change,
              advance: index.quote?.advance,
              decline: index.quote?.decline,
            }),
          ),
        ],
      })),
    );
  }
}
