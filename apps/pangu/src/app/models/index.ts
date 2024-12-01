import {
  AdvanceDecline,
  Change,
  ExchangeName,
  Performance,
  VendorCode,
} from './market';
import { Stock } from './stock';

export interface Index {
  id: string;
  name: string;
  exchange: ExchangeName;
  vendorCode: VendorCode;
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

export interface Metrics {
  marketCap: number;
  pe: number;
  pb: number;
  dividendYield: number;
}
