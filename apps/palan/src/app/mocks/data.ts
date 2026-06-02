import { CurrencyListResponse } from '../models/vendor/etm';
import {
  ChartResponseStatus,
  ForexResponse,
  HistoricChartResponse,
  IntraDayChartResponse,
  MarketState,
  SearchResponse,
  StockResponse,
} from '../models/vendor/mc';

export const mockStockResponse: StockResponse = {
  code: '200',
  message: 'Success',
  data: {
    '0': 'CAT',
    symbol: 'CAT:US',
    weekly_per_change: '1.5',
    YOY: '15.0',
    monthly_per_change: '3.2',
    prev_market_cap: '150000000000',
    ytd_per_change: '8.5',
    net_change: '2.50',
    weekly_change: '3.75',
    high: '175.50',
    market_cap: '160000000000',
    low: '168.00',
    dy: '1.8',
    seo_string: 'caterpillar-inc',
    '52wkLow': '140.00',
    market_cap_billion: '160',
    '3years_per_change': '45.0',
    ttmeps: '12.50',
    '6months_per_change': '12.0',
    percent_change: '1.45',
    sector: 'Industrials',
    market_type: 'US',
    beta: '1.2',
    '52wkHigh': '180.00',
    lastupd: '2024-01-15 10:30:00',
    '2years_per_change': '25.0',
    ticker: 'CAT',
    '5years_change': '60.0',
    market_state: MarketState.LIVE,
    '6months_change': '18.00',
    '3years_change': '55.00',
    lastupd_epoch: 1705307400000,
    '3months_change': '8.00',
    yearly_per_change: '20.0',
    '2years_change': '30.00',
    yearly_change: '24.00',
    indices: 'DJI,SPX',
    ytd_change: '12.00',
    '3months_per_change': '5.0',
    name: 'Caterpillar Inc.',
    '5years_per_change': '60.0',
    ttm_pe_text: '25.5',
    current_price: '172.50',
    ttmpe: '25.5',
    monthly_change: '5.00',
    open: '170.00',
    prev_close: '168.00',
    ask_price: '172.55',
    bid_price: '172.45',
  },
};

export const mockForexResponse: ForexResponse = {
  success: 1,
  data: {
    headers: ['Rupee', 'USD', 'EUR'],
    flags: ['in', 'us', 'eu'],
    data: [
      [1, 0.012, 0.011],
      [83.5, 1, 0.92],
      [90.8, 1.09, 1],
    ],
  },
};

export const mockCurrencyListResponse: CurrencyListResponse[] = [
  {
    currencyCode: 'INR',
    country: 'India',
    countryName: 'India',
    countryIconMsid: '123',
  },
  {
    currencyCode: 'USD',
    country: 'United States',
    countryName: 'United States',
    countryIconMsid: '456',
  },
  {
    currencyCode: 'EUR',
    country: 'European Union',
    countryName: 'European Union',
    countryIconMsid: '789',
  },
  {
    currencyCode: 'GBP',
    country: 'United Kingdom',
    countryName: 'United Kingdom',
    countryIconMsid: '101',
  },
];

export const mockSearchResponse: SearchResponse[] = [
  {
    link_src: '/stocks',
    link_track: '/stocks/caterpillar',
    pdt_dis_nm: '<span>INE002A01018,CAT:US,General</span>',
    name: 'Caterpillar Inc.',
    sc_id: 'CAT',
    stock_name: 'Caterpillar Inc.',
    sc_sector_id: 's1',
    sc_sector: 'Industrials',
    forum_topics_url: '',
  },
  {
    link_src: '/stocks',
    link_track: '/stocks/deere',
    pdt_dis_nm: '<span>INE003A01018,DE:US,General</span>',
    name: 'Deere & Co.',
    sc_id: 'DE',
    stock_name: 'Deere & Co.',
    sc_sector_id: 's2',
    sc_sector: 'Industrials',
    forum_topics_url: '',
  },
];

export const mockHistoricChartResponse: HistoricChartResponse = {
  s: ChartResponseStatus.OK,
  t: [1705307400, 1705134600, 1705048200],
  o: [170, 168, 167],
  h: [175.5, 172, 170],
  l: [168, 166.5, 166],
  c: [172.5, 168, 169.5],
};

export const mockIntraDayChartResponse: IntraDayChartResponse = {
  s: ChartResponseStatus.OK,
  data: [
    { time: 1705307400000, value: 170 },
    { time: 1705309200000, value: 171.5 },
    { time: 1705311000000, value: 172.5 },
  ],
  direction: 1,
  nextCall: false,
};

export const mockMarketStatusResponse: StockResponse = {
  code: '200',
  message: 'Success',
  data: {
    ...mockStockResponse.data,
    market_state: MarketState.LIVE,
    lastupd_epoch: Date.now(),
  },
};

export const mockMarketClosedResponse: StockResponse = {
  code: '200',
  message: 'Success',
  data: {
    ...mockStockResponse.data,
    market_state: MarketState.CLOSE,
    percent_change: '0',
    net_change: '0',
    lastupd_epoch: Date.now(),
  },
};
