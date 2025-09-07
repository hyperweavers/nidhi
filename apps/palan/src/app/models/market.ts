import { VendorCode as McVendorCode } from './vendor/mc';

export interface MarketStatus {
  lastUpdated: number;
  status: Status;
}

export interface Change {
  percentage: number;
  value: number;
  direction: Direction;
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
export interface VendorCode {
  mc: McVendorCode;
}

export enum Status {
  OPEN,
  CLOSED,
}

export enum Direction {
  UP = 1,
  DOWN = -1,
}
