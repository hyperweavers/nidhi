import { BanksInIndia, IbjaGoldRates, RbiPolicyRates } from '../models/common';
import {
  CompoundingFrequency,
  InterestPayoutFrequency,
  PostOfficeSavingsSchemeId,
  PostOfficeSavingsSchemes,
} from '../models/deposit';

export const mockGoldRateResponse = {
  today_22k: 'INR 7,250',
  today_24k: 'INR 7,910',
  yesterday_22k: 'INR 7,200',
  yesterday_24k: 'INR 7,860',
};

const now = Date.now();

export const mockPostOfficeSavingsSchemes: PostOfficeSavingsSchemes = {
  lastUpdated: now,
  effective: { from: now, to: now + 86400000 },
  schemes: [
    {
      id: PostOfficeSavingsSchemeId.PPF,
      name: 'Public Provident Fund',
      shortName: 'PPF',
      interestRate: 7.1,
      depositTenure: 15,
      maturityTenure: 15,
      compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.SSA,
      name: 'Sukanya Samriddhi Account',
      shortName: 'SSA',
      interestRate: 8.0,
      depositTenure: 21,
      maturityTenure: 21,
      compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.SCSS,
      name: 'Senior Citizen Savings Scheme',
      shortName: 'SCSS',
      interestRate: 7.4,
      depositTenure: 5,
      maturityTenure: 5,
      compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.KVP,
      name: 'Kisan Vikas Patra',
      shortName: 'KVP',
      interestRate: 7.5,
      depositTenure: 0,
      maturityTenure: 115,
      compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: true,
    },
    {
      id: PostOfficeSavingsSchemeId.MIS,
      name: 'Monthly Income Scheme',
      shortName: 'MIS',
      interestRate: 7.4,
      depositTenure: 5,
      maturityTenure: 5,
      compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Monthly,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.TD_1Y,
      name: 'Time Deposit 1 Year',
      shortName: 'TD-1Y',
      interestRate: 6.9,
      depositTenure: 1,
      maturityTenure: 1,
      compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.TD_2Y,
      name: 'Time Deposit 2 Year',
      shortName: 'TD-2Y',
      interestRate: 7.0,
      depositTenure: 2,
      maturityTenure: 2,
      compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.TD_3Y,
      name: 'Time Deposit 3 Year',
      shortName: 'TD-3Y',
      interestRate: 7.1,
      depositTenure: 3,
      maturityTenure: 3,
      compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
    {
      id: PostOfficeSavingsSchemeId.TD_5Y,
      name: 'Time Deposit 5 Year',
      shortName: 'TD-5Y',
      interestRate: 7.5,
      depositTenure: 5,
      maturityTenure: 5,
      compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
      interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
      fixedInterestRate: false,
    },
  ],
};

export const mockRbiPolicyRates: RbiPolicyRates = {
  lastUpdated: now,
  rates: [
    {
      effectiveDate: now,
      policyRepoRate: 6.5,
      standingDepositFacilityRate: 6.25,
      marginalStandingFacilityRate: 6.75,
      bankRate: 6.75,
      fixedReverseRepoRate: 3.35,
    },
  ],
};

export const mockBanksInIndia: BanksInIndia = {
  lastUpdated: now,
  banks: {
    type: 'public',
    list: [
      { name: 'State Bank of India', website: 'https://sbi.co.in' },
      { name: 'HDFC Bank', website: 'https://hdfcbank.com' },
    ],
  },
};

export const mockIbjaGoldRates: IbjaGoldRates = {
  lastUpdated: now,
  rates: [
    {
      date: now,
      metal: 'Gold',
      purity: 999,
      rate: { forenoon: 7350, afternoon: 7320 },
    },
    {
      date: now,
      metal: 'Gold',
      purity: 916,
      rate: { forenoon: 6750, afternoon: 6720 },
    },
    {
      date: now,
      metal: 'Gold',
      purity: 750,
      rate: { forenoon: 5550, afternoon: 5520 },
    },
  ],
};
