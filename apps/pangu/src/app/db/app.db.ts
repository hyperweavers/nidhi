import Dexie, { Table } from 'dexie';

import { Holding } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;

  constructor() {
    super('pangu');

    this.version(1).stores({
      stocks: '&id, &scripCode.nse',
    });
  }
}

export const db = new AppDB();
