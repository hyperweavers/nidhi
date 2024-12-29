export enum InterestPayoutType {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Yearly = 'Yearly',
  Maturity = 'Maturity',
}

export enum CompoundingFrequency {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Yearly = 'Yearly',
  None = 'None',
}

export interface YearlySummary {
  year: number;
  openingBalance: number;
  interestEarned: number;
  closingBalance: number;
}
