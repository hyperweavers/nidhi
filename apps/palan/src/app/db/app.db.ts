import Dexie, { Table } from 'dexie';

import { Constants } from '../constants';
import { Holding } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;

  constructor() {
    super(Constants.db.NAME);

    this.version(1).stores({
      stocks: '&id, &scripCode.isin',
    });
  }
}

export const db = new AppDB();
