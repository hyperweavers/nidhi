import Dexie, { Table } from 'dexie';

import { Constants } from '../constants';
import { Plan } from '../models/plan';
import { Holding } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;
  plan!: Table<Plan, string>;

  constructor() {
    super(Constants.db.NAME);

    this.version(1).stores({
      stocks: '&id, &scripCode.isin',
      plan: '&id',
    });
  }
}

export const db = new AppDB();
