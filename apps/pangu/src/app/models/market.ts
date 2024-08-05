export interface MarketStatus {
  lastUpdated: number;
  status: Status;
  startTime: number;
  endTime: number;
}

export interface VendorCode {
  etm: string;
  mc?: string;
}

export interface AdvanceDecline {
  percentage: number;
  value: number;
}

export interface Change extends AdvanceDecline {
  direction: Direction;
}

export interface Performance {
  yearToDate?: Change;
  weekly: Change;
  monthly: Change;
  quarterly: Change;
  halfYearly: Change;
  yearly: YearlyPerformance;
}

export interface YearlyPerformance {
  one: Change;
  two?: Change;
  three?: Change;
  five: Change;
  ten?: Change;
}

export enum Status {
  OPEN,
  CLOSED,
}

export enum ExchangeName {
  NSE = 'nse',
  BSE = 'bse',
}

export enum Direction {
  UP = 1,
  DOWN = -1,
}

// TODO: Review index names and sort
export const INDICES = {
  nse: [
    {
      name: 'Nifty Pharma',
      etm: {
        id: '13017',
        symbol: 'CNXPHARMA',
      },
      mc: {
        id: '41',
        symbol: 'in;cpr',
      },
    },
    {
      name: 'Nifty Financial Services',
      etm: {
        id: '13655',
        symbol: 'FINNIFTY',
      },
      mc: {
        id: '47',
        symbol: 'in;cnxf',
      },
    },
    {
      name: 'Nifty Private Bank',
      etm: {
        id: '15270',
        symbol: 'NIFTYPBI',
      },
      mc: {
        id: '79',
        symbol: 'in;nxb',
      },
    },
    {
      name: 'Nifty Bank',
      etm: {
        id: '1913',
        symbol: 'BANKNIFTY',
      },
      mc: {
        id: '23',
        symbol: 'in;nbx',
      },
    },
    {
      name: 'Nifty Media',
      etm: {
        id: '13604',
        symbol: 'CNXMEDIA',
      },
      mc: {
        id: '50',
        symbol: 'in;cnmx',
      },
    },
    {
      name: 'Nifty Services Sector',
      etm: {
        id: '13021',
        symbol: 'CNXSSI',
      },
      mc: {
        id: '44',
        symbol: 'in;crv',
      },
    },
    {
      name: 'Nifty FMCG',
      etm: {
        id: '13027',
        symbol: 'CNXFMCG',
      },
      mc: {
        id: '39',
        symbol: 'in;cfm',
      },
    },
    {
      name: 'Nifty India Consumption',
      etm: {
        id: '13653',
        symbol: 'CNXCONSUM',
      },
      mc: {
        id: '56',
        symbol: 'in;cnxc',
      },
    },
    {
      name: 'Nifty SmallCap 100',
      etm: {
        id: '13532',
        symbol: 'CNXSCAP',
      },
      mc: {
        id: '53',
        symbol: 'in;cnxs',
      },
    },
    {
      name: 'Nifty SmallCap 250',
      etm: {
        id: '15499',
        symbol: 'NIFSC250',
      },
      mc: {
        id: '114',
        symbol: 'mc;nscapt',
      },
    },
    {
      name: 'Nifty SmallCap 50',
      etm: {
        id: '15431',
        symbol: 'NIFSC50',
      },
      mc: {
        id: '113',
        symbol: 'mc;nscapf',
      },
    },
    {
      name: 'Nifty MidSmallCap 400',
      etm: {
        id: '15436',
        symbol: 'NIFMSC400',
      },
      mc: {
        id: '112',
        symbol: 'mc;nmsml',
      },
    },
    {
      name: 'Nifty MidCap 100',
      etm: {
        id: '2495',
        symbol: 'CNXMIDCAP',
      },
      mc: {
        id: '27',
        symbol: 'in;ccx',
      },
    },
    {
      name: 'Nifty MidCap 150',
      etm: {
        id: '15430',
        symbol: 'NIFMC150',
      },
      mc: {
        id: '111',
        symbol: 'mc;nmcapo',
      },
    },
    {
      name: 'Nifty LargeMidCap 250',
      etm: {
        id: '16207',
        symbol: 'NIFTYLMC250',
      },
      mc: {
        id: '124',
        symbol: 'mc;larmid',
      },
    },
    {
      name: 'Nifty 500',
      etm: {
        id: '2371',
        symbol: 'CNX500',
      },
      mc: {
        id: '7',
        symbol: 'in;ncx',
      },
    },
    {
      name: 'Nifty 200',
      etm: {
        id: '13602',
        symbol: 'CNX200',
      },
      mc: {
        id: '49',
        symbol: 'in;cnxt',
      },
    },
    {
      name: 'Nifty 100',
      etm: {
        id: '2510',
        symbol: 'CNX100',
      },
      mc: {
        id: '28',
        symbol: 'in;nnx',
      },
    },
    {
      name: 'Nifty 50',
      main: true,
      etm: {
        id: '2369',
        symbol: 'NSE Index',
      },
      mc: {
        id: '9',
        symbol: 'in;NSX',
      },
    },
    {
      name: 'Nifty Oil & Gas',
      etm: {
        id: '32289',
        symbol: 'NIFTYOILGAS',
      },
      mc: {
        id: '126',
        symbol: 'mc;oilgas',
      },
    },
    {
      name: 'Nifty Next 50',
      etm: {
        id: '2346',
        symbol: 'NIFTYNXT50',
      },
      mc: {
        id: '6',
        symbol: 'in;cjn',
      },
    },
    {
      name: 'Nifty Energy',
      etm: {
        id: '13016',
        symbol: 'CNXENERGY',
      },
      mc: {
        id: '38',
        symbol: 'in;cgy',
      },
    },
    {
      name: 'Nifty MidCap 50',
      etm: {
        id: '2907',
        symbol: 'MIDCAP50',
      },
      mc: {
        id: '31',
        symbol: 'in;mfy',
      },
    },
    {
      name: 'Nifty Infrastructure',
      etm: {
        id: '13022',
        symbol: 'CNXINFRA',
      },
      mc: {
        id: '35',
        symbol: 'in;cfr',
      },
    },
    {
      name: 'Nifty India Manufacturing',
      etm: {
        id: '47194',
        symbol: 'NIFINDIAMANU',
      },
      mc: {
        id: '133',
        symbol: 'mc;nindiamfg',
      },
    },
    {
      name: 'Nifty PSU Bank',
      etm: {
        id: '13026',
        symbol: 'CNXPSUBANK',
      },
      mc: {
        id: '43',
        symbol: 'in;cuk',
      },
    },
    {
      name: 'Nifty PSE',
      etm: {
        id: '13029',
        symbol: 'CNXPSE',
      },
      mc: {
        id: '42',
        symbol: 'in;cps',
      },
    },
    {
      name: 'Nifty CPSE',
      etm: {
        id: '14214',
        symbol: 'CPSE',
      },
      mc: {
        id: '61',
        symbol: 'in;nxe',
      },
    },
    {
      name: 'Nifty MNC',
      etm: {
        id: '13019',
        symbol: 'CNXMNC',
      },
      mc: {
        id: '40',
        symbol: 'in;cxc',
      },
    },
    {
      name: 'Nifty Commodities',
      etm: {
        id: '13654',
        symbol: 'CNXCOMMO',
      },
      mc: {
        id: '48',
        symbol: 'in;cnxz',
      },
    },
    {
      name: 'Nifty IT',
      etm: {
        id: '186',
        symbol: 'CNXIT',
      },
      mc: {
        id: '19',
        symbol: 'in;cnit',
      },
    },
    {
      name: 'Nifty Metal',
      etm: {
        id: '13605',
        symbol: 'CNXMETAL',
      },
      mc: {
        id: '51',
        symbol: 'in;CNXM',
      },
    },
    {
      name: 'Nifty Auto',
      etm: {
        id: '13603',
        symbol: 'CNXAUTO',
      },
      mc: {
        id: '52',
        symbol: 'in;cnxa',
      },
    },
    {
      name: 'Nifty Realty',
      etm: {
        id: '13030',
        symbol: 'CNXREALTY',
      },
      mc: {
        id: '34',
        symbol: 'in;crl',
      },
    },
  ],
  bse: [
    {
      name: 'BSE SME IPO',
      etm: {
        id: '13794',
        symbol: 'SMEIPO',
      },
      mc: {
        id: '58',
        symbol: 'in;zpo',
      },
    },
    {
      name: 'BSE Healthcare',
      etm: {
        id: '2276',
        symbol: 'BSE HC',
      },
      mc: {
        id: '15',
        symbol: 'IN;HAX',
      },
    },
    {
      name: 'BSE Power',
      etm: {
        id: '12356',
        symbol: 'POWER',
      },
      mc: {
        id: '30',
        symbol: 'in;bpo',
      },
    },
    {
      name: 'BSE IPO',
      etm: {
        id: '12725',
        symbol: 'BSEIPO',
      },
      mc: {
        id: '33',
        symbol: 'in;bip',
      },
    },
    {
      name: 'BSE SmallCap',
      etm: {
        id: '2022',
        symbol: 'SMLCAP',
      },
      mc: {
        id: '26',
        symbol: 'in;BCX',
      },
    },
    {
      name: 'BSE Telecommunication',
      etm: {
        id: '14917',
        symbol: 'TELCOM',
      },
      mc: {
        id: '76',
        symbol: 'in;tez',
      },
    },
    {
      name: 'BSE Bankex',
      etm: {
        id: '2647',
        symbol: 'BANKEX',
      },
      mc: {
        id: '18',
        symbol: 'IN;bkx',
      },
    },
    {
      name: 'BSE Fast Moving Consumer Goods',
      etm: {
        id: '2274',
        symbol: 'BSEFMC',
      },
      mc: {
        id: '14',
        symbol: 'IN;FMX',
      },
    },
    {
      name: 'BSE SENSEX Next 50',
      etm: {
        id: '15817',
        symbol: 'SNXT50',
      },
      mc: {
        id: '101',
        symbol: 'in;bxn',
      },
    },
    {
      name: 'BSE Utilities',
      etm: {
        id: '14848',
        symbol: 'UTILS',
      },
      mc: {
        id: '77',
        symbol: 'in;bsu',
      },
    },
    {
      name: 'BSE 150 MidCap',
      etm: {
        id: '16178',
        symbol: 'MID150',
      },
      mc: {
        id: '103',
        symbol: 'in;MCD',
      },
    },
    {
      name: 'BSE 400 MidSmallCap',
      etm: {
        id: '16177',
        symbol: 'MSL400',
      },
      mc: {
        id: '106',
        symbol: 'in;MSI',
      },
    },
    {
      name: 'BSE 250 SmallCap',
      etm: {
        id: '16179',
        symbol: 'SML250',
      },
      mc: {
        id: '104',
        symbol: 'in;SCI',
      },
    },
    {
      name: 'BSE Consumer Durables',
      etm: {
        id: '2275',
        symbol: 'BSE CD',
      },
      mc: {
        id: '16',
        symbol: 'IN;CDX',
      },
    },
    {
      name: 'BSE AllCap',
      etm: {
        id: '14912',
        symbol: 'ALLCAP',
      },
      mc: {
        id: '67',
        symbol: 'IN;bsx',
      },
    },
    {
      name: 'BSE 500',
      etm: {
        id: '2342',
        symbol: 'BSE500',
      },
      mc: {
        id: '12',
        symbol: 'IN;BNX',
      },
    },
    {
      name: 'BSE LargeCap',
      etm: {
        id: '14852',
        symbol: 'LRGCAP',
      },
      mc: {
        id: '73',
        symbol: 'in;blp',
      },
    },
    {
      name: 'BSE 200',
      etm: {
        id: '2364',
        symbol: 'BSE200',
      },
      mc: {
        id: '2',
        symbol: 'IN;SEI',
      },
    },
    {
      name: 'BSE 250 LargeMidCap',
      etm: {
        id: '16181',
        symbol: 'LMI250',
      },
      mc: {
        id: '105',
        symbol: 'in;LMI',
      },
    },
    {
      name: 'BSE SmallCap Select',
      etm: {
        id: '14959',
        symbol: 'SMLSEL',
      },
      mc: {
        id: '75',
        symbol: 'in;cey',
      },
    },
    {
      name: 'BSE Sensex',
      main: true,
      etm: {
        id: '2365',
        symbol: 'SENSEX',
      },
      mc: {
        id: '4',
        symbol: 'in;SEN',
      },
    },
    {
      name: 'BSE 100',
      etm: {
        id: '2340',
        symbol: 'BSE100',
      },
      mc: {
        id: '1',
        symbol: 'IN;NTL',
      },
    },
    {
      name: 'BSE MidCap',
      etm: {
        id: '1906',
        symbol: 'MIDCAP',
      },
      mc: {
        id: '25',
        symbol: 'in;bmx',
      },
    },
    {
      name: 'BSE Sensex 50',
      etm: {
        id: '15648',
        symbol: 'SNSX50',
      },
      mc: {
        id: '100',
        symbol: 'in;bxx',
      },
    },
    {
      name: 'BSE India Infrastructure',
      etm: {
        id: '14354',
        symbol: 'INFRA',
      },
      mc: {
        id: '62',
        symbol: 'mc;binfra',
      },
    },
    {
      name: 'BSE Oil & Gas',
      etm: {
        id: '2555',
        symbol: 'OILGAS',
      },
      mc: {
        id: '22',
        symbol: 'IN;ogx',
      },
    },
    {
      name: 'BSE Energy',
      etm: {
        id: '14911',
        symbol: 'ENERGY',
      },
      mc: {
        id: '70',
        symbol: 'in;bsq',
      },
    },
    {
      name: 'BSE Industrials',
      etm: {
        id: '14856',
        symbol: 'INDSTR',
      },
      mc: {
        id: '72',
        symbol: 'in;scx',
      },
    },
    {
      name: 'BSE CPSE',
      etm: {
        id: '14537',
        symbol: 'CPSE',
      },
      mc: {
        id: '63',
        symbol: 'mc;bcpse',
      },
    },
    {
      name: 'BSE PSU',
      etm: {
        id: '6929',
        symbol: 'BSEPSU',
      },
      mc: {
        id: '11',
        symbol: 'in;pbx',
      },
    },
    {
      name: 'BSE Capital Goods',
      etm: {
        id: '2273',
        symbol: 'BSE CG',
      },
      mc: {
        id: '13',
        symbol: 'IN;CGX',
      },
    },
    {
      name: 'BSE MidCap Select',
      etm: {
        id: '14958',
        symbol: 'MIDSEL',
      },
      mc: {
        id: '74',
        symbol: 'in;ihb',
      },
    },
    {
      name: 'BSE TECk',
      etm: {
        id: '10968',
        symbol: 'TECK',
      },
      mc: {
        id: '10',
        symbol: 'in;tkx',
      },
    },
    {
      name: 'BSE Bharat 22',
      etm: {
        id: '16021',
        symbol: 'BHRT22',
      },
      mc: {
        id: '102',
        symbol: 'in;bin',
      },
    },
    {
      name: 'BSE India Manufacturing',
      etm: {
        id: '14854',
        symbol: 'MFG',
      },
      mc: {
        id: '66',
        symbol: 'in;mfg',
      },
    },
    {
      name: 'BSE Information Technology',
      etm: {
        id: '2157',
        symbol: 'BSE IT',
      },
      mc: {
        id: '17',
        symbol: 'IN;ifx',
      },
    },
    {
      name: 'BSE Auto',
      etm: {
        id: '2416',
        symbol: 'AUTO',
      },
      mc: {
        id: '20',
        symbol: 'IN;aox',
      },
    },
    {
      name: 'BSE Metal',
      etm: {
        id: '2449',
        symbol: 'METAL',
      },
      mc: {
        id: '21',
        symbol: 'IN;MLX',
      },
    },
    {
      name: 'BSE Realty',
      etm: {
        id: '2739',
        symbol: 'REALTY',
      },
      mc: {
        id: '29',
        symbol: 'in;rea',
      },
    },
  ],
};
