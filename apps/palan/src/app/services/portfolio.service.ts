import { Injectable } from '@angular/core';
import { Observable, from, map, of, shareReplay, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Direction } from '../models/market';
import {
  ContributionSource,
  Holding,
  Portfolio,
  TransactionType,
} from '../models/portfolio';
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
          return storageStocks.length > 0
            ? marketService
                .getStock(storageStocks[0].vendorCode.mc.primary)
                .pipe(
                  map((marketStock: Stock): Portfolio => {
                    const quantity =
                      storageStocks[0].transactions.reduce(
                        (a, v) =>
                          v.type === TransactionType.BUY
                            ? a + v.quantity
                            : a - v.quantity,
                        0,
                      ) || 0;
                    const holdingInvestment =
                      storageStocks[0].transactions
                        .filter((t) => t.source === ContributionSource.EMPLOYEE)
                        .reduce(
                          (a, v) =>
                            v.type === TransactionType.BUY
                              ? a +
                                v.price.value * v.quantity +
                                (v.charges?.value || 0)
                              : a -
                                v.price.value * v.quantity -
                                (v.charges?.value || 0),
                          0,
                        ) || 0;
                    const averagePrice = holdingInvestment / quantity || 0;
                    const holdingTotalProfitLossValue =
                      ((marketStock.quote?.price || 0) - averagePrice) *
                      quantity;
                    const holdingTotalProfitLossPercentage =
                      (holdingTotalProfitLossValue / holdingInvestment) * 100 ||
                      0;

                    const holdings: Holding[] = [
                      {
                        ...marketStock,
                        id: storageStocks[0].id || uuid(),
                        transactions: storageStocks[0].transactions || [],
                        quantity,
                        averagePrice,
                        investment: holdingInvestment,
                        marketValue: (marketStock.quote?.price || 0) * quantity,
                        totalProfitLoss: {
                          direction:
                            holdingTotalProfitLossValue >= 0
                              ? Direction.UP
                              : Direction.DOWN,
                          percentage: holdingTotalProfitLossPercentage,
                          value: holdingTotalProfitLossValue,
                        },
                      },
                    ];

                    let investment = 0;
                    let marketValue = 0;
                    let dayProfitLossValue = 0;
                    let previousMarketValue = 0;

                    holdings.map((holding) => {
                      const totalValue =
                        (holding.quote?.price || 0) * (holding.quantity || 0);

                      investment += holding.investment || 0;
                      marketValue += totalValue;

                      dayProfitLossValue +=
                        (holding.quote?.change?.value || 0) *
                        (holding.quantity || 0);

                      previousMarketValue +=
                        (holding.quote?.close || 0) * (holding.quantity || 0);
                    });

                    const dayProfitLossPercentage =
                      (dayProfitLossValue / previousMarketValue) * 100 || 0;
                    const totalProfitLossValue = marketValue - investment;
                    const totalProfitLossPercentage =
                      (totalProfitLossValue / investment) * 100 || 0;

                    return {
                      holdings,
                      investment,
                      marketValue,
                      dayProfitLoss: {
                        direction:
                          dayProfitLossValue >= 0
                            ? Direction.UP
                            : Direction.DOWN,
                        percentage: dayProfitLossPercentage,
                        value: dayProfitLossValue,
                      },
                      totalProfitLoss: {
                        direction:
                          totalProfitLossValue >= 0
                            ? Direction.UP
                            : Direction.DOWN,
                        percentage: totalProfitLossPercentage,
                        value: totalProfitLossValue,
                      },
                    };
                  }),
                )
            : of({
                holdings: [],
                investment: 0,
                marketValue: 0,
                dayProfitLoss: {
                  direction: Direction.UP,
                  percentage: 0,
                  value: 0,
                },
                totalProfitLoss: {
                  direction: Direction.UP,
                  percentage: 0,
                  value: 0,
                },
              });
        }),
      )
      .pipe(shareReplay(1));
  }
}
