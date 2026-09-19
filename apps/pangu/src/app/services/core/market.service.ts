import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { LOGGER } from '@nidhi/shared-logger';
import {
  BehaviorSubject,
  Observable,
  distinctUntilKeyChanged,
  forkJoin,
  iif,
  map,
  merge,
  of,
  shareReplay,
  skip,
  switchMap,
  timer,
} from 'rxjs';

import {
  CompanyDetails,
  Dashboard,
  DashboardQuery,
  ExchangeCode,
  ExchangeCodeToNameMap,
  ExchangeNameToCodeMap,
  History,
  IndexConstituents,
  IndexDetails,
  IndexQuotes,
  IntraDay,
  IntraDayStatus,
  PeriodFrequencyQueryParamMap,
  PeriodMap,
  PeriodQueryParam,
  ScreenerFieldMappingResponse,
  ScreenerPreviewResponse,
  SearchResult,
  SearchResultSecondary,
  StockPeerChart,
  VendorStatus,
} from '../../adapters/market.adapter';
import { Constants } from '../../constants';
import {
  ChartCategory,
  ChartData,
  PeerChartData,
  Period,
} from '../../models/chart';
import { Index } from '../../models/index';
import { FinancialType } from '../../models/ipo';
import {
  Direction,
  ExchangeName,
  INDICES,
  MarketStatus,
  Status,
} from '../../models/market';
import { Quote, Stock } from '../../models/stock';
import {
  BsResponse,
  CfResponse,
  DraftIpoResponse,
  IpoCalendarResponse,
  IpoDetailsResponse,
  IpoLinksResponse,
  ListedIposOverviewResponse,
  ListingSoonIpoResponse,
  OpenIpoOverviewResponse,
  PnlResponse,
  QuarterlyResponse,
  UpcomingIpoOverviewResponse,
} from '../../models/vendor/etm';
import { ChartUtils } from '../../utils/chart.utils';
import { MarketUtils } from '../../utils/market.utils';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);
  private readonly logger = inject(LOGGER);

  public marketStatus$: Observable<MarketStatus>;

  private readonly MAX_CHART_HISTORY_IN_DAYS = 5 * 365; // 5 years

  private poll$: Observable<unknown>;
  private refresh$ = new BehaviorSubject(null);

  constructor() {
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
                lastUpdated: marketStatusDto?.currentTime ?? '',
                status:
                  marketStatusDto?.currentMarketStatus === VendorStatus.LIVE
                    ? Status.OPEN
                    : Status.CLOSED,
                startTime: MarketUtils.dateStringToEpoch(
                  marketStatusDto?.tradingStartTime ?? '',
                ),
                endTime: MarketUtils.dateStringToEpoch(
                  marketStatusDto?.tradingEndTime ?? '',
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
    if (!code) {
      this.logger.error('getStock called without a stock code!');

      return of(null);
    }

    return complete
      ? this.getStockDetails(code)
      : this.getStocks([code]).pipe(
          map((stocks) => (stocks.length > 0 ? stocks[0] : null)),
        );
  }

  public getIndex(
    code: string,
    exchange: ExchangeName,
    complete?: boolean,
  ): Observable<Index | null> {
    return complete
      ? this.getIndexDetails(code, exchange)
      : this.getIndices([code]).pipe(
          map((indices) => (indices.length > 0 ? indices[0] : null)),
        );
  }

  public getStocks(codes: string[]): Observable<Stock[]> {
    const validCodes = codes.filter(Boolean);

    if (validCodes.length === 0) {
      this.logger.error('getStocks called without any stock codes!');

      return of([]);
    }

    const query: DashboardQuery = {
      companies: [...validCodes.map((id) => ({ id }))],
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
              scripCode: {
                nse: stock.nseScripdCode
                  ? stock.nseScripdCode.toUpperCase().endsWith('EQ')
                    ? stock.nseScripdCode.slice(0, -2)
                    : stock.nseScripdCode
                  : undefined,
                bse: stock.scripCode || undefined,
              },
              vendorCode: {
                etm: {
                  primary: stock.companyId,
                  chart: stock.nseScripdCode,
                },
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

  public getMainIndices(): Observable<Index[]> {
    const indexSymbols = [];
    const niftyFifty = INDICES.nse.find((index) => index.main === true);
    const sensex = INDICES.bse.find((index) => index.main === true);

    if (niftyFifty) {
      indexSymbols.push(niftyFifty.etm.id);
    }

    if (sensex) {
      indexSymbols.push(sensex.etm.id);
    }

    return this.getIndices(indexSymbols);
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
              exchange: ExchangeCodeToNameMap[index.exchange as ExchangeCode],
              vendorCode: {
                etm: {
                  primary: index.indexid,
                },
              },
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

  public getHistoricalChart(
    symbol: string,
    category: ChartCategory,
  ): Observable<ChartData[]> {
    const vendorSymbol =
      category === ChartCategory.STOCK
        ? symbol
        : [...INDICES.nse, ...INDICES.bse].find(
            (index) => index.etm.id === symbol,
          )?.etm.symbol || '';

    if (vendorSymbol) {
      const url =
        category === ChartCategory.STOCK
          ? Constants.api.STOCK_HISTORIC_CHART
          : Constants.api.INDEX_HISTORIC_CHART;
      const from = ChartUtils.getTimestampSince(
        new Date(),
        this.MAX_CHART_HISTORY_IN_DAYS,
      );
      const to = Date.now();
      const queryParams = `symbol=${encodeURIComponent(vendorSymbol)}&from=${ChartUtils.epochToUtcTimestamp(from)}&to=${ChartUtils.epochToUtcTimestamp(to)}`;

      return from > 0
        ? this.http.get<History>(url + queryParams).pipe(
            map(({ noData, dates, o, c, h, l, v }): ChartData[] => {
              return noData
                ? []
                : ([...new Set(dates ?? [])].map((date, i) => {
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
                      volume: v[i],
                      previousDayClose,
                      change:
                        changeValue !== undefined && changePercent !== undefined
                          ? {
                              direction:
                                MarketUtils.getDirection(changePercent),
                              percentage: changePercent,
                              value: changeValue,
                            }
                          : undefined,
                      lineColor:
                        changePercent &&
                        MarketUtils.getDirection(changePercent) === Direction.UP
                          ? '#22c55e'
                          : '#ef4444',
                    };
                  }) as ChartData[]);
            }),
          )
        : of([]);
    } else {
      this.logger.error(`Stock / Index not found for symbol: ${symbol}`);

      return of([]);
    }
  }

  // TODO: Get full data on initial request and partial data thereafter
  public getIntraDayChart(
    symbol: string,
    category: ChartCategory,
  ): Observable<ChartData[]> {
    const vendorSymbol =
      category === ChartCategory.STOCK
        ? symbol
        : [...INDICES.nse, ...INDICES.bse].find(
            (index) => index.etm.id === symbol,
          )?.mc?.symbol || '';

    if (symbol) {
      const url =
        category === ChartCategory.STOCK
          ? Constants.api.STOCK_INTRA_DAY_CHART
          : Constants.api.INDEX_INTRA_DAY_CHART;
      const day = MarketUtils.getLastBusinessDay(new Date());
      const from = day.setHours(9, 15, 0, 0); // 9:15 AM IST
      const to = day.setHours(15, 30, 0, 0); // 3:30 PM IST
      const queryParams = `${encodeURIComponent(vendorSymbol)}&from=${ChartUtils.epochToUtcTimestamp(from)}&to=${ChartUtils.epochToUtcTimestamp(to)}`;

      return from > 0
        ? this.poll$.pipe(
            switchMap(() =>
              this.http.get<IntraDay>(url + queryParams).pipe(
                map(({ s, data }): ChartData[] => {
                  return s === IntraDayStatus.OK && data && data.length > 0
                    ? (data as ChartData[])
                    : [];
                }),
              ),
            ),
          )
        : of([]);
    } else {
      this.logger.error(`Stock / Index not found for symbol: ${symbol}`);

      return of([]);
    }
  }

  public search(query: string): Observable<Stock[]> {
    return query
      ? this.http.get<SearchResult[]>(Constants.api.STOCK_SEARCH + query).pipe(
          map((results) =>
            results
              .filter((result) => result.entityType === 'company')
              .map(
                (stock): Stock => ({
                  name: stock.tagName,
                  vendorCode: {
                    etm: {
                      primary: stock.tagId,
                      chart: stock.symbol,
                    },
                  },
                  scripCode: {},
                  quote: {
                    nse: {
                      price: MarketUtils.stringToNumber(stock.lastTradedPrice),
                      change: {
                        direction: MarketUtils.getDirection(
                          MarketUtils.stringToNumber(stock.percentChange),
                        ),
                        percentage: MarketUtils.stringToNumber(
                          stock.percentChange,
                        ),
                        value: MarketUtils.stringToNumber(stock.NetChange),
                      },
                    },
                  },
                }),
              ),
          ),
        )
      : of([]);
  }

  public searchSecondary(query: string): Observable<Stock[]> {
    return query
      ? this.http
          .get<SearchResultSecondary>(
            Constants.api.STOCK_SEARCH_SECONDARY + query,
          )
          .pipe(
            map(
              ({ result }): Stock[] =>
                result?.map(
                  (searchResult): Stock => ({
                    name: searchResult.fullnm || searchResult.name,
                    vendorCode: {
                      etm: {
                        primary: '',
                      },
                      mc: {
                        primary: searchResult.id,
                      },
                    },
                    scripCode: {
                      isin: searchResult.isinid || undefined,
                      nse: searchResult.nseid || undefined,
                      bse:
                        parseInt(searchResult.bseid) !== 0
                          ? searchResult.bseid
                          : undefined,
                    },
                  }),
                ) ?? [],
            ),
          )
      : of([]);
  }

  public getHistoricPeerChart(
    symbols: string[],
    period: Period,
  ): Observable<PeerChartData[]> {
    if (period === Period.ONE_DAY) {
      this.logger.error(`Period not supported: ${period}`);

      return of([]);
    }

    if (symbols?.length > 0) {
      const periodQueryParam = PeriodMap[period] || '';
      const frequency =
        PeriodFrequencyQueryParamMap[periodQueryParam as PeriodQueryParam] ||
        '';
      const queryParams = `scripcode=${encodeURIComponent(symbols.join(','))}&period=${periodQueryParam}&frequency=${frequency}`;

      if (periodQueryParam && frequency) {
        return this.http
          .get<StockPeerChart>(
            Constants.api.STOCK_HISTORIC_PEER_CHART + queryParams,
          )
          .pipe(
            map(({ results }): PeerChartData[] => {
              return results && results.length > 0
                ? results.map(
                    ({ companydata, quoteData }): PeerChartData => ({
                      symbol: companydata?.scripcode ?? '',
                      data:
                        quoteData?.map(
                          (quoteData): ChartData => ({
                            time: new Date(quoteData.Date).toLocaleDateString(
                              'en-CA',
                              {
                                timeZone: 'Asia/Kolkata',
                              },
                            ),
                            value: quoteData.Close || quoteData.close || 0,
                          }),
                        ) ?? [],
                    }),
                  )
                : [];
            }),
          );
      } else {
        this.logger.error(`Unable to map period with frequency: ${period}`);

        return of([]);
      }
    } else {
      this.logger.error(`Stock symbol list is empty: ${symbols}`);

      return of([]);
    }
  }

  public getIntraDayPeerChart(symbols: string[]): Observable<PeerChartData[]> {
    if (symbols?.length > 0) {
      return this.http
        .get<StockPeerChart>(
          Constants.api.STOCK_INTRA_DAY_PEER_CHART +
            encodeURIComponent(symbols.join(',')),
        )
        .pipe(
          map(({ results }): PeerChartData[] => {
            return results && results.length > 0
              ? results.map(
                  ({ companydata, quoteData }): PeerChartData => ({
                    symbol: companydata?.scripcode ?? '',
                    data:
                      quoteData?.map(
                        (quoteData): ChartData => ({
                          time: new Date(quoteData.Date).toLocaleDateString(
                            'en-CA',
                            {
                              timeZone: 'Asia/Kolkata',
                            },
                          ),
                          value: quoteData.Close || quoteData.close || 0,
                        }),
                      ) ?? [],
                  }),
                )
              : [];
          }),
        );
    } else {
      this.logger.error(`Stock symbol list is empty: ${symbols}`);

      return of([]);
    }
  }

  private getStockDetails(code: string): Observable<Stock> {
    return this.poll$.pipe(
      switchMap(() =>
        this.http.get<CompanyDetails>(Constants.api.STOCK_QUOTE + code).pipe(
          map(
            (companyDetails): Stock => ({
              name: companyDetails.companyName,
              scripCode: {
                nse: companyDetails.nseScripCode
                  ? companyDetails.nseScripCode.toUpperCase().endsWith('EQ')
                    ? companyDetails.nseScripCode.slice(0, -2)
                    : companyDetails.nseScripCode
                  : undefined,
                bse: companyDetails.bseScripCode || undefined,
                isin: companyDetails.isinCode || undefined,
              },
              vendorCode: {
                etm: {
                  primary: companyDetails.companyId,
                  chart:
                    (companyDetails.nseScripCode && companyDetails.nse
                      ? companyDetails.nse.symbol
                      : companyDetails.bse?.symbol) || undefined,
                },
              },
              details: {
                sector: {
                  id: String(companyDetails.sectorId),
                  name: companyDetails.sectorName,
                },
                industry: {
                  id: companyDetails.industryId,
                  name: companyDetails.industryName,
                },
                marketCapType:
                  companyDetails.nse?.marketCapType ||
                  companyDetails.bse?.marketCapType ||
                  '',
              },
              quote: {
                nse: companyDetails.nse
                  ? {
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
                      fiftyTwoWeekHigh:
                        companyDetails.nse.fiftyTwoWeekHighPrice,
                      volume: companyDetails.nse.volume,
                    }
                  : undefined,
                bse: companyDetails.bse
                  ? {
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
                      fiftyTwoWeekHigh:
                        companyDetails.bse.fiftyTwoWeekHighPrice,
                      volume: companyDetails.bse.volume,
                    }
                  : undefined,
              },
              metrics: {
                nse: companyDetails.nse
                  ? {
                      marketCap: companyDetails.nse.marketCap,
                      faceValue: companyDetails.nse.faceValue,
                      pe: companyDetails.nse.pe,
                      pb: companyDetails.nse.pb,
                      eps: companyDetails.nse.eps,
                      vwap: companyDetails.nse.vwap,
                      dividendYield: companyDetails.nse.dividendYield,
                      bookValue: companyDetails.nse.bookValue,
                    }
                  : undefined,
                bse: companyDetails.bse
                  ? {
                      marketCap: companyDetails.bse.marketCap,
                      faceValue: companyDetails.bse.faceValue,
                      pe: companyDetails.bse.pe,
                      pb: companyDetails.bse.pb,
                      eps: companyDetails.bse.eps,
                      vwap: companyDetails.bse.vwap,
                      dividendYield: companyDetails.bse.dividendYield,
                      bookValue: companyDetails.bse.bookValue,
                    }
                  : undefined,
              },
              performance: {
                nse: companyDetails.nse
                  ? {
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
                    }
                  : undefined,
                bse: companyDetails.bse
                  ? {
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
                    }
                  : undefined,
              },
            }),
          ),
        ),
      ),
    );
  }

  private getIndexDetails(
    code: string,
    exchange: ExchangeName,
  ): Observable<Index> {
    return this.poll$.pipe(
      switchMap(() =>
        forkJoin({
          index: this.http
            .get<IndexDetails>(Constants.api.INDEX_QUOTE + code)
            .pipe(
              map(
                (indexDetails): Index => ({
                  id: indexDetails.assetId,
                  name: indexDetails.assetName,
                  exchange:
                    ExchangeCodeToNameMap[
                      indexDetails.assetExchangeId as ExchangeCode
                    ],
                  vendorCode: {
                    etm: {
                      primary: indexDetails.assetId,
                    },
                  },
                  quote: {
                    lastUpdated: indexDetails.dateTime,
                    value: indexDetails.lastTradedPrice,
                    change: {
                      direction: MarketUtils.getDirection(
                        indexDetails.percentChange,
                      ),
                      percentage: indexDetails.percentChange,
                      value: indexDetails.netChange,
                    },
                    open: indexDetails.keyMetrics?.openPrice ?? 0,
                    close: indexDetails.keyMetrics?.previousClose ?? 0,
                    low: indexDetails.keyMetrics?.lowPrice ?? 0,
                    high: indexDetails.keyMetrics?.highPrice ?? 0,
                    fiftyTwoWeekLow: indexDetails.fiftyTwoWeekLow,
                    fiftyTwoWeekHigh: indexDetails.fiftyTwoWeekHigh,
                    advance: {
                      percentage: indexDetails.advancesPercentage,
                      value: indexDetails.advances,
                    },
                    decline: {
                      percentage: indexDetails.declinesPercentage,
                      value: indexDetails.declines,
                    },
                  },
                  metrics: {
                    marketCap: indexDetails.keyMetrics?.marketCap ?? 0,
                    pe: indexDetails.keyMetrics?.peRatio ?? 0,
                    pb: indexDetails.keyMetrics?.pbRatio ?? 0,
                    dividendYield: indexDetails.keyMetrics?.dividendYield ?? 0,
                  },
                  performance: {
                    weekly: {
                      direction: MarketUtils.getDirection(indexDetails.r1Week),
                      percentage: indexDetails.r1Week,
                      value: indexDetails.change1Week,
                    },
                    monthly: {
                      direction: MarketUtils.getDirection(indexDetails.r1Month),
                      percentage: indexDetails.r1Month,
                      value: indexDetails.change1Month,
                    },
                    quarterly: {
                      direction: MarketUtils.getDirection(indexDetails.r3Month),
                      percentage: indexDetails.r3Month,
                      value: indexDetails.change3Month,
                    },
                    halfYearly: {
                      direction: MarketUtils.getDirection(indexDetails.r6Month),
                      percentage: indexDetails.r6Month,
                      value: indexDetails.change6Month,
                    },
                    yearly: {
                      one: {
                        direction: MarketUtils.getDirection(
                          indexDetails.r1Year,
                        ),
                        percentage: indexDetails.r1Year,
                        value: indexDetails.change1Year,
                      },
                      three: {
                        direction: MarketUtils.getDirection(
                          indexDetails.r3Year,
                        ),
                        percentage: indexDetails.r3Year,
                        value: indexDetails.change3Year,
                      },
                      five: {
                        direction: MarketUtils.getDirection(
                          indexDetails.r5Year,
                        ),
                        percentage: indexDetails.r5Year,
                        value: indexDetails.change5Year,
                      },
                    },
                  },
                }),
              ),
            ),
          constituents: this.http
            .get<IndexConstituents>(
              Constants.api.INDEX_CONSTITUENTS +
                `exchange=${ExchangeNameToCodeMap[exchange] || ''}&indexid=${code}&sortby=netChange`,
            )
            .pipe(
              map(({ searchresult }): Stock[] => {
                const companies = searchresult?.[0]?.companies;

                return companies && companies.length > 0
                  ? companies.map((company): Stock => {
                      const quote: Quote = {
                        price: company.current,
                        change: {
                          direction: MarketUtils.getDirection(
                            company.percentChange,
                          ),
                          percentage: company.percentChange,
                          value: company.change,
                        },
                        volume: company.volumeInLacs * 100000,
                      };

                      const stock: Stock = {
                        name: company.companyName,
                        vendorCode: {
                          etm: {
                            primary: company.companyId,
                            chart: company.symbol,
                          },
                        },
                        scripCode: {
                          nse:
                            exchange === ExchangeName.NSE &&
                            company.nseScripCode
                              ? company.nseScripCode
                              : undefined,
                          bse:
                            exchange === ExchangeName.BSE &&
                            company.bseScripCode
                              ? company.bseScripCode
                              : undefined,
                        },
                        quote: {
                          nse:
                            exchange === ExchangeName.NSE ? quote : undefined,
                          bse:
                            exchange === ExchangeName.BSE ? quote : undefined,
                        },
                      };

                      return stock;
                    })
                  : [];
              }),
            ),
        }).pipe(
          map(({ index, constituents }) => ({
            ...index,
            constituents,
          })),
        ),
      ),
    );
  }

  private getDashboard(query: DashboardQuery): Observable<Dashboard> {
    return this.http.post<Dashboard>(Constants.api.DASHBOARD, query);
  }

  // === Screener raw HTTP methods (vendor ETM types via adapter) ===

  public getScreenerFieldMapping(): Observable<ScreenerFieldMappingResponse> {
    return this.http.get<ScreenerFieldMappingResponse>(
      Constants.api.SCREENER_FIELDS,
    );
  }

  public getScreenerPreview(
    queryCondition: string,
    pagesize = 20,
    pageno = 1,
  ): Observable<ScreenerPreviewResponse> {
    return this.http.post<ScreenerPreviewResponse>(Constants.api.SCREENER, {
      pagesize,
      pageno,
      queryCondition,
    });
  }

  // === IPO raw HTTP methods ===

  public getIpoCalendar(calendarKey: string): Observable<IpoCalendarResponse> {
    return this.http.get<IpoCalendarResponse>(
      `${Constants.api.IPO_CALENDAR}${calendarKey}`,
    );
  }

  public getIpoDetails(companyId: string): Observable<IpoDetailsResponse> {
    return this.http.get<IpoDetailsResponse>(
      `${Constants.api.IPO_DETAILS}${companyId}`,
    );
  }

  public getIpoDetailsOnly(companyId: string): Observable<IpoLinksResponse> {
    return this.http.get<IpoLinksResponse>(
      `${Constants.api.IPO_DETAILS_ONLY}${companyId}`,
    );
  }

  public getIpoListedOverview(): Observable<ListedIposOverviewResponse> {
    return this.http.get<ListedIposOverviewResponse>(Constants.api.IPO_LISTED);
  }

  public getIpoOverviewOpen(pageNo = 1): Observable<OpenIpoOverviewResponse> {
    return this.http.get<OpenIpoOverviewResponse>(
      `${Constants.api.IPO_OVERVIEW}?section=open&pageSize=5&pageNo=${pageNo}`,
    );
  }

  public getIpoOverviewUpcoming(): Observable<UpcomingIpoOverviewResponse> {
    return this.http.get<UpcomingIpoOverviewResponse>(
      `${Constants.api.IPO_OVERVIEW}?section=upcoming&pageSize=1000`,
    );
  }

  public getIpoOverviewListing(): Observable<ListingSoonIpoResponse> {
    return this.http.get<ListingSoonIpoResponse>(
      `${Constants.api.IPO_OVERVIEW}?section=listing&pageSize=1000`,
    );
  }

  public getIpoDraftIssues(
    page = 1,
    limit = Constants.configs.defaults.IPO_DRAFT_PAGE_SIZE,
  ): Observable<DraftIpoResponse> {
    return this.http.get<DraftIpoResponse>(
      `${Constants.api.IPO_DRAFT}?page=${page}&limit=${limit}`,
    );
  }

  public getIpoStockQuote(
    companyId: string,
  ): Observable<CompanyDetails | null> {
    return this.http.get<CompanyDetails | null>(
      `${Constants.api.STOCK_QUOTE}${companyId}`,
    );
  }

  public getIpoFinancials(
    companyId: string,
    type = 'standalone',
  ): Observable<{
    pnl: PnlResponse;
    quarterly: QuarterlyResponse;
    bs: BsResponse;
    cf: CfResponse;
  }> {
    const typeParam =
      type && type !== FinancialType.CONSOLIDATED ? `&type=${type}` : '';
    const base = Constants.api.IPO_FINANCIALS;
    const params = `?currencyformat=crores&year=0&noofyears=0&companyid=${companyId}${typeParam}`;

    return forkJoin({
      pnl: this.http.get<PnlResponse>(
        `${base}/GetProfitAndLossStatementInCurrencyFormat.json${params}`,
      ),
      quarterly: this.http.get<QuarterlyResponse>(
        `${base}/GetQuarterlyResultsInCurrencyFormat.json?currencyformat=crores&companyid=${companyId}${typeParam}`,
      ),
      bs: this.http.get<BsResponse>(
        `${base}/GetBalanceSheetInCurrencyFormat.json${params}`,
      ),
      cf: this.http.get<CfResponse>(
        `${base}/GetCompanyCashFlowInCurrencyFormat.json?currencyformat=crores&noofyears=0&companyid=${companyId}${typeParam}`,
      ),
    });
  }
}
