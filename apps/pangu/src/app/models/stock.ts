import { AdvanceDecline } from './index';
import { StockVendorCode } from './market';

export interface Stock {
  id?: string; // Database UUID
  name: string;
  scripCode: ScripCode;
  vendorCode: StockVendorCode;
  quote?: ExchangeQuote;
  limits?: ExchangeLimits;
  metrics?: ExchangeMetrics;
  performance?: ExchangePerformance;
  details?: Details;
}

export interface ScripCode {
  nse?: string;
  bse?: string;
  isin?: string;
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

export interface Change extends AdvanceDecline {
  direction: Direction;
}

export interface ExchangeLimits {
  nse: Limits;
  bse?: Limits;
}

export interface Limits {
  lowerCircuit?: number;
  upperCircuit?: number;
}

export interface ExchangeMetrics {
  nse: Metrics;
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
  nse: Performance;
  bse?: Performance;
}

export interface Performance {
  yearToDate?: Change;
  weekly: Change;
  monthly: Change;
  quarterly: Change;
  halfYearly: Change;
  yearly: YearlyPerformance;
}

export interface YearlyPerformance {
  one: Change;
  two?: Change;
  three?: Change;
  five: Change;
  ten?: Change;
}

export enum Direction {
  UP = 1,
  DOWN = -1,
}

export enum ExchangeName {
  NSE = 'nse',
  BSE = 'bse',
}
