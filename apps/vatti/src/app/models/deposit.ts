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

export enum RecurringDepositCalculation {
  Maturity,
  Installment,
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

export interface InstallmentSummary {
  installment: number;
  date: Date;
  deposit: number;
  interest: number;
  balance: number;
}

export interface PostOfficeSavingsSchemes {
  lastUpdated: number;
  effective: PostOfficeSavingsSchemeEffectiveDate;
  schemes: PostOfficeSavingsScheme[];
}

export interface PostOfficeSavingsSchemeEffectiveDate {
  from: number;
  to: number;
}

export interface PostOfficeSavingsScheme {
  title: string;
  interestRate: number;
  compoundingFrequency: PostOfficeSavingsSchemeCompoundingFrequency;
  compounding: boolean;
  tenure: number;
}

export enum PostOfficeSavingsSchemeCompoundingFrequency {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Annually = 'Annually',
}
