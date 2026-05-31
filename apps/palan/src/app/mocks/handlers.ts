import { http, HttpResponse, delay } from 'msw';
import { Constants } from '../constants';
import {
  mockStockResponse,
  mockForexResponse,
  mockCurrencyListResponse,
  mockSearchResponse,
  mockHistoricChartResponse,
  mockIntraDayChartResponse,
  mockMarketStatusResponse,
  mockMarketClosedResponse,
} from './data';

export const handlers = [
  http.get(Constants.api.MARKET_STATUS + ':symbol', async ({ params }) => {
    await delay(50);
    return HttpResponse.json(mockMarketStatusResponse);
  }),

  http.get(Constants.api.STOCK_QUOTE + ':code', async () => {
    await delay(50);
    return HttpResponse.json(mockStockResponse);
  }),

  http.get(Constants.api.STOCK_SEARCH + ':query', async () => {
    await delay(50);
    return HttpResponse.json(mockSearchResponse);
  }),

  http.get(Constants.api.STOCK_HISTORIC_CHART, async () => {
    await delay(50);
    return HttpResponse.json(mockHistoricChartResponse);
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json(mockIntraDayChartResponse);
  }),

  http.get(Constants.api.FOREX, async () => {
    await delay(50);
    return HttpResponse.json(mockForexResponse);
  }),

  http.get(Constants.api.CURRENCY_LIST, async () => {
    await delay(50);
    return HttpResponse.json(mockCurrencyListResponse);
  }),
];

export const errorHandlers = [
  http.get(Constants.api.MARKET_STATUS + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }),

  http.get(Constants.api.STOCK_QUOTE + ':code', async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),

  http.get(Constants.api.FOREX, async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Service Unavailable' }, { status: 503 });
  }),

  http.get(Constants.api.CURRENCY_LIST, async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
];

export const marketClosedHandlers = [
  http.get(Constants.api.MARKET_STATUS + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json(mockMarketClosedResponse);
  }),
];

export const failedForexHandlers = [
  http.get(Constants.api.FOREX, async () => {
    await delay(50);
    return HttpResponse.json({ success: 0, data: { headers: [], flags: [], data: [] } });
  }),
];

export const noDataHandlers = [
  http.get(Constants.api.STOCK_HISTORIC_CHART, async () => {
    await delay(50);
    return HttpResponse.json({ s: 'no_data', t: [], o: [], h: [], l: [], c: [] });
  }),

  http.get(Constants.api.STOCK_INTRA_DAY_CHART + ':symbol', async () => {
    await delay(50);
    return HttpResponse.json({ s: 'no_data', data: [], direction: 0, nextCall: false });
  }),
];
