import { inject, Injectable, Signal } from '@angular/core';
import { liveQuery, Observable } from 'dexie';
import {
  exportDB,
  importInto,
  ExportProgress as Progress,
} from 'dexie-export-import';
import { v4 as uuid } from 'uuid';

import { toSignal } from '@angular/core/rxjs-interop';
import { db } from '../../db/app.db';
import { Plan } from '../../models/plan';
import { Holding, Transaction } from '../../models/portfolio';
import { PlanService } from './plan.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  readonly planService = inject(PlanService);

  public stocks$: Observable<Holding[]>;

  private plan: Signal<Plan | undefined>;

  constructor() {
    const planService = this.planService;

    this.stocks$ = liveQuery<Holding[]>(() => db.stocks.toArray());

    this.plan = toSignal<Plan | undefined>(planService.plan$);
  }

  public async addOrUpdate(transaction: Transaction): Promise<void> {
    const plan = this.plan();

    if (plan) {
      const stock = await db.stocks.get({
        'scripCode.isin': plan.stock.scripCode.isin,
      });

      if (stock?.id) {
        await db.stocks.update(stock.id, {
          transactions: [...stock.transactions, transaction],
        });
      } else {
        const id = uuid();

        await db.stocks.add(
          {
            ...plan.stock,
            id,
            transactions: [transaction],
          },
          id,
        );
      }
    } else {
      throw new Error('No plan defined!');
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
