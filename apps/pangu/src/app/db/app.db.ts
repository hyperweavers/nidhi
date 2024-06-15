import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

import { StockEntity, TransactionEntity } from './entities';

class AppDB extends Dexie {
  stocks!: Table<StockEntity, string>;
  transactions!: Table<TransactionEntity, string>;

  constructor() {
    super('pangu');

    this.version(1).stores({
      stocks: '&id, &symbol, &vendorCode',
      transactions: '&id, stockId',
    });
    this.on('populate', async () => {
      await db.stocks.bulkAdd([
        {
          id: uuidv4(),
          name: 'Infosys',
          symbol: 'INFY',
          vendorCode: '10960',
        },
        {
          id: uuidv4(),
          name: 'Info Edge',
          symbol: 'NAUKRI',
          vendorCode: '18352',
        },
      ]);
    });
  }
}

export const db = new AppDB();

[
  {
    name: 'Infosys',
    vendorCode: {
      etm: '10960',
    },
    scripCode: {
      nse: 'INFY',
    },
    quote: {
      price: 1414.45,
    },
  },
  {
    name: 'Info Edge',
    vendorCode: {
      etm: '18352',
    },
    scripCode: {
      nse: 'NAUKRI',
    },
    quote: {
      price: 6061.25,
    },
  },
  {
    name: 'InfoBeans Tech',
    vendorCode: {
      etm: '59671',
    },
    scripCode: {
      nse: 'INFOBEAN',
    },
    quote: {
      price: 386.25,
    },
  },
  {
    name: 'Infollion Research',
    vendorCode: {
      etm: '2119712',
    },
    scripCode: {
      nse: 'INFOLLIONSM',
    },
    quote: {
      price: 221.1,
    },
  },
];
