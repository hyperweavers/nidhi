export interface DashboardQuery {
  companies?: Query[];
  indices?: Query[];
  commodities?: Query[];
  currencies?: Query[];
}

export interface Query {
  id: string;
  exchange?: string;
}

export interface Dashboard {
  indices?: Index[];
  companies?: Company[];
  commodities?: Commodity[];
  currencies?: Currency[];
}

export interface Index {
  dateTime: string;
  declines: string;
  netChange: string;
  noChange: string;
  percentChange: string;
  dateTimeYear: string;
  entityType: string;
  indexName: string;
  declinesPercentange: string;
  dateTimeLong: number;
  fandoFlag: string;
  scripCode2GivenByExchange: string;
  advances: string;
  scripCode1GivenByExhange: string;
  segment: string;
  currentIndexValue: string;
  indexid: string;
  exchange: string;
  noChangePercentage: string;
  shortName: string;
  advancesPercentange: string;
  seoname: string;
}

export interface Company {
  dateTime: string;
  symbol: string;
  companyName: string;
  companyShortName: string;
  seoName: string;
  high: string;
  fiftyTwoWeekHighPrice: string;
  low: string;
  segment: string;
  scripCode: string;
  lastTradedPrice: string;
  percentChange: string;
  companyType: string;
  isBank: string;
  entityType: string;
  nseScripdCode: string;
  change: string;
  volumeInK: string;
  stockRating: string;
  dateTimeLong: number;
  bargraphvalue: string;
  previousclose: string;
  companyId: string;
  scripCode2: string;
  companyTypeLang: string;
  exchange: string;
  fiftyTwoWeekLowPrice: string;
}

export interface Commodity {
  dateTime: string;
  netChange: string;
  symbol: string;
  percentChange: string;
  openInterest: string;
  dateTimeYear: string;
  priceQuotationUnit: string;
  commodityHead: string;
  volume: string;
  expiryDate: string;
  expiryDate2: string;
  entitytype: string;
  lowPrice: string;
  segment: string;
  commodityName2: string;
  spotSymbol: string;
  highPrice: string;
  contractName: string;
  lastTradedPrice: string;
  commodityName: string;
}

export interface Currency {
  dateTime: string;
  percentChange: string;
  dateTimeYear: string;
  change: string;
  highRate: string;
  lowRate: string;
  currencyPairName: string;
  toCountryName: string;
  fromCountryName: string;
  entitytype: string;
  toCurrencyName: string;
  spotRate: string;
  fromCurrencyName: string;
}

export interface CompanyDetails {
  nse: ExchangeData;
  bse: ExchangeData;
  etRank: number;
  etRankYear: number;
  smeFlag: boolean;
  industryId: string;
  denmarkId: string[];
  industryName: string;
  sectorId: number;
  sectorName: string;
  companyId: string;
  companyName: string;
  companyShortName: string;
  preMarket: boolean;
  seoName: string;
  nseScripCode: string;
  bseScripCode: string;
  foFlag: boolean;
  mdaFlag: number;
  companyType: string;
  stockFlag: StockFlag;
  isinCode: string;
  listingFlag: boolean;
  nifty100: boolean;
  failoverStatus: boolean;
}

export interface ExchangeData {
  exchangeID: string;
  segment: string;
  updatedDateTime: string;
  symbol: string;
  marketCapType: string;
  pe: number;
  pb: number;
  pbAdjusted: number;
  eps: number;
  dividendYield: number;
  performanceD1: number;
  performanceW1: number;
  performanceM1: number;
  performanceM3: number;
  performanceM6: number;
  performanceY1: number;
  performanceY3: number;
  performanceY5: number;
  performanceValueD1: number;
  performanceValueW1: number;
  performanceValueM1: number;
  performanceValueM3: number;
  performanceValueM6: number;
  performanceValueY1: number;
  performanceValueY3: number;
  performanceValueY5: number;
  bookValue: number;
  priceToSales: number;
  month1Beta: number;
  month3Beta: number;
  month6Beta: number;
  year1Beta: number;
  year3Beta: number;
  percentChange: number;
  absoluteChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  vwap: number;
  avgDelivery: number;
  faceValue: number;
  marketCap: number;
  current: number;
  fiftyTwoWeekLowPrice: number;
  fiftyTwoWeekHighPrice: number;
  listingFlag: boolean;
  preMarket: boolean;
  mcapRank: number;
  updatedDate: number;
}

export interface StockFlag {
  date: string;
  Insights: boolean;
  brands: boolean;
  Peer: boolean;
  Refinitive: boolean;
  AnnualReport: boolean;
  companyId: string;
  mdaFlag: boolean;
  CorporateActions: boolean;
  ShareHolding: boolean;
  Financials: boolean;
  Forecast: boolean;
  MFOwnership: boolean;
  foFlag: boolean;
}

export interface SearchResult {
  tagSeoName: string;
  marketCap: string;
  symbol: string;
  percentChange: string;
  tagId: string;
  entityType: string;
  tagName: string;
  shortNameEt: string;
  DateTime: string;
  volume: string;
  NetChange: string;
  matchtype: string;
  lastTradedPrice: string;
}

export interface OperatingStatus {
  currentMarketStatus: VendorStatus;
  tradingStartTime: string;
  purpose: string;
  instrumentID: string;
  marketStatus: string;
  Date: string;
  tradingEndTime: string;
}

export enum VendorStatus {
  LIVE = 'Live',
  CLOSE = 'CLOSED', // TODO: Check the exact value
}

export const ExchangeCodes = {
  NSE: '50',
  BSE: '47',
};

export const IndexCodes = {
  NIFTY_FIFTY: '2369',
  SENSEX: '2365',
};