import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { LOGGER } from '@nidhi/shared-logger';

import { catchError, map, Observable, of } from 'rxjs';

import {
  currencyCodeMap,
  CurrencyListResponse,
  ForexResponse,
} from '../../adapters/market.adapter';
import { Constants } from '../../constants';
import { Currency, CurrencyMatrix } from '../../models/currency';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LOGGER);

  public getCurrencyList(): Observable<Currency[]> {
    return this.http
      .get<CurrencyListResponse[]>(Constants.api.CURRENCY_LIST)
      .pipe(
        map((currencies) =>
          currencies.map(
            (currency): Currency => ({
              code: currency.currencyCode,
              country: currency.country,
              icon: `${Constants.currency.iconUrl.prefix}${currency.countryIconMsid}${Constants.currency.iconUrl.suffix}`,
            }),
          ),
        ),
        catchError((error) => {
          this.logger.error(error);

          return of([]);
        }),
      );
  }

  public getForexRates(): Observable<CurrencyMatrix> {
    return this.http.get<ForexResponse>(Constants.api.FOREX).pipe(
      map((response) => {
        const matrix: CurrencyMatrix = {};

        if (response.success !== 1) {
          this.logger.error('Failed to fetch forex rates!');
        } else {
          const headers = response.data.headers;
          const rates = response.data.data;

          headers.forEach((fromCurrency, i) => {
            const fromCode = currencyCodeMap[fromCurrency];
            if (!fromCode) return;

            matrix[fromCode] = {};
            headers.forEach((toCurrency, j) => {
              const toCode = currencyCodeMap[toCurrency];
              if (!toCode) return;

              matrix[fromCode][toCode] = rates[i][j];
            });
          });
        }

        return matrix;
      }),
      catchError((error) => {
        this.logger.error(error);

        return of({});
      }),
    );
  }
}
