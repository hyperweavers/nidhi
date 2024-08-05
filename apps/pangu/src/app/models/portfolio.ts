import { AdvanceDecline, Change } from './market';
import { Stock } from './stock';

export interface Portfolio {
  holdings: Holding[];
  investment: number;
  marketValue: number;
  dayProfitLoss: Change;
  totalProfitLoss: Change;
  dayAdvance: AdvanceDecline;
  dayDecline: AdvanceDecline;
  totalAdvance: AdvanceDecline;
  totalDecline: AdvanceDecline;
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
  price: number;
  charges?: number;
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}
