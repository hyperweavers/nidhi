import { VendorCode as McVendorCode } from '../models/vendor/mc';

export { CurrencyListResponse } from '../models/vendor/etm';
export {
  ChartResponseStatus,
  currencyCodeMap,
  ForexResponse,
  HistoricChartResponse,
  IntraDayChartResponse,
  MarketState,
  SearchResponse,
  StockResponse,
} from '../models/vendor/mc';

export interface VendorCode {
  mc: McVendorCode;
}

// TODO: Remove all vendor model dependencies from market.service.ts and app.db.ts and move the data transformation to adapter
