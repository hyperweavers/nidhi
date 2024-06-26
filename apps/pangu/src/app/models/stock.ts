import { AdvanceDecline } from './index';

export interface Stock {
  id?: string; // Database UUID
  name: string;
  vendorCode: VendorCode;
  scripCode: ScripCode;
  quote?: Quote;
  limits?: Limits;
  performance?: Performance;
  complete?: boolean; // Set to `true` if complete details available.
}

export interface VendorCode {
  etm: string;
  mc?: string;
}

export interface ScripCode {
  nse: string;
  bse?: string;
}

export interface Quote {
  lastUpdated: number;
  price: number;
  change: Change;
  open?: number;
  close: number;
  low: number;
  high: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  volume: number;
}

export interface Change extends AdvanceDecline {
  direction: Direction;
}

export interface Limits {
  lowerCircuit?: number;
  upperCircuit?: number;
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
