export enum InterestPayoutType {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Yearly = 'Yearly',
  Maturity = 'Maturity',
}

export enum CompoundingFrequency {
  None = 'None',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Yearly = 'Yearly',
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
  interestAmount: number;
}
