import { delay, http, HttpResponse } from 'msw';
import { Constants } from '../constants';
import {
  mockCompanyDetails,
  mockDashboard,
  mockHistory,
  mockIndexConstituents,
  mockIndexDetails,
  mockIndexQuotes,
  mockIntraDay,
  mockSearchResults,
  mockSearchSecondary,
  mockStockPeerChart,
} from './data';
import {
  mockBs,
  mockCf,
  mockIpoCalendar,
  mockIpoDetails,
  mockIpoLinks,
  mockListedIpos,
  mockPnl,
  mockQuarterly,
} from './ipo-data';

export const handlers = [
  http.get(Constants.api.MARKET_STATUS, async () => {
    await delay(50);
    return HttpResponse.json(mockIndexQuotes);
  }),

  http.post(Constants.api.DASHBOARD, async () => {
    await delay(50);
    return HttpResponse.json(mockDashboard);
  }),

  http.get(Constants.api.STOCK_QUOTE.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockCompanyDetails);
  }),

  http.get(Constants.api.STOCK_HISTORIC_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockHistory);
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockIntraDay);
  }),

  http.get(Constants.api.STOCK_SEARCH.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockSearchResults);
  }),

  http.get(Constants.api.STOCK_SEARCH_SECONDARY.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockSearchSecondary);
  }),

  http.get(Constants.api.INDEX_QUOTE.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockIndexDetails);
  }),

  http.get(Constants.api.INDEX_CONSTITUENTS.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockIndexConstituents);
  }),

  http.get(Constants.api.STOCK_HISTORIC_PEER_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockStockPeerChart);
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_PEER_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockStockPeerChart);
  }),

  http.get(Constants.api.INDEX_HISTORIC_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockHistory);
  }),

  http.get(Constants.api.INDEX_INTRA_DAY_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json(mockIntraDay);
  }),

  http.get('*/index-byid', async () => {
    await delay(50);
    return HttpResponse.json(mockIndexQuotes);
  }),

  http.get('*/index-summary*', async () => {
    await delay(50);
    return HttpResponse.json(mockIndexDetails);
  }),

  http.get('*/getIndexByIds*', async () => {
    await delay(50);
    return HttpResponse.json(mockIndexConstituents);
  }),

  http.get(Constants.api.IPO_CALENDAR, async () => {
    await delay(50);
    return HttpResponse.json(mockIpoCalendar);
  }),

  http.get(Constants.api.IPO_DETAILS, async () => {
    await delay(50);
    return HttpResponse.json(mockIpoDetails);
  }),

  http.get(Constants.api.IPO_DETAILS_ONLY, async () => {
    await delay(50);
    return HttpResponse.json(mockIpoLinks);
  }),

  http.get(Constants.api.IPO_LISTED, async () => {
    await delay(50);
    return HttpResponse.json(mockListedIpos);
  }),

  http.get('*/GetProfitAndLossStatementInCurrencyFormat*', async () => {
    await delay(50);
    return HttpResponse.json(mockPnl);
  }),

  http.get('*/GetQuarterlyResultsInCurrencyFormat*', async () => {
    await delay(50);
    return HttpResponse.json(mockQuarterly);
  }),

  http.get('*/GetBalanceSheetInCurrencyFormat*', async () => {
    await delay(50);
    return HttpResponse.json(mockBs);
  }),

  http.get('*/GetCompanyCashFlowInCurrencyFormat*', async () => {
    await delay(50);
    return HttpResponse.json(mockCf);
  }),
];

export const errorHandlers = [
  http.get(Constants.api.MARKET_STATUS, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 },
    );
  }),

  http.post(Constants.api.DASHBOARD, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: 'Service Unavailable' },
      { status: 503 },
    );
  }),

  http.get(Constants.api.STOCK_QUOTE.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
];

export const noDataHandlers = [
  http.get(Constants.api.STOCK_HISTORIC_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json({ ...mockHistory, noData: true, dates: [] });
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART.split('?')[0], async () => {
    await delay(50);
    return HttpResponse.json({ s: 'no_data', data: [] });
  }),
];
