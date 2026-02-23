import { Injectable, inject } from '@angular/core';
import {
  Observable,
  combineLatest,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';

import { Constants } from '../constants';
import { Kpi } from '../models/kpi';
import { MarketService } from './core/market.service';
import { PlanService } from './core/plan.service';
import { PortfolioService } from './portfolio.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  public kpi$: Observable<Kpi>;

  constructor() {
    const planService = inject(PlanService);
    const marketService = inject(MarketService);
    const portfolioService = inject(PortfolioService);

    this.kpi$ = combineLatest([
      portfolioService.portfolio$,
      planService.plan$.pipe(
        switchMap((plan) =>
          plan?.stock?.vendorCode?.mc?.primary
            ? marketService.getStock(plan.stock.vendorCode.mc.primary)
            : of(null),
        ),
        shareReplay(1),
      ),
    ]).pipe(
      map(([portfolio, stock]) => ({
        cards: [
          ...(portfolio
            ? [
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
              ]
            : []),
          ...(stock
            ? [
                {
                  id:
                    stock.scripCode.isin ||
                    stock.scripCode.ticker ||
                    stock.name,
                  title: stock.name,
                  subtitle: 'Day',
                  value: stock.quote?.price,
                  change: stock.quote?.change,
                  routeLink: `${Constants.routes.STOCKS}/${stock.vendorCode.mc.primary}`,
                },
              ]
            : []),
        ],
      })),
    );
  }
}
