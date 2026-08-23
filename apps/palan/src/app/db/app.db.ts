import Dexie, { EntityTable } from 'dexie';

import { Constants } from '../constants';
import { Plan } from '../models/plan';
import { Holding } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: EntityTable<Holding, 'id'>;
  plan!: EntityTable<Plan, 'id'>;

  constructor() {
    super(Constants.db.NAME);

    this.version(1).stores({
      stocks: '&id, &scripCode.isin',
      plan: '&id',
    });
  }
}

export const db = new AppDB();
