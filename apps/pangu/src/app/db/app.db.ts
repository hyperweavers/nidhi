import Dexie, { Table } from 'dexie';

import {
  CompanyDetails,
  SearchResultSecondary,
} from '../adapters/market.adapter';
import { Constants } from '../constants';
import { Holding } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;

  constructor() {
    super(Constants.db.NAME);

    this.version(1).stores({
      stocks: '&id, &scripCode.nse',
    });

    this.version(2).stores({
      stocks: '&id, &scripCode.isin',
    });

    this.version(3).stores({
      stocks: '&id, &scripCode.isin',
    });

    this.on('ready', async () => {
      const allStocks = await this.stocks.toArray();
      const pendingStocks = allStocks.filter((stock) => !stock.scripCode?.isin);
      if (pendingStocks.length === 0) return;

      const updatedStocks = await Promise.all(
        pendingStocks.map(async (stock) => {
          try {
            const res = await fetch(
              Constants.api.STOCK_QUOTE + stock.vendorCode.etm.primary,
            );

            if (res.ok) {
              const companyDetails: CompanyDetails = await res.json();

              const nseScripCode = companyDetails.nseScripCode
                ? companyDetails.nseScripCode.toUpperCase().endsWith('EQ')
                  ? companyDetails.nseScripCode.slice(0, -2)
                  : companyDetails.nseScripCode
                : '';

              const resSecondary = await fetch(
                Constants.api.STOCK_SEARCH_SECONDARY +
                  (nseScripCode || companyDetails.bseScripCode || ''),
              );

              let companyDetailsSecondary;

              if (resSecondary.ok) {
                const { result }: SearchResultSecondary =
                  await resSecondary.json();

                if (result.length > 0) {
                  companyDetailsSecondary = result.find(
                    (stockDetails) =>
                      (stockDetails.isinid &&
                        stockDetails.isinid === companyDetails.isinCode) ||
                      (stockDetails.nseid &&
                        stockDetails.nseid === nseScripCode) ||
                      (stockDetails.bseid &&
                        stockDetails.bseid === companyDetails.bseScripCode),
                  );
                }
              }

              return {
                ...stock,
                scripCode: {
                  isin: companyDetails.isinCode || '',
                  nse: nseScripCode,
                  bse: companyDetails.bseScripCode || '',
                },
                vendorCode: {
                  etm: {
                    primary: companyDetails.companyId,
                    chart:
                      (companyDetails.nseScripCode && companyDetails.nse
                        ? companyDetails.nse.symbol
                        : companyDetails.bse?.symbol) || '',
                  },
                  mc: {
                    primary: companyDetailsSecondary?.id || '',
                  },
                },
              };
            }
          } catch {
            // skip silently
          }
          return stock;
        }),
      );

      await this.stocks.bulkPut(updatedStocks);
    });
  }
}

export const db = new AppDB();
