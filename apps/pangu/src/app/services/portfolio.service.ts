import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Holding, Portfolio } from '../models/portfolio';
import { StorageService } from './core/storage.service';
import { MarketService } from './core/market.service';
import { Direction, Stock } from '../models/stock';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  public portfolio$: Observable<Portfolio>;

  constructor(
    private storageService: StorageService,
    private marketService: MarketService
  ) {
    this.portfolio$ = from(this.storageService.stocks$).pipe(
      switchMap((storageStocks) => {
        return this.marketService
          .getStocks(
            storageStocks.map((storageStock) => storageStock.vendorCode.etm)
          )
          .pipe(
            map((marketStocks: Stock[]): Portfolio => {
              const holdings = marketStocks.map((marketStock): Holding => {
                const storageStock = storageStocks.find(
                  (storageStock) =>
                    storageStock.vendorCode.etm === marketStock.vendorCode.etm
                );
                const quantity =
                  storageStock?.transactions.reduce(
                    (a, v) => a + v.quantity,
                    0
                  ) || 0;
                const investment =
                  storageStock?.transactions.reduce(
                    (a, v) => a + v.quantity * v.price + (v.charges || 0),
                    0
                  ) || 0;
                const averagePrice = investment / quantity || 0;
                const totalProfitLossValue = marketStock.quote
                  ? (marketStock.quote.price - averagePrice) * quantity
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
                  marketValue: marketStock.quote
                    ? marketStock.quote.price * quantity
                    : 0,
                  totalProfitLoss: {
                    direction:
                      totalProfitLossValue >= 0 ? Direction.UP : Direction.DOWN,
                    percentage: totalProfitLossPercentage,
                    value: totalProfitLossValue,
                  },
                };
              });

              let investment = 0;
              let marketValue = 0;
              let dayProfitLossValue = 0;
              let previousMarketValue = 0;
              let advanceValue = 0;
              let declineValue = 0;

              holdings.map((holding) => {
                const totalValue =
                  holding.quote && holding.quantity
                    ? holding.quote.price * holding.quantity
                    : 0;

                investment += holding.investment || 0;
                marketValue += totalValue;
                dayProfitLossValue +=
                  holding.quote && holding.quantity
                    ? holding.quote.change.value * holding.quantity
                    : 0;
                previousMarketValue +=
                  holding.quote && holding.quantity
                    ? holding.quote.close * holding.quantity
                    : 0;

                dayProfitLossValue >= 0 ? advanceValue++ : declineValue++;
              });

              const dayProfitLossPercentage =
                (dayProfitLossValue / previousMarketValue) * 100 || 0;
              const totalProfitLossValue = marketValue - investment;
              const totalProfitLossPercentage =
                (totalProfitLossValue / investment) * 100 || 0;
              const advancePercentage =
                (advanceValue / holdings.length) * 100 || 0;
              const declinePercentage =
                (declineValue / holdings.length) * 100 || 0;

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
                advance: {
                  percentage: advancePercentage,
                  value: advanceValue,
                },
                decline: {
                  percentage: declinePercentage,
                  value: declineValue,
                },
              };
            })
          );
      })
    );
  }
}
