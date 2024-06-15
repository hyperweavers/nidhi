import { Change } from './stock';

export interface Index {
  id: string;
  name: string;
  exchange: Exchange;
  quote?: Quote;
}

export interface Quote {
  lastUpdated: number;
  value: number;
  change: Change;
  advance?: AdvanceDecline;
  decline?: AdvanceDecline;
}

export interface AdvanceDecline {
  percentage: number;
  value: number;
}

export enum Exchange {
  NSE = 'nse',
  BSE = 'bse',
}
