export interface EnumObject<T> {
  key: number;
  value: T;
}

export interface FinancialYear {
  start: Date;
  end: Date;
}

export interface RbiPolicyRates {
  lastUpdated: number;
  rates: RbiPolicyRate[];
}

export interface RbiPolicyRate {
  effectiveDate: number;
  policyRepoRate: number;
  standingDepositFacilityRate: number;
  marginalStandingFacilityRate: number;
  bankRate: number;
  fixedReverseRepoRate: number;
}

export interface BanksInIndia {
  lastUpdated: number;
  banks: BanksTypesInIndia;
}

export interface BanksTypesInIndia {
  type: string;
  list: BankTypesInIndiaList[];
}

export interface BankTypesInIndiaList {
  name: string;
  website: string;
}

export interface IbjaGoldRates {
  lastUpdated: number;
  rates: IbjaGoldRate[];
}

export interface IbjaGoldRate {
  date: number;
  metal: string;
  purity: number;
  rate: IbjaGoldRateSession;
}

export interface IbjaGoldRateSession {
  forenoon: number;
  afternoon: number;
}

export enum GoldPurity {
  '24 Karat' = 999,
  'Bar' = 995,
  '22 Karat' = 916,
  '18 karat' = 750,
  '14 karat' = 585,
}
