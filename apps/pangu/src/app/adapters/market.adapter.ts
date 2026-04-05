import { Period } from '../models/chart';
import { ExchangeName } from '../models/market';
import {
  VendorCode as EtmVendorCode,
  ExchangeCode,
  PeriodQueryParam,
} from '../models/vendor/etm';
import { VendorCode as McVendorCode } from '../models/vendor/mc';

export {
  CompanyDetails,
  Dashboard,
  DashboardQuery,
  ExchangeCode,
  History,
  IndexConstituents,
  IndexDetails,
  IndexQuotes,
  PeriodFrequencyQueryParamMap,
  PeriodQueryParam,
  SearchResult,
  StockPeerChart,
  VendorStatus,
} from '../models/vendor/etm';

export {
  IntraDay,
  IntraDayStatus,
  SearchResultSecondary,
} from '../models/vendor/mc';

export interface VendorCode {
  etm: EtmVendorCode;
  mc?: McVendorCode;
}

export const PeriodMap: Record<Period, PeriodQueryParam | null> = {
  [Period.ONE_DAY]: null,
  [Period.ONE_WEEK]: PeriodQueryParam.ONE_WEEK,
  [Period.ONE_MONTH]: PeriodQueryParam.ONE_MONTH,
  [Period.THREE_MONTHS]: PeriodQueryParam.THREE_MONTH,
  [Period.SIX_MONTHS]: PeriodQueryParam.SIX_MONTH,
  [Period.ONE_YEAR]: PeriodQueryParam.ONE_YEAR,
  [Period.FIVE_YEAR]: PeriodQueryParam.FIVE_YEAR,
};

export const ExchangeNameToCodeMap: Record<ExchangeName, ExchangeCode> = {
  [ExchangeName.NSE]: ExchangeCode.NSE,
  [ExchangeName.BSE]: ExchangeCode.BSE,
};

export const ExchangeCodeToNameMap: Record<ExchangeCode, ExchangeName> = {
  [ExchangeCode.NSE]: ExchangeName.NSE,
  [ExchangeCode.BSE]: ExchangeName.BSE,
};

// TODO: Remove all vendor model dependencies from market.service.ts and app.db.ts and move the data transformation to adapter
