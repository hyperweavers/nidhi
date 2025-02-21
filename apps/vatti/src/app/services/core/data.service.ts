import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  timeout,
} from 'rxjs';

import { Constants } from '../../constants';
import {
  BanksInIndia,
  IbjaGoldRates,
  RbiPolicyRates,
} from '../../models/common';
import { PostOfficeSavingsSchemes } from '../../models/deposit';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly HTTP_REQUEST_TIMEOUT_MS = 5_000; // 5 Seconds

  goldRate$: Observable<number>;
  postOfficeSavingsSchemes$: Observable<PostOfficeSavingsSchemes | null>;
  rbiPolicyRates$: Observable<RbiPolicyRates | null>;
  banksInIndia$: Observable<BanksInIndia | null>;
  ibjaGoldRates$: Observable<IbjaGoldRates | null>;

  constructor(private http: HttpClient) {
    this.goldRate$ = this.http
      .post(Constants.api.GOLD_PRICE, {
        query:
          'query{allDailyMetalPrices(condition:{isActive:true,displayName:"Gold 22K"}){nodes{displayPrice updatedAt}}}',
      })
      .pipe(
        timeout(this.HTTP_REQUEST_TIMEOUT_MS),
        catchError((error) => {
          console.error(error);

          return of(0);
        }),
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any) =>
            res?.data?.allDailyMetalPrices?.nodes[0]?.displayPrice || 0,
        ),
        distinctUntilChanged(),
      );

    this.postOfficeSavingsSchemes$ = this.http
      .get<PostOfficeSavingsSchemes>(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.POST_OFFICE_SAVINGS_SCHEMES}`,
      )
      .pipe(
        timeout(this.HTTP_REQUEST_TIMEOUT_MS),
        catchError((error) => {
          console.error(error);

          return of(null);
        }),
        distinctUntilChanged(),
        shareReplay(1),
      );

    this.rbiPolicyRates$ = this.http
      .get<RbiPolicyRates>(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.RBI_POLICY_RATES}`,
      )
      .pipe(
        timeout(this.HTTP_REQUEST_TIMEOUT_MS),
        catchError((error) => {
          console.error(error);

          return of(null);
        }),
        distinctUntilChanged(),
        shareReplay(1),
      );

    this.banksInIndia$ = this.http
      .get<BanksInIndia>(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.BANKS_IN_INDIA_JSON_BLOB}`,
      )
      .pipe(
        timeout(this.HTTP_REQUEST_TIMEOUT_MS),
        catchError((error) => {
          console.error(error);

          return of(null);
        }),
        distinctUntilChanged(),
        shareReplay(1),
      );

    this.ibjaGoldRates$ = this.http
      .get<IbjaGoldRates>(
        `${Constants.api.JSON_BLOB_STORAGE}/${Constants.jsonBlobs.IBJA_GOLD_RATES_JSON_BLOB}`,
      )
      .pipe(
        timeout(this.HTTP_REQUEST_TIMEOUT_MS),
        catchError((error) => {
          console.error(error);

          return of(null);
        }),
        distinctUntilChanged(),
        shareReplay(1),
      );
  }
}
