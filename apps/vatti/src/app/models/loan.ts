export interface Amortization {
  month: number;
  paymentDate: Date;
  payment: number;
  principal: number;
  interest: number;
  totalInterest: number;
  balance: number;
  interestRate: number;
}

export interface InterestRateRevision {
  month: number;
  newRate: number;
  adjustmentType: RevisionAdjustmentType;
}

export interface Prepayment {
  month: number;
  amount: number;
  adjustmentType: RevisionAdjustmentType;
}

export interface FinancialYearSummary {
  financialYear: string;
  totalPrincipal: number;
  totalInterest: number;
  totalAmountPaid: number;
}

export enum InterestRateType {
  FLOATING,
  FIXED,
}

export enum RevisionAdjustmentType {
  TENURE,
  EMI,
}
