import { Injectable } from '@angular/core';
import { Observable, from, map, shareReplay, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';

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

  constructor(storageService: StorageService, marketService: MarketService) {
    this.portfolio$ = from(storageService.stocks$)
      .pipe(
        switchMap((storageStocks) => {
          return marketService
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

                  holding.quote?.nse?.change?.direction === Direction.UP
                    ? dayAdvanceValue++
                    : dayDeclineValue++;

                  holding.totalProfitLoss?.direction === Direction.UP
                    ? totalAdvanceValue++
                    : totalDeclineValue++;
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
  }
}
