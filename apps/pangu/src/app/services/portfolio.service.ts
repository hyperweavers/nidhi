import { Injectable, inject } from '@angular/core';
import {
  Observable,
  concatMap,
  from,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { db } from '../db/app.db';
import { Direction } from '../models/market';
import { Holding, Portfolio, TransactionType } from '../models/portfolio';
import { Stock } from '../models/stock';
import { MarketService } from './core/market.service';
import { StorageService } from './core/storage.service';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  public portfolio$: Observable<Portfolio>;

  private readonly marketService = inject(MarketService);

  constructor() {
    const storageService = inject(StorageService);

    this.portfolio$ = from(storageService.stocks$)
      .pipe(
        switchMap((storageStocks) => {
          return this.marketService
            .getStocks(
              storageStocks.map(
                (storageStock) => storageStock.vendorCode.etm.primary,
              ),
            )
            .pipe(
              map((marketStocks: Stock[]): Portfolio => {
                const holdings = marketStocks.map((marketStock): Holding => {
                  const storageStock = storageStocks.find(
                    (storageStock) =>
                      storageStock.vendorCode.etm.primary ===
                      marketStock.vendorCode.etm.primary,
                  );
                  const quantity =
                    storageStock?.transactions.reduce(
                      (a, v) =>
                        v.type === TransactionType.BUY
                          ? a + v.quantity
                          : a - v.quantity,
                      0,
                    ) || 0;
                  const investment =
                    storageStock?.transactions.reduce(
                      (a, v) =>
                        v.type === TransactionType.BUY
                          ? a + v.quantity * v.price + (v.charges || 0)
                          : a - v.quantity * v.price - (v.charges || 0),
                      0,
                    ) || 0;
                  const averagePrice = investment / quantity || 0;
                  const totalProfitLossValue = marketStock.quote?.nse
                    ? (marketStock.quote.nse.price - averagePrice) * quantity
                    : 0;
                  const totalProfitLossPercentage =
                    (totalProfitLossValue / investment) * 100 || 0;

                  return {
                    ...marketStock,
                    details: storageStock?.details ?? marketStock.details,
                    metrics: storageStock?.metrics ?? marketStock.metrics,
                    id: storageStock?.id || uuid(),
                    transactions: storageStock?.transactions || [],
                    quantity,
                    averagePrice,
                    investment,
                    marketValue: marketStock.quote?.nse
                      ? marketStock.quote.nse.price * quantity
                      : 0,
                    totalProfitLoss: {
                      direction:
                        totalProfitLossValue >= 0
                          ? Direction.UP
                          : Direction.DOWN,
                      percentage: totalProfitLossPercentage,
                      value: totalProfitLossValue,
                    },
                  };
                });

                let investment = 0;
                let marketValue = 0;
                let dayProfitLossValue = 0;
                let previousMarketValue = 0;
                let dayAdvanceValue = 0;
                let dayDeclineValue = 0;
                let totalAdvanceValue = 0;
                let totalDeclineValue = 0;

                holdings.map((holding) => {
                  const totalValue =
                    holding.quote?.nse && holding.quantity
                      ? holding.quote.nse.price * holding.quantity
                      : 0;

                  investment += holding.investment || 0;
                  marketValue += totalValue;

                  dayProfitLossValue +=
                    holding.quote?.nse && holding.quantity
                      ? holding.quote.nse.change.value * holding.quantity
                      : 0;

                  previousMarketValue +=
                    holding.quote?.nse?.close && holding.quantity
                      ? holding.quote.nse.close * holding.quantity
                      : 0;

                  if (holding.quote?.nse?.change?.direction === Direction.UP) {
                    dayAdvanceValue++;
                  } else {
                    dayDeclineValue++;
                  }

                  if (holding.totalProfitLoss?.direction === Direction.UP) {
                    totalAdvanceValue++;
                  } else {
                    totalDeclineValue++;
                  }
                });

                const dayProfitLossPercentage =
                  (dayProfitLossValue / previousMarketValue) * 100 || 0;
                const totalProfitLossValue = marketValue - investment;
                const totalProfitLossPercentage =
                  (totalProfitLossValue / investment) * 100 || 0;
                const dayAdvancePercentage =
                  (dayAdvanceValue / holdings.length) * 100 || 0;
                const dayDeclinePercentage =
                  (dayDeclineValue / holdings.length) * 100 || 0;
                const totalAdvancePercentage =
                  (totalAdvanceValue / holdings.length) * 100 || 0;
                const totalDeclinePercentage =
                  (totalDeclineValue / holdings.length) * 100 || 0;

                return {
                  holdings,
                  investment,
                  marketValue,
                  dayProfitLoss: {
                    direction:
                      dayProfitLossValue >= 0 ? Direction.UP : Direction.DOWN,
                    percentage: dayProfitLossPercentage,
                    value: dayProfitLossValue,
                  },
                  totalProfitLoss: {
                    direction:
                      totalProfitLossValue >= 0 ? Direction.UP : Direction.DOWN,
                    percentage: totalProfitLossPercentage,
                    value: totalProfitLossValue,
                  },
                  dayAdvance: {
                    percentage: dayAdvancePercentage,
                    value: dayAdvanceValue,
                  },
                  dayDecline: {
                    percentage: dayDeclinePercentage,
                    value: dayDeclineValue,
                  },
                  totalAdvance: {
                    percentage: totalAdvancePercentage,
                    value: totalAdvanceValue,
                  },
                  totalDecline: {
                    percentage: totalDeclinePercentage,
                    value: totalDeclineValue,
                  },
                };
              }),
            );
        }),
      )
      .pipe(shareReplay(1));

    this.portfolio$
      .pipe(
        tap((portfolio) => {
          this.enrichMissingDetails(portfolio.holdings);
        }),
      )
      .subscribe();
  }

  private enriching = false;

  private enrichMissingDetails(holdings: Holding[]): void {
    if (this.enriching) {
      return;
    }

    const missing = holdings.filter(
      (h) =>
        h.vendorCode.etm.primary &&
        (!h.details?.sector || !h.metrics?.nse?.marketCap),
    );

    if (missing.length === 0) {
      return;
    }

    this.enriching = true;

    from(missing)
      .pipe(
        concatMap((holding) =>
          this.marketService.getStock(holding.vendorCode.etm.primary, true),
        ),
        tap((stock) => {
          if (
            stock?.scripCode?.isin &&
            stock?.details?.sector &&
            stock?.metrics?.nse?.marketCap
          ) {
            db.stocks
              .where('scripCode.isin')
              .equals(stock.scripCode.isin)
              .modify({ details: stock.details, metrics: stock.metrics })
              .catch(() => {
                /* empty - enrichment is best-effort */
              });
          }
        }),
      )
      .subscribe({
        error: () => {
          /* best-effort enrichment, errors are skipped */
        },
        complete: () => {
          this.enriching = false;
        },
      });
  }
}
