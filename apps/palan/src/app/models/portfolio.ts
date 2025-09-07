import { Currency } from './currency';
import { Change } from './market';
import { Stock } from './stock';

export interface Portfolio {
  holdings: Holding[];
  investment: number;
  marketValue: number;
  dayProfitLoss: Change;
  totalProfitLoss: Change;
}

export interface Holding extends Stock {
  transactions: Transaction[];
  quantity?: number;
  averagePrice?: number;
  investment?: number;
  marketValue?: number;
  totalProfitLoss?: Change;
}

export interface Transaction {
  id: string; // Database UUID
  type: TransactionType;
  date: number;
  quantity: number;
  price: Amount;
  source: ContributionSource;
  contribution: Amount;
  charges?: Amount;
}

export interface Amount {
  value: number;
  currency: Currency;
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum ContributionSource {
  EMPLOYEE = 'employee',
  EMPLOYER = 'employer',
}
