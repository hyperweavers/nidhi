import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Constants } from '../../constants';
import { Index } from '../../models/index';
import {
  CompanyDetails,
  Dashboard,
  DashboardQuery,
  OperatingStatus,
  SearchResult,
  VendorStatus,
} from '../../models/market';
import { MarketStatus, Status } from '../../models/market-status';
import { Stock } from '../../models/stock';
import { MarketUtils } from '../../utils/market.utils';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  constructor(private http: HttpClient) {}

  public getStatus(): Observable<MarketStatus> {
    return this.http
      .get<OperatingStatus>(Constants.api.MARKET_STATUS + Date.now())
      .pipe(
        map(
          (operatingStatus): MarketStatus => ({
            lastUpdated: MarketUtils.dateStringToEpoch(operatingStatus.Date),
            status:
              operatingStatus.currentMarketStatus === VendorStatus.LIVE
                ? Status.OPEN
                : Status.CLOSED,
            startTime: MarketUtils.dateStringToEpoch(
              operatingStatus.tradingStartTime,
            ),
            endTime: MarketUtils.dateStringToEpoch(
              operatingStatus.tradingEndTime,
            ),
          }),
        ),
      );
  }

  public getStockDetails(code: string): Observable<Stock> {
    return this.http.get<CompanyDetails>(Constants.api.STOCK_QUOTE + code).pipe(
      map(
        (companyDetails): Stock => ({
          complete: true,
          name: companyDetails.companyName,
          vendorCode: {
            etm: companyDetails.companyId,
          },
          scripCode: {
            nse: companyDetails.nseScripCode,
            bse: companyDetails.bseScripCode,
          },
          quote: {
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
          performance: {
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
        }),
      ),
    );
  }

  public getStock(code: string): Observable<Stock | null> {
    const query: DashboardQuery = {
      companies: [
        {
          id: code,
        },
      ],
    };

    return this.getDashboard(query).pipe(
      map((dashboard): Stock | null => {
        const stock = dashboard.companies ? dashboard.companies[0] : null;

        if (!stock) {
          return null;
        }

        return {
          name: stock.companyName,
          vendorCode: {
            etm: stock.companyId,
          },
          scripCode: {
            nse: stock.scripCode2,
            bse: stock.scripCode,
          },
          quote: {
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
        };
      }),
    );
  }

  public getIndex(code: string): Observable<Index | null> {
    const query: DashboardQuery = {
      indices: [
        {
          id: code,
        },
      ],
    };

    return this.getDashboard(query).pipe(
      map((dashboard): Index | null => {
        const index = dashboard.indices ? dashboard.indices[0] : null;

        if (!index) {
          return null;
        }

        return {
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
              percentage: MarketUtils.stringToNumber(index.declinesPercentange),
              value: MarketUtils.stringToNumber(index.declines),
            },
          },
        };
      }),
    );
  }

  public getStocks(codes: string[]): Observable<Stock[]> {
    const query: DashboardQuery = {
      companies: [...codes.map((id) => ({ id }))],
    };

    return this.getDashboard(query).pipe(
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
        }));
      }),
    );
  }

  public getIndices(codes: string[]): Observable<Index[]> {
    const query: DashboardQuery = {
      indices: [...codes.map((id) => ({ id }))],
    };

    return this.getDashboard(query).pipe(
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
              percentage: MarketUtils.stringToNumber(index.declinesPercentange),
              value: MarketUtils.stringToNumber(index.declines),
            },
          },
        }));
      }),
    );
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

  private getDashboard(query: DashboardQuery): Observable<Dashboard> {
    return this.http.post<Dashboard>(Constants.api.DASHBOARD, query);
  }
}
