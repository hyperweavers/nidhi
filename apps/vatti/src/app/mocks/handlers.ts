import { delay, http, HttpResponse } from 'msw';
import { Constants } from '../constants';
import {
  mockBanksInIndia,
  mockGoldRateResponse,
  mockIbjaGoldRates,
  mockPostOfficeSavingsSchemes,
  mockRbiPolicyRates,
} from './data';

export const handlers = [
  http.post(Constants.api.GOLD_PRICE, async () => {
    await delay(50);
    return HttpResponse.json(mockGoldRateResponse);
  }),

  http.get(
    `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.POST_OFFICE_SAVINGS_SCHEMES}`,
    async () => {
      await delay(50);
      return HttpResponse.json(mockPostOfficeSavingsSchemes);
    },
  ),

  http.get(
    `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.RBI_POLICY_RATES}`,
    async () => {
      await delay(50);
      return HttpResponse.json(mockRbiPolicyRates);
    },
  ),

  http.get(
    `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.BANKS_IN_INDIA_JSON_BLOB}`,
    async () => {
      await delay(50);
      return HttpResponse.json(mockBanksInIndia);
    },
  ),

  http.get(
    `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.IBJA_GOLD_RATES_JSON_BLOB}`,
    async () => {
      await delay(50);
      return HttpResponse.json(mockIbjaGoldRates);
    },
  ),
];

export const errorHandlers = [
  http.post(Constants.api.GOLD_PRICE, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: 'Service Unavailable' },
      { status: 503 },
    );
  }),

  http.get(`${Constants.api.JSON_BLOB_STORAGE}/`, async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),
];

export const timeoutHandlers = [
  http.post(Constants.api.GOLD_PRICE, async () => {
    await delay(6000);
    return HttpResponse.json(mockGoldRateResponse);
  }),

  http.get(`${Constants.api.JSON_BLOB_STORAGE}/`, async () => {
    await delay(6000);
    return HttpResponse.json(mockPostOfficeSavingsSchemes);
  }),
];
