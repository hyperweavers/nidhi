import { Injectable } from '@angular/core';
import { liveQuery, Observable } from 'dexie';

import { Holding } from '../../models/portfolio';
import { db } from '../../db/app.db';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  public stocks$: Observable<Holding[]>;

  constructor() {
    this.stocks$ = liveQuery<Holding[]>(() => db.stocks.toArray());
  }

  // public insert() {}

  // public update() {}

  // public delete() {}

  // public importDb() {}

  // public exportDb() {}

  // public deleteDb() {}
}
