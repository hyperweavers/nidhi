import Dexie, { Table } from 'dexie';

import { Constants } from '../constants';
import { Holding } from '../models/portfolio';
import { CompanyDetails } from '../models/vendor/etm';
import { SearchResultSecondary } from '../models/vendor/mc';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;

  constructor() {
    super(Constants.db.NAME);

    this.version(1).stores({
      stocks: '&id, &scripCode.nse',
    });

    // Upgrade DB from version 1 to 2
    let updatedStocks = [];
    this.on('ready', async () => {
      const oldStocks = await this.stocks.toArray();

      updatedStocks = await Promise.all(
        oldStocks.map(async (stock) => {
          if (!stock.scripCode.isin) {
            const res = await fetch(
              Constants.api.STOCK_QUOTE + stock.vendorCode.etm,
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
            } else {
              return stock;
            }
          } else {
            return stock;
          }
        }),
      );

      this.stocks.clear();
      this.stocks.bulkAdd(updatedStocks);
    });

    this.version(2).stores({
      stocks: '&id, &scripCode.isin',
    });
  }
}

export const db = new AppDB();
