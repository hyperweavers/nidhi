import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  distinctUntilKeyChanged,
  iif,
  map,
  merge,
  of,
  shareReplay,
  skip,
  switchMap,
  timer,
} from 'rxjs';

import { Constants } from '../../constants';
import { ChartData } from '../../models/chart';
import { Direction, MarketStatus, Status } from '../../models/market';
import { Stock } from '../../models/stock';
import {
  ChartResponseStatus,
  HistoricChartResponse,
  IntraDayChartResponse,
  MarketState,
  SearchResponse,
  StockResponse,
} from '../../models/vendor/mc';
import { ChartUtils } from '../../utils/chart.utils';
import { MarketUtils } from '../../utils/market.utils';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  public marketStatus$: Observable<MarketStatus>;

  private readonly MAX_CHART_HISTORY_IN_DAYS = 5 * 365; // 5 years

  private poll$: Observable<unknown>;
  private refresh$ = new BehaviorSubject(null);

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService,
  ) {
    this.marketStatus$ = this.settingsService.settings$
      .pipe(
        distinctUntilKeyChanged('refreshInterval'),
        switchMap(({ refreshInterval }) =>
          merge(timer(0, refreshInterval), this.refresh$.pipe(skip(1))),
        ),
      )
      .pipe(
        switchMap(() =>
          this.http
            .get<StockResponse>(Constants.api.MARKET_STATUS + 'CAT:US')
            .pipe(
              map(
                ({ data }): MarketStatus => ({
                  lastUpdated: data.lastupd_epoch,
                  status:
                    data.market_state === MarketState.LIVE
                      ? Status.OPEN
                      : Status.CLOSED,
                }),
              ),
            ),
        ),
      )
      .pipe(shareReplay(1));

    this.poll$ = this.marketStatus$.pipe(
      distinctUntilKeyChanged('status'),
      switchMap(({ status }) =>
        iif(
          () => status === Status.OPEN,
          this.settingsService.settings$.pipe(
            distinctUntilKeyChanged('refreshInterval'),
            switchMap(({ refreshInterval }) =>
              merge(timer(0, refreshInterval), this.refresh$.pipe(skip(1))),
            ),
          ),
          this.refresh$,
        ),
      ),
    );
  }

  public refresh(): void {
    this.refresh$.next(null);
  }

  public search(query: string): Observable<Stock[]> {
    return query
      ? this.http
          .get<
            SearchResponse[]
          >(Constants.api.STOCK_SEARCH + encodeURIComponent(query))
          .pipe(
            map((result) =>
              result.map(
                (searchResult): Stock => ({
                  name: searchResult.stock_name,
                  scripCode:
                    MarketUtils.extractScripCodesFromMcSearchResult(
                      searchResult.pdt_dis_nm,
                    ) ?? {},
                  vendorCode: {
                    mc: {
                      primary: searchResult.sc_id,
                    },
                  },
                }),
              ),
            ),
          )
      : of([]);
  }

  public getStock(code: string): Observable<Stock> {
    return this.poll$.pipe(
      switchMap(() =>
        this.http.get<StockResponse>(Constants.api.STOCK_QUOTE + code).pipe(
          map(
            ({ data }): Stock => ({
              name: data.name,
              scripCode: {
                ticker: data.ticker || undefined,
                country: data.symbol.split(':')[1] || undefined,
              },
              vendorCode: {
                mc: {
                  primary: data.symbol,
                },
              },
              details: {
                sector: data.sector,
              },
              quote: {
                lastUpdated: data.lastupd_epoch,
                price: MarketUtils.stringToNumber(data.current_price),
                change: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data.percent_change),
                  ),
                  percentage: MarketUtils.stringToNumber(data.percent_change),
                  value: MarketUtils.stringToNumber(data.net_change),
                },
                open: MarketUtils.stringToNumber(data.open),
                close: MarketUtils.stringToNumber(data.prev_close),
                low: MarketUtils.stringToNumber(data.low),
                high: MarketUtils.stringToNumber(data.high),
                fiftyTwoWeekLow: MarketUtils.stringToNumber(data['52wkLow']),
                fiftyTwoWeekHigh: MarketUtils.stringToNumber(data['52wkHigh']),
              },
              metrics: {
                marketCap: MarketUtils.stringToNumber(data.market_cap),
                dividendYield: MarketUtils.stringToNumber(data.dy),
              },
              performance: {
                yearToDate: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data.ytd_per_change),
                  ),
                  percentage: MarketUtils.stringToNumber(data.ytd_per_change),
                  value: MarketUtils.stringToNumber(data.ytd_change),
                },
                weekly: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data.weekly_per_change),
                  ),
                  percentage: MarketUtils.stringToNumber(
                    data.weekly_per_change,
                  ),
                  value: MarketUtils.stringToNumber(data.weekly_change),
                },
                monthly: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data.monthly_per_change),
                  ),
                  percentage: MarketUtils.stringToNumber(
                    data.monthly_per_change,
                  ),
                  value: MarketUtils.stringToNumber(data.monthly_change),
                },
                quarterly: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data['3months_per_change']),
                  ),
                  percentage: MarketUtils.stringToNumber(
                    data['3months_per_change'],
                  ),
                  value: MarketUtils.stringToNumber(data['3months_change']),
                },
                halfYearly: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(data['6months_per_change']),
                  ),
                  percentage: MarketUtils.stringToNumber(
                    data['6months_per_change'],
                  ),
                  value: MarketUtils.stringToNumber(data['6months_change']),
                },
                yearly: {
                  one: {
                    direction: MarketUtils.getDirection(
                      MarketUtils.stringToNumber(data.yearly_per_change),
                    ),
                    percentage: MarketUtils.stringToNumber(
                      data.yearly_per_change,
                    ),
                    value: MarketUtils.stringToNumber(data.yearly_change),
                  },
                  two: {
                    direction: MarketUtils.getDirection(
                      MarketUtils.stringToNumber(data['2years_per_change']),
                    ),
                    percentage: MarketUtils.stringToNumber(
                      data['2years_per_change'],
                    ),
                    value: MarketUtils.stringToNumber(data['2years_change']),
                  },
                  three: {
                    direction: MarketUtils.getDirection(
                      MarketUtils.stringToNumber(data['3years_per_change']),
                    ),
                    percentage: MarketUtils.stringToNumber(
                      data['3years_per_change'],
                    ),
                    value: MarketUtils.stringToNumber(data['3years_change']),
                  },
                  five: {
                    direction: MarketUtils.getDirection(
                      MarketUtils.stringToNumber(data['5years_per_change']),
                    ),
                    percentage: MarketUtils.stringToNumber(
                      data['5years_per_change'],
                    ),
                    value: MarketUtils.stringToNumber(data['5years_change']),
                  },
                },
              },
            }),
          ),
        ),
      ),
    );
  }

  // TODO: Pass currency as input (if possible resolution and from as well)
  public getHistoricalChart(symbol: string): Observable<ChartData[]> {
    if (symbol) {
      const from = ChartUtils.getTimestampSince(
        new Date(),
        this.MAX_CHART_HISTORY_IN_DAYS,
      );
      const to = Date.now();
      const queryParams = `symbol=${encodeURIComponent(symbol)}&from=${ChartUtils.epochToUtcTimestamp(from)}&to=${ChartUtils.epochToUtcTimestamp(to)}&countback=${MarketUtils.getBusinessDays(from, to)}`;

      return from > 0
        ? this.http
            .get<HistoricChartResponse>(
              Constants.api.STOCK_HISTORIC_CHART + queryParams,
            )
            .pipe(
              map(({ s, o, c, h, l, t }): ChartData[] => {
                return s === ChartResponseStatus.OK && t && t.length > 0
                  ? ([...new Set(t)].map((date, i) => {
                      const time = new Date(date).toLocaleDateString('en-CA', {
                        timeZone: 'Asia/Kolkata',
                      });
                      const previousDayClose = i > 0 ? c[i - 1] : undefined;
                      const todayClose = c[i];

                      let changeValue, changePercent;

                      if (previousDayClose) {
                        changeValue = todayClose - previousDayClose;
                        changePercent = (changeValue / previousDayClose) * 100;
                      }

                      return {
                        time,
                        open: o[i],
                        close: c[i],
                        high: h[i],
                        low: l[i],
                        value: c[i],
                        previousDayClose,
                        change:
                          changeValue !== undefined &&
                          changePercent !== undefined
                            ? {
                                direction:
                                  MarketUtils.getDirection(changePercent),
                                percentage: changePercent,
                                value: changeValue,
                              }
                            : undefined,
                        lineColor:
                          changePercent &&
                          MarketUtils.getDirection(changePercent) ===
                            Direction.UP
                            ? '#22c55e'
                            : '#ef4444',
                      };
                    }) as ChartData[])
                  : [];
              }),
            )
        : of([]);
    } else {
      console.error(`Invalid symbol: ${symbol}`);

      return of([]);
    }
  }

  // TODO: Get full data on initial request and partial data thereafter
  public getIntraDayChart(symbol: string): Observable<ChartData[]> {
    if (symbol) {
      return this.poll$.pipe(
        switchMap(() =>
          this.http
            .get<IntraDayChartResponse>(
              Constants.api.STOCK_INTRA_DAY_CHART + encodeURIComponent(symbol),
            )
            .pipe(
              map(({ s, data }): ChartData[] => {
                return s === ChartResponseStatus.OK && data && data.length > 0
                  ? (data as ChartData[])
                  : [];
              }),
            ),
        ),
      );
    } else {
      console.error(`Invalid symbol: ${symbol}`);

      return of([]);
    }
  }
}
