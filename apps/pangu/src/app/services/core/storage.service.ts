import { Injectable } from '@angular/core';
import { liveQuery, Observable } from 'dexie';
import {
  ExportProgress as Progress,
  exportDB,
  importInto,
} from 'dexie-export-import';
import { v4 as uuid } from 'uuid';

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

  public async insert(holding: Holding): Promise<void> {
    const stock = await db.stocks.get({
      'scripCode.nse': holding.scripCode.nse,
    });

    if (!stock) {
      holding = {
        ...holding,
        id: uuid(),
      };
      await db.stocks.add(holding, holding.id);
    } else {
      this.update(holding);
    }
  }

  public async update(holding: Holding): Promise<void> {
    let updated = 0;

    if (holding.id) {
      updated = await db.stocks.update(holding.id, {
        transactions: holding.transactions,
      });
    }

    if (!updated) {
      this.insert(holding);
    }
  }

  public async delete(id: string): Promise<void> {
    await db.stocks.delete(id);
  }

  public async importDb(
    blob: Blob,
    progressCallback: (progress: Progress) => boolean
  ): Promise<void> {
    await db.delete();

    await db.open();

    await importInto(db, blob, {
      progressCallback,
    });
  }

  public async exportDb(
    progressCallback: (progress: Progress) => boolean
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
