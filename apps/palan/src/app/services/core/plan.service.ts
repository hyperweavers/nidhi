import { Injectable } from '@angular/core';

import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { db } from '../../db/app.db';
import { Plan } from '../../models/plan';

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  public plan$: Observable<Plan | undefined>;

  constructor() {
    this.plan$ = from(
      liveQuery<Plan | undefined>(() => db.plan.orderBy(':id').first()),
    );
  }

  public async addOrUpdate(plan: Plan): Promise<void> {
    if (!plan.id) {
      plan = { ...plan, id: uuid() };
    }

    await db.plan.put(plan);
  }
}
