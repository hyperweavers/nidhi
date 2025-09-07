export interface StockResponse {
  code: string;
  message: string;
  data: StockData;
}

export interface StockData {
  '0': string;
  symbol: string;
  weekly_per_change: string;
  YOY: string;
  monthly_per_change: string;
  prev_market_cap: string;
  ytd_per_change: string;
  net_change: string;
  weekly_change: string;
  high: string;
  market_cap: string;
  low: string;
  dy: string;
  seo_string: string;
  '52wkLow': string;
  market_cap_billion: string;
  '3years_per_change': string;
  ttmeps: string;
  '6months_per_change': string;
  percent_change: string;
  sector: string;
  market_type: string;
  beta: string;
  '52wkHigh': string;
  lastupd: string;
  '2years_per_change': string;
  ticker: string;
  '5years_change': string;
  market_state: string;
  '6months_change': string;
  '3years_change': string;
  lastupd_epoch: number;
  '3months_change': string;
  yearly_per_change: string;
  '2years_change': string;
  yearly_change: string;
  indices: string;
  ytd_change: string;
  '3months_per_change': string;
  name: string;
  '5years_per_change': string;
  ttm_pe_text: string;
  current_price: string;
  ttmpe: string;
  monthly_change: string;
  open: string;
  prev_close: string;
  ask_price: string;
  bid_price: string;
}

export interface ForexResponse {
  success: number;
  data: ForexData;
}

export interface ForexData {
  headers: string[];
  flags: string[];
  data: number[][];
}

export interface HistoricChartResponse {
  s: ChartResponseStatus;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
}

export interface IntraDayChartResponse {
  s: ChartResponseStatus;
  data: IntraDayChartData[];
  direction: number;
  nextCall: boolean;
}

export interface IntraDayChartData {
  time: number;
  value: number;
}

export interface SearchResponse {
  link_src: string;
  link_track: string;
  pdt_dis_nm: string;
  name: string;
  sc_id: string;
  stock_name: string;
  sc_sector_id: string;
  sc_sector: string;
  forum_topics_url: string;
}

export interface VendorCode {
  primary: string;
}

export enum MarketState {
  LIVE = 'OPEN',
  CLOSE = 'CLOSED',
}

export enum ChartResponseStatus {
  OK = 'ok',
  NO_DATA = 'no_data',
  ERROR = 'error',
}

export enum ChartResolution {
  DAY = '1D',
  WEEK = '1W',
  MONTH = '1M',
}

export const currencyCodeMap: { [key: string]: string } = {
  Rupee: 'INR',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  'AUS Dollar': 'AUD',
  Yen: 'JPY',
  'Singapore Dollar': 'SGD',
  'Taiwan Dollar': 'TWD',
  Renimbi: 'CNY',
};
