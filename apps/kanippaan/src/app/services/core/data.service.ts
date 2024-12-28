import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, distinctUntilChanged, map } from 'rxjs';

import { Constants } from '../../constants';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public goldRate$: Observable<number>;

  constructor(private http: HttpClient) {
    this.goldRate$ = this.http
      .post(Constants.api.GOLD_PRICE, {
        query:
          'query{allDailyMetalPrices(condition:{isActive:true,displayName:"Gold 22K"}){nodes{displayPrice updatedAt}}}',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any) =>
            res?.data?.allDailyMetalPrices?.nodes[0]?.displayPrice || 0,
        ),
        distinctUntilChanged(),
      );
  }
}
