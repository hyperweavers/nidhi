import Dexie, { Table } from 'dexie';
import { v4 as uuid } from 'uuid';

import { Holding, TransactionType } from '../models/portfolio';

class AppDB extends Dexie {
  stocks!: Table<Holding, string>;

  constructor() {
    super('pangu');

    this.version(1).stores({
      stocks: '&id, &symbol, &vendorCode',
    });

    // TODO: Remove
    this.on('populate', async () => {
      await db.stocks.bulkAdd([
        {
          id: uuid(),
          name: 'Infosys',
          scripCode: {
            nse: 'INFY',
          },
          vendorCode: {
            etm: '10960',
          },
          transactions: [
            {
              id: uuid(),
              type: TransactionType.BUY,
              date: Date.now(),
              quantity: 5,
              price: 1200.0,
              charges: 15.0,
            },
            {
              id: uuid(),
              type: TransactionType.BUY,
              date: Date.now(),
              quantity: 3,
              price: 1300.0,
              charges: 18.0,
            },
          ],
        },
        {
          id: uuid(),
          name: 'Info Edge',
          scripCode: {
            nse: 'NAUKRI',
          },
          vendorCode: {
            etm: '18352',
          },
          transactions: [
            {
              id: uuid(),
              type: TransactionType.BUY,
              date: Date.now(),
              quantity: 2,
              price: 5000.0,
              charges: 60.0,
            },
          ],
        },
      ]);
    });
  }
}

export const db = new AppDB();
