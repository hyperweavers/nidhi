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
  scripCode2?: string;
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
  nse?: ExchangeData;
  bse?: ExchangeData;
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
  nseScripCode?: string;
  bseScripCode?: string;
  foFlag: boolean;
  mdaFlag: number;
  companyType: string;
  stockFlag: StockFlag;
  isinCode: string;
  listingFlag: boolean;
  nifty100: boolean;
  failoverStatus: boolean;
  url?: string | null;
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

export interface StockPeerChart {
  results: StockPeerChartResult[];
}

export interface StockPeerChartResult {
  quoteData: StockPeerChartQuoteData[];
  companydata: StockPeerChartCompanyData;
}

export interface StockPeerChartQuoteData {
  Close: number;
  Date: string;
  Volume: number;
  ReturnPChange: number;
  returnPChange: number;
  close: number;
  volume: number;
}

export interface StockPeerChartCompanyData {
  securityTypeId: number;
  scripcode: string;
  companyid: number;
  exchangeid: number;
  scripcodetype: string;
  seoname: string;
  companyname: string;
  listingid: number;
  companyshortname: string;
}

export interface VendorCode {
  primary: string;
  chart?: string;
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

export enum PeriodQueryParam {
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  THREE_MONTH = '3m',
  SIX_MONTH = '6m',
  ONE_YEAR = '1y',
  FIVE_YEAR = '5y',
}

export enum FrequencyQueryParam {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ExchangeCode {
  NSE = '50',
  BSE = '47',
}

export const PeriodFrequencyQueryParamMap: Record<
  PeriodQueryParam,
  FrequencyQueryParam
> = {
  [PeriodQueryParam.ONE_WEEK]: FrequencyQueryParam.DAY,
  [PeriodQueryParam.ONE_MONTH]: FrequencyQueryParam.DAY,
  [PeriodQueryParam.THREE_MONTH]: FrequencyQueryParam.WEEK,
  [PeriodQueryParam.SIX_MONTH]: FrequencyQueryParam.WEEK,
  [PeriodQueryParam.ONE_YEAR]: FrequencyQueryParam.WEEK,
  [PeriodQueryParam.FIVE_YEAR]: FrequencyQueryParam.MONTH,
};

// === IPO Calendar API ===
export interface IpoCalendarItem {
  id: string;
  companyId: number;
  companyName: string;
  ipoType: 'mainboard' | 'sme';
  openDate: number;
  closeDate: number;
  listingDate: number;
  issueSize: number;
  dayWiseSubscriptions: unknown[];
  objectsOfIssue: unknown[];
  seoName: string;
  lotSize?: number;
  priceBand?: string;
  minPrice?: number;
  maxPrice?: number;
  issuePriceBand?: string;
}

export interface IpoCalendarDate {
  date: number;
  displayIpoList: IpoCalendarItem[];
  remainingCount: number;
  openIpoList: IpoCalendarItem[];
  closeIpoList: IpoCalendarItem[];
  listedIpoList: IpoCalendarItem[];
}

export interface IpoCalendarResponse {
  calendarKey: string;
  calendarKeyNext: string;
  calendarKeyPrev: string;
  displayName: string;
  calendarList: IpoCalendarDate[];
}

// === IPO Details API ===
export interface IpoLeadManager {
  id: string;
  managerId: number;
  name: string;
  createdAt: number;
}

export interface IpoTimelineEntry {
  date: number;
  status: boolean;
  message: string;
}

export interface IpoDayWiseSub {
  day: string;
  date: string;
  dateLong: number;
  qibExAnchor: number;
  nii: number;
  retail: number;
  total: number;
}

export interface IpoSubscription {
  totalSubsTimes: number;
  qualifiedInst: number;
  reatilIndv: number;
  nonInst: number;
  marketMaker: number | null;
  employees: number | null;
  shareholders: number | null;
  policyholders: number | null;
  others: number | null;
  date: number;
  dayWiseSubs: IpoDayWiseSub[];
}

export interface IpoReservation {
  investorCatg: string;
  shares: string;
  percentChange: number | null;
}

export interface IpoObjectOfIssue {
  description: string;
  amount?: number;
  percentChange?: number;
}

export interface IpoDetails {
  companyid: string;
  companyname: string;
  companyseoname: string;
  issueSize: number;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  lotSize: number;
  minInvestment: number;
  issuePrice: number | null;
  faceValue: string;
  opendate: number;
  closedate: number;
  listingdate: number;
  exchangeNames: string;
  ipoType: string;
  issueType: string;
  ipoStatus: string;
  retailSharesOfferedReservation: string;
  totalSharesOffered: string;
  saleType: string;
  issuePriceBand: string;
  freshIssue: string;
  offerForSale: string | null;
  allotmentPrice: number | null;
  objectsOfIssue: IpoObjectOfIssue[];
  leadManagers: IpoLeadManager[];
  managingDirector: string | null;
  promotersCompany: string | null;
  legalAdvisor: string | null;
}

export interface IpoDetailsResponse {
  success: boolean;
  message: string;
  ipoDetails: IpoDetails;
  timeline: IpoTimelineEntry[];
  subscription: IpoSubscription;
  reservation: IpoReservation[];
  objectsOfIssue: IpoObjectOfIssue[];
}

// === IPO RHP/DRHP API ===
export interface IpoLinksResponse {
  prospectusLink: string | null;
  rhpUrl: string | null;
  drhpLink: string | null;
  ipoType: string;
  saleType: {
    label: string;
    value: string;
    rows: { label: string; value: string }[];
  };
  issueType: {
    label: string;
    value: string;
    rows: { label: string; value: string }[];
  };
  footerNote: string;
}

// === IPO Overview API (tab tables) ===
export interface IpoOverviewPageSummary {
  pageno: number;
  pagesize: number;
  totalrecords: number;
  totalpages: number;
}

export interface OpenIpoOverviewItem {
  companyName: string;
  companyKey: string;
  ipoType: string;
  exchangeNames: string;
  openDate: number;
  closeDate: number;
  issueSize: string;
  priceLabel: string;
  priceRange: string;
  lotSize: string;
  minInvestment: string;
  subscription: string;
  rhpLink: string;
  openingToday: boolean;
  closingToday: boolean;
  saleType: string;
  companyID: number;
  companySeoName: string;
}

export interface OpenIpoOverviewResponse {
  openIpoList: OpenIpoOverviewItem[];
  openIpoPageSummary: IpoOverviewPageSummary;
}

export interface UpcomingIpoOverviewItem {
  companyName: string;
  companyKey: string;
  ipoType: string;
  openDate: number;
  priceLabel: string;
  issuePrice: string;
  lotSize: number;
  issueSize: string;
  rhpLink: string;
  companyID: number;
  companySeoName: string;
  saleType: string;
  minInvestment: string;
}

export interface UpcomingIpoOverviewResponse {
  upcomingIpoList: UpcomingIpoOverviewItem[];
  upcomingIpoPageSummary: IpoOverviewPageSummary;
}

export interface ListingSoonIpoItem {
  companyName: string;
  companyKey: string;
  ipoType: string;
  priceLabel: string;
  qibSubscription: string;
  niiSubscription: string;
  retailSubscription: string;
  totalSubscription: string;
  listingDate: number;
  rhpLink: string;
  prospectusLink: string;
  issueSize: string;
  saleType: string;
  companyID: number;
  companySeoName: string;
  minInvestment: string;
  openDate: number;
  lotSize: number;
  priceRange: string;
}

export interface ListingSoonIpoResponse {
  listingSoonIpoList: ListingSoonIpoItem[];
  listingSoonIpoPageSummary: IpoOverviewPageSummary;
}

// === IPO Listed API ===
export interface ListedIpoOverviewItem {
  companyID: number;
  companyName: string;
  companySeoName: string;
  companyType: string;
  companyShortName: string;
  listingDate: number;
  issuePrice: string;
  listingPrice?: string;
  ltp?: string;
  returnFromIssue?: string;
  returnFromIssueTrend?: string;
  issueSize: string;
  ipoType?: string;
  listingGain?: string;
  listingGainTrend?: string;
  rhpLink: string;
  lotSize: number;
  totalSubscription: string;
}

export interface ListedIposOverviewResponse {
  results: ListedIpoOverviewItem[];
  pageSummary: IpoOverviewPageSummary;
}

// === IPO Draft API (moneycontrol ecalendar) ===
export interface DraftIpoItem {
  equityName: string;
  date: string;
  pdfFileLink: string;
}

export interface DraftIpoResponse {
  success: number;
  data: DraftIpoItem[];
}

// === IPO Financial APIs ===
export interface PnlYear {
  year: number;
  absolute: {
    sales: number;
    totalincome: number;
    operatingprofit: number;
    profitbeforetax: number;
    netprofit: number;
    ebit: number;
    ebitda: number;
    eps: number;
    depreciation: number;
    interestname: number;
    resultyear: number;
    resultmonth: string;
    months: number;
  };
}

export interface PnlResponse {
  datainfo: {
    profitandlossinfo: {
      profitandlossdetails: PnlYear[];
      companyfinancialratio: unknown[];
    };
  };
}

export interface BsYear {
  year: number;
  grossblock: number;
  netblock: number;
  investments: number;
  inventory: number;
  sundrydebtor: number;
  cashandbank: number;
  totalassets: number;
  sharecapital: number;
  reservesandsurplus: number;
  networth: number;
  securedloans: number;
  unsecuredloans: number;
  totalliabilities: number;
  currentassetsloansandadvances: number;
  currentliabilitiesandprovisions: number;
  months: number;
}

export interface BsResponse {
  datainfo: {
    balancesheetinfo: {
      companyBalanceSheetList: BsYear[];
    };
  };
}

export interface CfYear {
  resultyear: number;
  resultmonth: string;
  profitbeforetax: number;
  netcashflowoperatingActivity: number;
  netcashusedininvestingactivity: number;
  netcashusedinfinanceactivity: number;
  netincdecincashandequivlnt: number;
  cashandequivalntbeginofyear: number;
  cashandequivalntendofyear: number;
  months: number;
}

export interface CfResponse {
  datainfo: {
    cashFlowList: {
      companyfinancialcashflowlist: CfYear[];
    };
  };
}

export interface QuarterlyRow {
  year: number;
  resultYear?: number;
  month?: string;
  quarter?: number;
  salesturnover?: number;
  operatingprofit?: number;
  ebitda?: number;
  reportedprofitaftertax?: number;
  eps?: number;
  depreciation?: number;
  interest?: number;
  absolute?: {
    sales: number;
    totalincome: number;
    operatingprofit: number;
    profitbeforetax: number;
    netprofit: number;
    ebit: number;
    ebitda: number;
    eps: number;
    resultyear: number;
    resultmonth: string;
    months: number;
  };
}

export interface QuarterlyResponse {
  datainfo: {
    quarterlyresultsinfo: {
      companyQuarterlyResultslist: QuarterlyRow[];
    };
  };
}
