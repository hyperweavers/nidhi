import { QueryGroupNode } from './query-builder';

export interface Screener {
  id: string;
  name: string;
  query: string;
  queryTree?: QueryGroupNode;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ScreenerPreviewResult {
  assetId: string;
  assetName: string;
  assetSymbol: string;
  assetExchangeId: string;
  sector: string;
  price: number;
  priceDisplay: string;
  marketCap: number;
  marketCapDisplay: string;
  peDisplay: string;
  epsGrowthDisplay: string;
  dividendYieldDisplay: string;
}
