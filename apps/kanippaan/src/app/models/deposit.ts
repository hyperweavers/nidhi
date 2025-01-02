export enum InterestPayoutType {
  Monthly = '12',
  Quarterly = '4',
  Yearly = '1',
  Maturity = '0',
}

export enum CompoundingFrequency {
  None = '0',
  Monthly = '12',
  Quarterly = '4',
  Yearly = '1',
}

export interface AnnualSummary {
  year: number;
  yearlyInterestEarned: number;
  totalInterestEarned: number;
  totalDeposits: number;
  openingBalance: number;
  closingBalance: number;
}

export interface CompoundingSummary {
  date: Date;
  openingBalance: number;
  amountDeposited: number;
  interestEarned: number;
  closingBalance: number;
}

export interface FinancialYearSummary {
  financialYearLabel: string;
  openingBalance: number;
  amountDeposited: number;
  interestEarned: number;
  closingBalance: number;
}

export interface PayoutSchedule {
  date: Date;
  interest: number;
}
