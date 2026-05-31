import { PostOfficeSavingsSchemes } from '../models/deposit';
import { BanksInIndia, RbiPolicyRates, IbjaGoldRates } from '../models/common';

export const mockGoldRateResponse = {
  today_22k: 'INR 7,250',
  today_24k: 'INR 7,910',
  yesterday_22k: 'INR 7,200',
  yesterday_24k: 'INR 7,860',
};

export const mockPostOfficeSavingsSchemes: PostOfficeSavingsSchemes = {
  ppf: {
    currentRate: 7.1,
    minimumAmount: 500,
    maximumAmount: 150000,
    tenureYears: 15,
    eligibleFor: ['All Indian Residents'],
  },
  sukhSamriddhi: {
    currentRate: 8.0,
    minimumAmount: 250,
    maximumAmount: 150000,
    tenureYears: 21,
    eligibleFor: ['Girl Child'],
  },
  scss: {
    currentRate: 7.4,
    minimumAmount: 1000,
    maximumAmount: 2000000,
    tenureYears: 5,
    eligibleFor: ['Senior Citizens'],
  },
  kisanVikasPatra: {
    currentRate: 7.5,
    minimumAmount: 1000,
    maximumAmount: 0,
    tenureMonths: 115,
  },
  td: {
    currentRate: {
      '1-year': 6.9,
      '2-year': 7.0,
      '3-year': 7.1,
      '5-year': 7.5,
    },
    minimumAmount: 1000,
  },
  mis: {
    currentRate: 7.4,
    minimumAmount: 1000,
    maximumAmount: 900000,
    tenureYears: 5,
  },
};

export const mockRbiPolicyRates: RbiPolicyRates = {
  repoRate: 6.5,
  reverseRepoRate: 3.35,
  bankRate: 6.75,
  msfRate: 6.75,
  sdfRate: 6.25,
  crr: 4.5,
  slr: 18.0,
  updatedAt: '2024-04-05',
};

export const mockBanksInIndia: BanksInIndia = [
  {
    name: 'State Bank of India',
    logo: 'sbi-logo.png',
    fdRates: {
      '30-days': 3.5,
      '90-days': 4.0,
      '180-days': 4.5,
      '1-year': 6.8,
      '3-year': 7.0,
      '5-year': 7.0,
    },
  },
  {
    name: 'HDFC Bank',
    logo: 'hdfc-logo.png',
    fdRates: {
      '30-days': 3.5,
      '90-days': 4.0,
      '180-days': 4.5,
      '1-year': 7.0,
      '3-year': 7.2,
      '5-year': 7.2,
    },
  },
];

export const mockIbjaGoldRates: IbjaGoldRates = {
  '24K': {
    '999': 7350,
    '995': 7320,
  },
  '22K': {
    '916': 6750,
  },
  '18K': {
    '750': 5550,
  },
  updatedAt: '2024-01-15',
};
