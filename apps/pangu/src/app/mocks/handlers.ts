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

export const handlers = [
  http.get(Constants.api.MARKET_STATUS, async () => {
    await delay(50);
    return HttpResponse.json(mockIndexQuotes);
  }),

  http.post(Constants.api.DASHBOARD, async () => {
    await delay(50);
    return HttpResponse.json(mockDashboard);
  }),

  http.get(Constants.api.STOCK_QUOTE + ':code', async ({ params }) => {
    await delay(50);
    return HttpResponse.json(mockCompanyDetails);
  }),

  http.get(Constants.api.STOCK_HISTORIC_CHART, async () => {
    await delay(50);
    return HttpResponse.json(mockHistory);
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json(mockIntraDay);
  }),

  http.get(Constants.api.STOCK_SEARCH + ':query', async () => {
    await delay(50);
    return HttpResponse.json(mockSearchResults);
  }),

  http.get(Constants.api.STOCK_SEARCH_SECONDARY + ':query', async () => {
    await delay(50);
    return HttpResponse.json(mockSearchSecondary);
  }),

  http.get(Constants.api.INDEX_QUOTE + ':code', async () => {
    await delay(50);
    return HttpResponse.json(mockIndexDetails);
  }),

  http.get(Constants.api.INDEX_CONSTITUENTS, async () => {
    await delay(50);
    return HttpResponse.json(mockIndexConstituents);
  }),

  http.get(Constants.api.STOCK_HISTORIC_PEER_CHART, async () => {
    await delay(50);
    return HttpResponse.json(mockStockPeerChart);
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_PEER_CHART + ':symbols', async () => {
    await delay(50);
    return HttpResponse.json(mockStockPeerChart);
  }),

  http.get(Constants.api.INDEX_HISTORIC_CHART, async () => {
    await delay(50);
    return HttpResponse.json(mockHistory);
  }),

  http.get(Constants.api.INDEX_INTRA_DAY_CHART + ':symbol', async () => {
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

  http.get(Constants.api.STOCK_QUOTE + ':code', async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
];

export const noDataHandlers = [
  http.get(Constants.api.STOCK_HISTORIC_CHART, async () => {
    await delay(50);
    return HttpResponse.json({ ...mockHistory, noData: true, dates: [] });
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json({ s: 'no_data', data: [] });
  }),
];
