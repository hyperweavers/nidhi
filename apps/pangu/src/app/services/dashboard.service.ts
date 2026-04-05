import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';

import { Constants } from '../constants';
import { ChartData, Period } from '../models/chart';
import { Index } from '../models/index';
import { Kpi, KpiCard } from '../models/kpi';
import { Holding, Portfolio, TransactionType } from '../models/portfolio';
import { MarketService } from './core/market.service';
import { PortfolioService } from './portfolio.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private marketService = inject(MarketService);

  public kpi$: Observable<Kpi>;

  private readonly holdings$ = new BehaviorSubject<Holding[]>([]);

  constructor() {
    const portfolioService = inject(PortfolioService);

    this.kpi$ = combineLatest([
      this.marketService.getMainIndices().pipe(shareReplay(1)),
      portfolioService.portfolio$.pipe(
        tap((portfolio) => {
          this.holdings$.next(portfolio.holdings);
        }),
      ),
    ]).pipe(
      map(([indices, portfolio]: [Index[], Portfolio]) => ({
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
              routeLink: `${Constants.routes.INDICES}/${index.exchange}/${index.id}`,
            }),
          ),
        ],
      })),
    );
  }

  public getPortfolioChart(period: Period): Observable<ChartData[]> {
    return this.holdings$.pipe(
      switchMap((holdings) => {
        const symbols = holdings
          .map((holding) => holding.vendorCode.etm.chart)
          .filter((code) => !!code) as string[];

        return holdings.length > 0
          ? (period === Period.ONE_DAY
              ? this.marketService.getIntraDayPeerChart(symbols)
              : this.marketService.getHistoricPeerChart(symbols, period)
            ).pipe(
              map((peerChartData) => {
                if (
                  !peerChartData ||
                  peerChartData.length === 0 ||
                  holdings.length === 0
                ) {
                  return [];
                }

                // Get all unique dates from the peer chart data
                const dateSet = new Set<string>();
                peerChartData.forEach((peer) => {
                  peer.data.forEach((point) => {
                    dateSet.add(String(point.time));
                  });
                });

                const dates = Array.from(dateSet)
                  .sort((a, b) => {
                    const dateA = new Date(a).getTime();
                    const dateB = new Date(b).getTime();
                    return dateA - dateB;
                  })
                  .map((dateStr) => new Date(dateStr).getTime());

                // For each date, build price map and calculate portfolio performance
                const portfolioChartData: ChartData[] = dates.map(
                  (dateTimestamp) => {
                    const priceMap = new Map<string, number>();

                    // Build price map for this date from peer chart data
                    peerChartData.forEach((peer) => {
                      const dataPoint = peer.data.find(
                        (point) =>
                          new Date(point.time).getTime() === dateTimestamp,
                      );
                      if (dataPoint && dataPoint.value !== undefined) {
                        priceMap.set(peer.symbol, dataPoint.value);
                      }
                    });

                    return {
                      time: new Date(dateTimestamp).toLocaleDateString(
                        'en-CA',
                        {
                          timeZone: 'Asia/Kolkata',
                        },
                      ),
                      value: this.calculatePortfolioChangeAtDate(
                        holdings,
                        dateTimestamp,
                        priceMap,
                      ),
                    };
                  },
                );

                return portfolioChartData;
              }),
            )
          : of([]);
      }),
    );
  }

  /**
   * Calculate portfolio performance change in percentage at a specific date
   * Given the price map (symbol -> price on that date)
   */
  private calculatePortfolioChangeAtDate(
    holdings: Holding[],
    dateTimestamp: number,
    priceMap: Map<string, number>,
  ): number {
    let portfolioMarketValue = 0;
    let portfolioInvestment = 0;

    holdings.forEach((holding) => {
      const { quantity, investment } = this.calculateHoldingAtDate(
        holding,
        dateTimestamp,
      );

      if (quantity > 0) {
        const holdingSymbol = holding.vendorCode.etm.chart;
        if (holdingSymbol) {
          const price = priceMap.get(holdingSymbol) || 0;
          portfolioMarketValue += price * quantity;
        }
      }

      portfolioInvestment += investment;
    });

    return portfolioInvestment > 0
      ? ((portfolioMarketValue - portfolioInvestment) / portfolioInvestment) *
          100
      : 0;
  }

  /**
   * Calculate holding quantity and investment as of a specific date
   */
  private calculateHoldingAtDate(
    holding: Holding,
    dateTimestamp: number,
  ): { quantity: number; investment: number } {
    let quantity = 0;
    let investment = 0;

    holding.transactions.forEach((transaction) => {
      if (transaction.date <= dateTimestamp) {
        const isBuy = transaction.type === TransactionType.BUY;
        const multiplier = isBuy ? 1 : -1;

        quantity += multiplier * transaction.quantity;
        investment +=
          multiplier *
          (transaction.quantity * transaction.price +
            (transaction.charges || 0));
      }
    });

    return { quantity, investment };
  }
}
