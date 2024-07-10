import { IndexVendorCode } from './market';
import { Change, ExchangeName, Performance, Stock } from './stock';

export interface Index {
  id: string;
  name: string;
  exchange: ExchangeName;
  vendorCode: IndexVendorCode;
  quote?: Quote;
  metrics?: Metrics;
  performance?: Performance;
  constituents?: Stock[];
}

export interface Quote {
  lastUpdated: number;
  value: number;
  change: Change;
  open?: number;
  close?: number;
  low?: number;
  high?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  advance?: AdvanceDecline;
  decline?: AdvanceDecline;
}

export interface AdvanceDecline {
  percentage: number;
  value: number;
}

export interface Metrics {
  marketCap: number;
  pe: number;
  pb: number;
  dividendYield: number;
}

export enum IndexName {
  NIFTY_FIFTY = 'NIFTY',
  SENSEX = 'SENSEX',
}
