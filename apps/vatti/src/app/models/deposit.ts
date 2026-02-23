export enum InterestPayoutFrequency {
  Maturity = 0,
  Yearly = 1,
  Quarterly = 4,
  Monthly = 12,
}

export enum CompoundingFrequency {
  None = 0,
  Yearly = 1,
  Quarterly = 4,
  Monthly = 12,
}

export enum RecurringDepositCalculation {
  Maturity,
  Installment,
}

export enum InvestmentType {
  OneTime,
  Continuous,
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
  effective: PostOfficeSavingsSchemesEffectiveDate;
  schemes: PostOfficeSavingsScheme[];
}

export interface PostOfficeSavingsSchemesEffectiveDate {
  from: number;
  to: number;
}

export interface PostOfficeSavingsScheme {
  id: PostOfficeSavingsSchemeId;
  name: string;
  shortName: string;
  interestRate: number;
  depositTenure: number;
  maturityTenure: number;
  compoundingFrequencyPerYear: CompoundingFrequency;
  interestPayoutFrequencyPerYear: InterestPayoutFrequency;
  fixedInterestRate: boolean;
}

export interface PostOfficeSavingsSchemesHistoricInterestRate {
  from: number;
  to: number;
  interestRate: number;
  limit?: number;
}

export interface PostOfficeSavingsSchemeWithReturns extends PostOfficeSavingsScheme {
  returns: PostOfficeSavingsSchemeReturns;
}

export interface PostOfficeSavingsSchemeReturns {
  principal: number;
  interest: number;
  maturity: number;
  maturityDate: Date;
  effectiveYield: number;
}

export enum PostOfficeSavingsSchemeId {
  SB = 'SB',
  TD_1Y = 'TD-1Y',
  TD_2Y = 'TD-2Y',
  TD_3Y = 'TD-3Y',
  TD_5Y = 'TD-5Y',
  RD = 'RD',
  SCSS = 'SCSS',
  MIS = 'MIS',
  NSC = 'NSC',
  PPF = 'PPF',
  KVP = 'KVP',
  MSSC = 'MSSC',
  SSA = 'SSA',
}
