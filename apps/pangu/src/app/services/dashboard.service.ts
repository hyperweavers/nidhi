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

  private readonly portfolio$ = new BehaviorSubject<Portfolio | null>(null);

  constructor() {
    const portfolioService = inject(PortfolioService);

    this.kpi$ = combineLatest([
      this.marketService.getMainIndices().pipe(shareReplay(1)),
      portfolioService.portfolio$.pipe(
        tap((portfolio) => {
          this.portfolio$.next(portfolio);
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
    return this.portfolio$.pipe(
      switchMap((portfolio) => {
        if (portfolio) {
          const { holdings } = portfolio;
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
        } else {
          return of([]);
        }
      }),
    );
  }

  public getPortfolioComposition(): Observable<{
    weight: number[];
    stocks: string[];
    sectors: string[];
    sectorWeights: number[];
    marketCaps: string[];
    marketCapWeights: number[];
  }> {
    return this.portfolio$.pipe(
      map((portfolio) => {
        if (portfolio) {
          const { holdings, marketValue } = portfolio;

          if (holdings.length > 0) {
            const stockWeights = this.calculatePortfolioWeight(
              holdings,
              marketValue,
            );
            const sectorWeights = this.calculateSectorWeight(
              holdings,
              marketValue,
            );
            const marketCapWeights = this.calculateMarketCapWeight(
              holdings,
              marketValue,
            );

            return {
              ...stockWeights,
              sectors: sectorWeights.sectors,
              sectorWeights: sectorWeights.weights,
              marketCaps: marketCapWeights.marketCaps,
              marketCapWeights: marketCapWeights.weights,
            };
          } else {
            return {
              weight: [],
              stocks: [],
              sectors: [],
              sectorWeights: [],
              marketCaps: [],
              marketCapWeights: [],
            };
          }
        } else {
          return {
            weight: [],
            stocks: [],
            sectors: [],
            sectorWeights: [],
            marketCaps: [],
            marketCapWeights: [],
          };
        }
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

  private calculatePortfolioWeight(
    holdings: Holding[],
    totalMarketValue: number,
  ): { weight: number[]; stocks: string[] } {
    return holdings
      .filter((h) => (h.marketValue || 0) > 0)
      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
      .reduce(
        (acc, holding) => {
          const { name, marketValue } = holding;

          acc.weight.push(
            marketValue ? (marketValue / totalMarketValue) * 100 : 0,
          );
          acc.stocks.push(name);

          return acc;
        },
        { weight: [] as number[], stocks: [] as string[] },
      );
  }

  private calculateSectorWeight(
    holdings: Holding[],
    totalMarketValue: number,
  ): { sectors: string[]; weights: number[] } {
    const sectorMap = new Map<string, number>();

    for (const h of holdings) {
      const mv = h.marketValue || 0;
      if (mv <= 0) continue;

      const sector = h.details?.sector || 'Unknown';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + mv);
    }

    const entries = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1]);

    return entries.reduce(
      (acc, [sector, value]) => {
        acc.sectors.push(sector);
        acc.weights.push((value / totalMarketValue) * 100);
        return acc;
      },
      { sectors: [] as string[], weights: [] as number[] },
    );
  }

  private calculateMarketCapWeight(
    holdings: Holding[],
    totalMarketValue: number,
  ): { marketCaps: string[]; weights: number[] } {
    const capMap = new Map<string, number>();

    for (const h of holdings) {
      const mv = h.marketValue || 0;
      if (mv <= 0) continue;

      const capType = h.metrics?.nse?.marketCapType || 'Not Classified';
      capMap.set(capType, (capMap.get(capType) || 0) + mv);
    }

    const entries = Array.from(capMap.entries()).sort((a, b) => b[1] - a[1]);

    return entries.reduce(
      (acc, [capType, value]) => {
        acc.marketCaps.push(capType);
        acc.weights.push((value / totalMarketValue) * 100);
        return acc;
      },
      { marketCaps: [] as string[], weights: [] as number[] },
    );
  }
}
