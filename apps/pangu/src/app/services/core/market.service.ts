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
import { UTCTimestamp } from 'lightweight-charts';

import { Constants } from '../../constants';
import { Index } from '../../models/index';
import {
  CompanyDetails,
  Dashboard,
  DashboardQuery,
  History,
  IndexQuotes,
  SearchResult,
  VendorStatus,
} from '../../models/market';
import { MarketStatus, Status } from '../../models/market-status';
import { Stock } from '../../models/stock';
import { BasicChartData, ChartType, TechnicalChartData } from '../../models/chart';
import { MarketUtils } from '../../utils/market.utils';
import { ChartUtils } from '../../utils/chart.utils';
import { SettingsService } from './settings.service';

export enum ChartCategory {
  STOCK,
  INDEX,
}

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  public marketStatus$: Observable<MarketStatus>;

  private readonly MAX_CHART_HISTORY_IN_DAYS = 5*365; // 5 years

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
          this.http.get<IndexQuotes>(Constants.api.MARKET_STATUS).pipe(
            map(
              ({ marketStatusDto }): MarketStatus => ({
                lastUpdated: marketStatusDto.currentTime,
                status:
                  marketStatusDto.currentMarketStatus === VendorStatus.LIVE
                    ? Status.OPEN
                    : Status.CLOSED,
                startTime: MarketUtils.dateStringToEpoch(
                  marketStatusDto.tradingStartTime,
                ),
                endTime: MarketUtils.dateStringToEpoch(
                  marketStatusDto.tradingEndTime,
                ),
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

  public getStock(code: string, complete?: boolean): Observable<Stock | null> {
    return complete
      ? this.getStockDetails(code)
      : this.getStocks([code]).pipe(
          map((stocks) => (stocks.length > 0 ? stocks[0] : null)),
        );
  }

  public getIndex(code: string, complete?: boolean): Observable<Index | null> {
    return complete
      ? this.getIndexDetails(code)
      : this.getIndices([code]).pipe(
          map((indices) => (indices.length > 0 ? indices[0] : null)),
        );
  }

  public getStocks(codes: string[]): Observable<Stock[]> {
    const query: DashboardQuery = {
      companies: [...codes.map((id) => ({ id }))],
    };

    return this.poll$.pipe(
      switchMap(() =>
        this.getDashboard(query).pipe(
          map((dashboard): Stock[] => {
            const stocks = dashboard.companies || [];

            if (stocks.length <= 0) {
              return [];
            }

            return stocks.map((stock) => ({
              name: stock.companyName,
              vendorCode: {
                etm: stock.companyId,
              },
              scripCode: {
                nse: stock.scripCode2,
                bse: stock.scripCode,
              },
              quote: {
                nse: {
                  lastUpdated: stock.dateTimeLong,
                  price: MarketUtils.stringToNumber(stock.lastTradedPrice),
                  change: {
                    direction: MarketUtils.getDirection(
                      MarketUtils.stringToNumber(stock.percentChange),
                    ),
                    percentage: MarketUtils.stringToNumber(stock.percentChange),
                    value: MarketUtils.stringToNumber(stock.change),
                  },
                  close: MarketUtils.stringToNumber(stock.previousclose),
                  low: MarketUtils.stringToNumber(stock.low),
                  high: MarketUtils.stringToNumber(stock.high),
                  fiftyTwoWeekLow: MarketUtils.stringToNumber(
                    stock.fiftyTwoWeekLowPrice,
                  ),
                  fiftyTwoWeekHigh: MarketUtils.stringToNumber(
                    stock.fiftyTwoWeekHighPrice,
                  ),
                  volume: MarketUtils.stringToNumber(stock.volumeInK) * 1000,
                },
              },
            }));
          }),
        ),
      ),
    );
  }

  public getIndices(codes: string[]): Observable<Index[]> {
    const query: DashboardQuery = {
      indices: [...codes.map((id) => ({ id }))],
    };

    return this.poll$.pipe(
      switchMap(() =>
        this.getDashboard(query).pipe(
          map((dashboard): Index[] => {
            const indices = dashboard.indices || [];

            if (indices.length <= 0) {
              return [];
            }

            return indices.map((index) => ({
              id: index.indexid,
              name: index.indexName,
              exchange: MarketUtils.getExchange(index.exchange),
              quote: {
                lastUpdated: index.dateTimeLong,
                value: MarketUtils.stringToNumber(index.currentIndexValue),
                change: {
                  direction: MarketUtils.getDirection(
                    MarketUtils.stringToNumber(index.percentChange),
                  ),
                  percentage: MarketUtils.stringToNumber(index.percentChange),
                  value: MarketUtils.stringToNumber(index.netChange),
                },
                advance: {
                  percentage:
                    MarketUtils.stringToNumber(index.advancesPercentange) +
                    MarketUtils.stringToNumber(index.noChangePercentage),
                  value:
                    MarketUtils.stringToNumber(index.advances) +
                    MarketUtils.stringToNumber(index.noChange),
                },
                decline: {
                  percentage: MarketUtils.stringToNumber(
                    index.declinesPercentange,
                  ),
                  value: MarketUtils.stringToNumber(index.declines),
                },
              },
            }));
          }),
        ),
      ),
    );
  }

  public getGraph(symbol: string, type: ChartType, category: ChartCategory): Observable<BasicChartData[] | TechnicalChartData[]> {
    const url = (category === ChartCategory.STOCK) ? Constants.api.STOCK_CHART : Constants.api.INDEX_CHART;
    const from = ChartUtils.getTimestampSince(new Date(), this.MAX_CHART_HISTORY_IN_DAYS);
    const to = Date.now();
    const weekdays = MarketUtils.getWeekDays(from, to);
    const queryParams = `symbol=${symbol}&from=${ChartUtils.epochToUtcTimestamp(from)}&to=${ChartUtils.epochToUtcTimestamp(to)}&countback=${weekdays}`;

    return from > 0 && weekdays > 0 ? this.http.get<History>(url + queryParams).pipe(
      map(({ noData, t, o, c, h, l }): BasicChartData[] | TechnicalChartData[] => {
        return noData ? [] : (t.map((time, i) => {
          return type === ChartType.BASIC ? {
            time: time as UTCTimestamp,
            value: c[i],
          } : {
            time: time as UTCTimestamp,
            open: o[i],
            close: c[i],
            high: h[i],
            low: l[i],
          };
        }) as BasicChartData[] | TechnicalChartData[]);
      }),
    ) : of([]);
  }

  public search(query: string): Observable<Stock[]> {
    return this.http
      .get<SearchResult[]>(Constants.api.STOCK_SEARCH + query)
      .pipe(
        map((results) =>
          results.map((result) => ({
            name: result.tagName,
            vendorCode: {
              etm: result.tagId,
            },
            scripCode: {
              nse: result.symbol,
            },
          })),
        ),
      );
  }

  private getStockDetails(code: string): Observable<Stock> {
    return this.poll$.pipe(
      switchMap(() =>
        this.http.get<CompanyDetails>(Constants.api.STOCK_QUOTE + code).pipe(
          map(
            (companyDetails): Stock => ({
              complete: true, // Marking as complete though 'limits' is not filled due to unavailability of data in market api
              name: companyDetails.companyName,
              vendorCode: {
                etm: companyDetails.companyId,
              },
              scripCode: {
                nse: companyDetails.nseScripCode,
                bse: companyDetails.bseScripCode,
                isin: companyDetails.isinCode,
              },
              details: {
                sector: companyDetails.sectorName,
                industry: companyDetails.industryName,
              },
              quote: {
                nse: {
                  lastUpdated: companyDetails.nse.updatedDate,
                  price: companyDetails.nse.current,
                  change: {
                    direction: MarketUtils.getDirection(
                      companyDetails.nse.percentChange,
                    ),
                    percentage: companyDetails.nse.percentChange,
                    value: companyDetails.nse.absoluteChange,
                  },
                  open: companyDetails.nse.open,
                  close: companyDetails.nse.previousClose,
                  low: companyDetails.nse.low,
                  high: companyDetails.nse.high,
                  fiftyTwoWeekLow: companyDetails.nse.fiftyTwoWeekLowPrice,
                  fiftyTwoWeekHigh: companyDetails.nse.fiftyTwoWeekHighPrice,
                  volume: companyDetails.nse.volume,
                },
                bse: {
                  lastUpdated: companyDetails.bse.updatedDate,
                  price: companyDetails.bse.current,
                  change: {
                    direction: MarketUtils.getDirection(
                      companyDetails.bse.percentChange,
                    ),
                    percentage: companyDetails.bse.percentChange,
                    value: companyDetails.bse.absoluteChange,
                  },
                  open: companyDetails.bse.open,
                  close: companyDetails.bse.previousClose,
                  low: companyDetails.bse.low,
                  high: companyDetails.bse.high,
                  fiftyTwoWeekLow: companyDetails.bse.fiftyTwoWeekLowPrice,
                  fiftyTwoWeekHigh: companyDetails.bse.fiftyTwoWeekHighPrice,
                  volume: companyDetails.bse.volume,
                },
              },
              metrics: {
                nse: {
                  marketCapType: companyDetails.nse.marketCapType,
                  marketCap: companyDetails.nse.marketCap,
                  faceValue: companyDetails.nse.faceValue,
                  pe: companyDetails.nse.pe,
                  pb: companyDetails.nse.pb,
                  eps: companyDetails.nse.eps,
                  vwap: companyDetails.nse.vwap,
                  dividendYield: companyDetails.nse.dividendYield,
                  bookValue: companyDetails.nse.bookValue,
                },
                bse: {
                  marketCapType: companyDetails.bse.marketCapType,
                  marketCap: companyDetails.bse.marketCap,
                  faceValue: companyDetails.bse.faceValue,
                  pe: companyDetails.bse.pe,
                  pb: companyDetails.bse.pb,
                  eps: companyDetails.bse.eps,
                  vwap: companyDetails.bse.vwap,
                  dividendYield: companyDetails.bse.dividendYield,
                  bookValue: companyDetails.bse.bookValue,
                },
              },
              performance: {
                nse: {
                  weekly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.nse.performanceW1,
                    ),
                    percentage: companyDetails.nse.performanceW1,
                    value: companyDetails.nse.performanceValueW1,
                  },
                  monthly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.nse.performanceM1,
                    ),
                    percentage: companyDetails.nse.performanceM1,
                    value: companyDetails.nse.performanceValueM1,
                  },
                  quarterly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.nse.performanceM3,
                    ),
                    percentage: companyDetails.nse.performanceM3,
                    value: companyDetails.nse.performanceValueM3,
                  },
                  halfYearly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.nse.performanceM6,
                    ),
                    percentage: companyDetails.nse.performanceM6,
                    value: companyDetails.nse.performanceValueM6,
                  },
                  yearly: {
                    one: {
                      direction: MarketUtils.getDirection(
                        companyDetails.nse.performanceY1,
                      ),
                      percentage: companyDetails.nse.performanceY1,
                      value: companyDetails.nse.performanceValueY1,
                    },
                    three: {
                      direction: MarketUtils.getDirection(
                        companyDetails.nse.performanceY3,
                      ),
                      percentage: companyDetails.nse.performanceY3,
                      value: companyDetails.nse.performanceValueY3,
                    },
                    five: {
                      direction: MarketUtils.getDirection(
                        companyDetails.nse.performanceY5,
                      ),
                      percentage: companyDetails.nse.performanceY5,
                      value: companyDetails.nse.performanceValueY5,
                    },
                  },
                },
                bse: {
                  weekly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.bse.performanceW1,
                    ),
                    percentage: companyDetails.bse.performanceW1,
                    value: companyDetails.bse.performanceValueW1,
                  },
                  monthly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.bse.performanceM1,
                    ),
                    percentage: companyDetails.bse.performanceM1,
                    value: companyDetails.bse.performanceValueM1,
                  },
                  quarterly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.bse.performanceM3,
                    ),
                    percentage: companyDetails.bse.performanceM3,
                    value: companyDetails.bse.performanceValueM3,
                  },
                  halfYearly: {
                    direction: MarketUtils.getDirection(
                      companyDetails.bse.performanceM6,
                    ),
                    percentage: companyDetails.bse.performanceM6,
                    value: companyDetails.bse.performanceValueM6,
                  },
                  yearly: {
                    one: {
                      direction: MarketUtils.getDirection(
                        companyDetails.bse.performanceY1,
                      ),
                      percentage: companyDetails.bse.performanceY1,
                      value: companyDetails.bse.performanceValueY1,
                    },
                    three: {
                      direction: MarketUtils.getDirection(
                        companyDetails.bse.performanceY3,
                      ),
                      percentage: companyDetails.bse.performanceY3,
                      value: companyDetails.bse.performanceValueY3,
                    },
                    five: {
                      direction: MarketUtils.getDirection(
                        companyDetails.bse.performanceY5,
                      ),
                      percentage: companyDetails.bse.performanceY5,
                      value: companyDetails.bse.performanceValueY5,
                    },
                  },
                },
              },
            }),
          ),
        ),
      ),
    );
  }

  private getIndexDetails(code: string): Observable<Index> {
    return this.poll$.pipe(
      switchMap(() =>
        this.http.get<IndexQuotes>(Constants.api.INDEX_QUOTES + code).pipe(
          map(
            ({ indicesList }): Index => ({
              complete: true,
              id: indicesList[0].indexId,
              name: indicesList[0].indexName,
              exchange: MarketUtils.getExchange(indicesList[0].exchange),
              quote: {
                lastUpdated: MarketUtils.dateStringToEpoch(
                  indicesList[0].dateTime,
                ),
                value: indicesList[0].lastTradedPrice,
                change: {
                  direction: MarketUtils.getDirection(
                    indicesList[0].percentChange,
                  ),
                  percentage: indicesList[0].percentChange,
                  value: indicesList[0].netChange,
                },
                advance: {
                  percentage: indicesList[0].advancesPerChange,
                  value: indicesList[0].advances,
                },
                decline: {
                  percentage: indicesList[0].declinesPerChange,
                  value: indicesList[0].declines,
                },
              },
              performance: {
                weekly: {
                  direction: MarketUtils.getDirection(indicesList[0].r1Week),
                  percentage: indicesList[0].r1Week,
                  value: indicesList[0].change1Week,
                },
                monthly: {
                  direction: MarketUtils.getDirection(indicesList[0].r1Month),
                  percentage: indicesList[0].r1Month,
                  value: indicesList[0].change1Month,
                },
                quarterly: {
                  direction: MarketUtils.getDirection(indicesList[0].r3Month),
                  percentage: indicesList[0].r3Month,
                  value: indicesList[0].change3Month,
                },
                halfYearly: {
                  direction: MarketUtils.getDirection(indicesList[0].r6Month),
                  percentage: indicesList[0].r6Month,
                  value: indicesList[0].change6Month,
                },
                yearly: {
                  one: {
                    direction: MarketUtils.getDirection(indicesList[0].r1Year),
                    percentage: indicesList[0].r1Year,
                    value: indicesList[0].change1Year,
                  },
                  three: {
                    direction: MarketUtils.getDirection(indicesList[0].r3Year),
                    percentage: indicesList[0].r3Year,
                    value: indicesList[0].change3Year,
                  },
                  five: {
                    direction: MarketUtils.getDirection(indicesList[0].r5Year),
                    percentage: indicesList[0].r5Year,
                    value: indicesList[0].change5Year,
                  },
                },
              },
            }),
          ),
        ),
      ),
    );
  }

  private getDashboard(query: DashboardQuery): Observable<Dashboard> {
    return this.http.post<Dashboard>(Constants.api.DASHBOARD, query);
  }
}
