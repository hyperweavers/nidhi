import { Period } from '../models/chart';
import { ExchangeName } from '../models/market';
import { ScreenerPreviewResult } from '../models/screener';
import {
  VendorCode as EtmVendorCode,
  ExchangeCode,
  PeriodQueryParam,
  ScreenerFieldMappingResponse,
  ScreenerPreviewKeyValue,
  ScreenerPreviewResponse,
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
  ScreenerCategoryField,
  ScreenerCategoryLevelOne,
  ScreenerCategoryLevelTwo,
  ScreenerFieldMappingResponse,
  ScreenerPreviewDataItem,
  ScreenerPreviewKeyValue,
  ScreenerPreviewRequest,
  ScreenerPreviewResponse,
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

export function extractPropertyNames(
  res: ScreenerFieldMappingResponse | null | undefined,
): string[] {
  const ones =
    res?.datainfo?.screenerCategoryLevelZero?.screenerCategoryLevelOne ?? [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const one of ones) {
    for (const two of one.screenerCategoryLevelTwo ?? []) {
      for (const field of two.screenerCategoryFields ?? []) {
        const name = field.displayName?.trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      }
    }
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export function mapPreviewResponse(
  res: ScreenerPreviewResponse | null | undefined,
): ScreenerPreviewResult[] {
  const list = res?.dataList ?? [];
  return list.map((item) => {
    const byId = new Map<string, ScreenerPreviewKeyValue>();
    for (const kv of item.data ?? []) {
      if (kv.keyId) byId.set(kv.keyId, kv);
    }

    const sector = byId.get('sectorName')?.value ?? '';
    const priceKv = byId.get('lastTradedPrice');
    const marketCapKv = byId.get('marketCap');
    const peKv = byId.get('pe');
    const epsKv = byId.get('Annual_EPS_Growth');
    const divKv = byId.get('dividendyield');

    const rawPrice = priceKv?.filterFormatValue ?? priceKv?.value ?? '0';
    const rawMarketCap =
      marketCapKv?.filterFormatValue ?? marketCapKv?.value ?? '0';
    const price = Number(String(rawPrice).replace(/,/g, '')) || 0;
    const marketCap = Number(String(rawMarketCap).replace(/,/g, '')) || 0;

    return {
      assetId: item.assetId ?? '',
      assetName: item.assetName ?? '',
      assetSymbol: item.assetSymbol ?? '',
      assetExchangeId: item.assetExchangeId ?? '',
      sector,
      price,
      priceDisplay: priceKv?.value ?? '--',
      marketCap,
      marketCapDisplay: marketCapKv?.value ?? '--',
      peDisplay: peKv?.value ?? '--',
      epsGrowthDisplay: epsKv?.value ?? '--',
      dividendYieldDisplay: divKv?.value ?? '--',
    };
  });
}
