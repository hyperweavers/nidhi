// ETM
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

export interface IndexQuotes {
  marketStatusDto: OperatingStatus;
  indicesList: IndexQuote[];
  diiData: FiiDiiData;
  fiiData: FiiDiiData;
}

export interface IndexQuote {
  indexId: string;
  indexName: string;
  seoName: string;
  percentChange: number;
  r1Week: number;
  r1Month: number;
  r3Month: number;
  r1Year: number;
  r3Year: number;
  r5Year: number;
  r6Month: number;
  change1Week: number;
  change1Month: number;
  change3Month: number;
  change6Month: number;
  change1Year: number;
  change3Year: number;
  change5Year: number;
  dateTime: string;
  exchange: string;
  symbol: string;
  lastTradedPrice: number;
  netChange: number;
  advances: number;
  advancesPerChange: number;
  declines: number;
  declinesPerChange: number;
  graphURL: string;
}

export interface FiiDiiData {
  serviceName: string;
  date: number;
  netInvestment: number;
}

export interface OperatingStatus {
  currentMarketStatus: VendorStatus;
  currentTime: number;
  instrumentName: string;
  purpose: string;
  tradingStartTime: string;
  tradingEndTime: string;
}

export interface IndexDetails {
  assetName: string;
  assetId: string;
  assetExchangeId: string;
  assetSymbol: string;
  advances: number;
  declines: number;
  advancesPercentage: number;
  declinesPercentage: number;
  lastTradedPrice: number;
  netChange: number;
  percentChange: number;
  dateTime: number;
  highPrice: number;
  lowPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  keyMetrics: IndexKeyMetrics;
  returns: IndexReturns[];
  r1Week: number;
  r1Month: number;
  r3Month: number;
  r6Month: number;
  r1Year: number;
  r3Year: number;
  r5Year: number;
  change1Week: number;
  change1Month: number;
  change3Month: number;
  change6Month: number;
  change1Year: number;
  change3Year: number;
  change5Year: number;
}

export interface IndexKeyMetrics {
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
}

export interface IndexReturns {
  label: IndexReturnLabel;
  returnPercentage: number;
  high: number;
  low: number;
}

export interface IndexConstituents {
  searchresult: IndexConstituentsResult[];
  pagesummary: IndexConstituentsSummary;
}

export interface IndexConstituentsResult {
  fiftyTwoWeekHighIndexValue: number;
  fiftyTwoWeekLowIndexValue: number;
  datetimeStr: string;
  dateTime: number;
  indexId: string;
  indexName: string;
  exchange: string;
  exchangeId: string;
  scripCode1GivenByExhange: string;
  scripCode2GivenByExhange: string;
  futureOptionflag: number;
  seoName: string;
  openIndexValue: number;
  highIndexValue: number;
  lowIndexValue: number;
  closeIndexValue: number;
  currentIndexValue: number;
  netChange: number;
  perChange: number;
  changeValue: number;
  noChange: number;
  noChangePerChange: number;
  advances: number;
  advancesPerChange: number;
  declines: number;
  declinesPerChange: number;
  companies: IndexConstituentsCompany[];
}

export interface IndexConstituentsCompany {
  companyId: string;
  seoName: string;
  companyName: string;
  companyShortName: string;
  change: number;
  percentChange: number;
  volumeInLacs: number;
  current: number;
  turnover: number;
  monthChange: number;
  yearChange: number;
  monthPerChange: number;
  yearPerChange: number;
  bseScripCode: string;
  nseScripCode: string;
  symbol: string;
  companyType: string;
  eventCount: number;
  open: number;
  high: number;
  low: number;
  monthHighPrice: number;
  monthLowPrice: number;
  fiftyTwoWeekHighPrice: number;
  fiftyTwoWeekLowPrice: number;
}

export interface IndexConstituentsSummary {
  totalRecords: number;
  totalpages: number;
  pagesize: number;
  indexvalue: string;
  pageno: number;
  exchange: string;
  lasttradeddate: string;
}

export interface History {
  s: string;
  noData: boolean;
  dates: string[];
  t: number[];
  o: number[];
  c: number[];
  h: number[];
  l: number[];
  v: number[];
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

export enum VendorStatus {
  LIVE = 'Live',
  CLOSE = 'CLOSED',
}

export enum IndexReturnLabel {
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  THREE_MONTH = '3M',
  SIX_MONTH = '6M',
  ONE_YEAR = '1Y',
  THREE_YEAR = '3Y',
  FIVE_YEAR = '5Y',
}

export enum ExchangeCode {
  NSE = '50',
  BSE = '47',
}

export enum IndexCodeEtm {
  NIFTY_FIFTY = '2369',
  SENSEX = '2365',
}

// MC
export interface IntraDay {
  s: IntraDayStatus;
  data?: IntraDayData[];
  nextTime?: number;
}

export interface IntraDayData {
  time: number;
  value: number;
}

export enum IntraDayStatus {
  OK = 'ok',
  NO_DATA = 'no_data',
}

export enum IndexCodeMc {
  NIFTY_FIFTY = 'NSX',
  SENSEX = 'SEN',
}

// Generic
export interface StockVendorCode {
  etm: string;
  mc?: string;
}

export interface IndexVendorCode {
  etm: ETMIndexVendorCode;
  mc?: string;
}

export interface ETMIndexVendorCode {
  id: string;
  symbol: string;
}
