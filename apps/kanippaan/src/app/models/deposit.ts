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

export interface YearlySummary {
  year: number;
  openingBalance: number;
  interestEarned: number;
  closingBalance: number;
}
