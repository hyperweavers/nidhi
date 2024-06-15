import { Injectable } from '@angular/core';
import { liveQuery, Observable } from 'dexie';
import {
  ExportProgress as Progress,
  exportDB,
  importInto,
} from 'dexie-export-import';

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
