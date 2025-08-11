import { Change, Performance, VendorCode } from './market';

export interface Stock {
  id?: string; // Database UUID
  name: string;
  scripCode: ScripCode;
  vendorCode: VendorCode;
  quote?: Quote;
  metrics?: Metrics;
  performance?: Performance;
  details?: Details;
}

export interface ScripCode {
  isin?: string;
  ticker?: string;
  country?: string;
}

export interface Details {
  sector: string;
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
  lastUpdated?: number;
}

export interface Metrics {
  marketCap: number;
  dividendYield: number;
}
