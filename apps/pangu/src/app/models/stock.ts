import { Change, Performance, VendorCode } from './market';

export interface Stock {
  id?: string; // Database UUID
  name: string;
  scripCode: ScripCode;
  vendorCode: VendorCode;
  quote?: ExchangeQuote;
  limits?: ExchangeLimits;
  metrics?: ExchangeMetrics;
  performance?: ExchangePerformance;
  details?: Details;
}

export interface ScripCode {
  isin?: string; // TODO: Abstract vendor inside market service by using isin and/or passing stock object to market service.
  nse?: string;
  bse?: string;
}

export interface Details {
  sector: string;
  industry: string;
}

export interface ExchangeQuote {
  nse?: Quote;
  bse?: Quote;
}

export interface Quote {
  price: number;
  change: Change;
  open?: number;
  close?: number;
  low?: number;
  high?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  volume?: number;
  lastUpdated?: number;
}

export interface ExchangeLimits {
  nse?: Limits;
  bse?: Limits;
}

export interface Limits {
  lowerCircuit?: number;
  upperCircuit?: number;
}

export interface ExchangeMetrics {
  nse?: Metrics;
  bse?: Metrics;
}

export interface Metrics {
  marketCapType: string;
  marketCap: number;
  faceValue: number;
  pe: number;
  pb: number;
  eps: number;
  vwap: number;
  dividendYield: number;
  bookValue: number;
}

export interface ExchangePerformance {
  nse?: Performance;
  bse?: Performance;
}
