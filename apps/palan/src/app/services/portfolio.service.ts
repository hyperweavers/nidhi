import { Injectable, inject } from '@angular/core';
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

  constructor() {
    const storageService = inject(StorageService);
    const marketService = inject(MarketService);

    this.portfolio$ = from(storageService.stocks$)
      .pipe(
        switchMap((storageStocks) => {
          return storageStocks.length > 0
            ? marketService
                .getStock(storageStocks[0].vendorCode.mc.primary)
                .pipe(
                  map((marketStock: Stock): Portfolio => {
                    const holdings: Holding[] = [];

                    // Add two extra holdings split by ContributionSource (EMPLOYEE and EMPLOYER)
                    const allTx = storageStocks[0].transactions || [];

                    const buildHoldingFromTx = (
                      txs: typeof allTx,
                      suffix: string,
                    ): Holding => {
                      const qty =
                        txs.reduce(
                          (a, v) =>
                            v.type === TransactionType.BUY
                              ? a + v.quantity
                              : a - v.quantity,
                          0,
                        ) || 0;

                      const invest =
                        txs.reduce(
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

                      const avg = invest / qty || 0;
                      const totalPLValue =
                        ((marketStock.quote?.price || 0) - avg) * qty;
                      const totalPLPercentage =
                        (totalPLValue / invest) * 100 || 0;

                      return {
                        ...marketStock,
                        id: storageStocks[0].id
                          ? `${storageStocks[0].id}-${suffix}`
                          : uuid(),
                        name: `${storageStocks[0].name} - ${suffix}`,
                        transactions: txs,
                        quantity: qty,
                        averagePrice: avg,
                        investment: invest,
                        marketValue: (marketStock.quote?.price || 0) * qty,
                        totalProfitLoss: {
                          direction:
                            totalPLValue >= 0 ? Direction.UP : Direction.DOWN,
                          percentage: totalPLPercentage,
                          value: totalPLValue,
                        },
                      } as Holding;
                    };

                    const perSourceHoldings: Holding[] = [];

                    // Employee contributions
                    const employeeTx = allTx.filter(
                      (t) => t.source === ContributionSource.EMPLOYEE,
                    );
                    if (employeeTx.length > 0) {
                      perSourceHoldings.push(
                        buildHoldingFromTx(employeeTx, 'EMPLOYEE'),
                      );
                    }

                    // Employer contributions
                    const employerTx = allTx.filter(
                      (t) => t.source === ContributionSource.EMPLOYER,
                    );
                    if (employerTx.length > 0) {
                      perSourceHoldings.push(
                        buildHoldingFromTx(employerTx, 'EMPLOYER'),
                      );
                    }

                    // Append per-source holdings to the holdings array
                    holdings.push(...perSourceHoldings);

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
