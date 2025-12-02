import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, Observable } from 'rxjs';

import { Constants } from '../../constants';
import { Currency, CurrencyMatrix } from '../../models/currency';
import { CurrencyListResponse } from '../../models/vendor/etm';
import { currencyCodeMap, ForexResponse } from '../../models/vendor/mc';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly http = inject(HttpClient);

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
      );
  }

  public getForexRates(): Observable<CurrencyMatrix> {
    return this.http.get<ForexResponse>(Constants.api.FOREX).pipe(
      map((response) => {
        const matrix: CurrencyMatrix = {};

        if (response.success !== 1) {
          console.error('Failed to fetch forex rates!');
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
    );
  }
}
