import { Injectable } from '@angular/core';
import { liveQuery, Observable } from 'dexie';
import {
  exportDB,
  importInto,
  ExportProgress as Progress,
} from 'dexie-export-import';
import { v4 as uuid } from 'uuid';

import { db } from '../../db/app.db';
import { Holding, Transaction } from '../../models/portfolio';
import { Stock } from '../../models/stock';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  public stocks$: Observable<Holding[]>;

  constructor() {
    this.stocks$ = liveQuery<Holding[]>(() => db.stocks.toArray());
  }

  public async addOrUpdate(
    holding: Stock | Holding,
    transaction: Transaction,
  ): Promise<void> {
    const stock = await db.stocks.get({
      'scripCode.isin': holding.scripCode.isin,
    });

    if (stock?.id) {
      await db.stocks.update(stock.id, {
        transactions: [...stock.transactions, transaction],
      });
    } else {
      holding = {
        ...holding,
        id: uuid(),
        transactions: [transaction],
      };
      await db.stocks.add(holding, holding.id);
    }
  }

  public async delete(id: string): Promise<void> {
    await db.stocks.delete(id);
  }

  public async importDb(
    blob: Blob,
    progressCallback: (progress: Progress) => boolean,
  ): Promise<void> {
    await db.delete();

    await db.open();

    await importInto(db, blob, {
      progressCallback,
    });
  }

  public async exportDb(
    progressCallback: (progress: Progress) => boolean,
  ): Promise<Blob> {
    return await exportDB(db, {
      progressCallback,
    });
  }

  public async deleteDb(): Promise<void> {
    await db.delete();

    await db.open();
  }
}
