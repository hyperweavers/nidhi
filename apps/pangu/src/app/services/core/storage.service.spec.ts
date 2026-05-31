import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { StorageService } from './storage.service';
import { db } from '../../db/app.db';
import { TransactionType } from '../../models/portfolio';
import { Stock } from '../../models/stock';

jest.mock('../../db/app.db', () => ({
  db: {
    stocks: {
      get: jest.fn(),
      update: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      toArray: jest.fn().mockResolvedValue([]),
    },
    delete: jest.fn(),
    open: jest.fn(),
  },
}));

jest.mock('dexie-export-import', () => ({
  importInto: jest.fn().mockResolvedValue(undefined),
  exportDB: jest.fn().mockResolvedValue(new Blob(['test'])),
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('new-uuid') }));

jest.mock('dexie', () => {
  const { Observable } = jest.requireActual('rxjs');
  return {
    liveQuery: jest.fn().mockImplementation((fn) => {
      return new Observable((subscriber) => {
        Promise.resolve(fn()).then(
          (val) => {
            subscriber.next(val);
            subscriber.complete();
          },
          (err) => subscriber.error(err),
        );
      });
    }),
    Observable,
  };
});

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [StorageService],
    });
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stocks$ should emit initial empty array from liveQuery', async () => {
    const stocks = await firstValueFrom(service.stocks$);
    expect(stocks).toEqual([]);
    expect(db.stocks.toArray).toHaveBeenCalled();
  });

  describe('addOrUpdate', () => {
    const transaction = {
      id: 'new-tx',
      type: TransactionType.BUY,
      date: 2000,
      quantity: 5,
      price: 200,
    };

    const holding: Stock = {
      name: 'Test Stock',
      scripCode: { isin: 'TESTISIN001' },
      vendorCode: { etm: { primary: 'test', chart: '' }, mc: { primary: '' } },
      details: { sector: 'Technology', industry: 'Software' },
      metrics: {
        nse: {
          marketCapType: 'Large Cap',
          marketCap: 100000,
          faceValue: 10,
          pe: 20,
          pb: 3,
          eps: 5,
          vwap: 150,
          dividendYield: 1,
          bookValue: 50,
        },
      },
    };

    const existingTx = {
      id: 'tx1',
      type: TransactionType.BUY,
      date: 1000,
      quantity: 10,
      price: 100,
    };

    const existingHolding = {
      id: 'existing-id',
      name: 'Test Stock',
      scripCode: { isin: 'TESTISIN001' },
      vendorCode: { etm: { primary: 'test', chart: '' }, mc: { primary: '' } },
      transactions: [existingTx],
      details: { sector: 'Technology', industry: 'Software' },
      metrics: {
        nse: {
          marketCapType: 'Large Cap',
          marketCap: 100000,
          faceValue: 10,
          pe: 20,
          pb: 3,
          eps: 5,
          vwap: 150,
          dividendYield: 1,
          bookValue: 50,
        },
      },
    };

    it('should update existing stock with merged transactions and conditional details/metrics', async () => {
      (db.stocks.get as jest.Mock).mockResolvedValue(existingHolding);

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.get).toHaveBeenCalledWith({
        'scripCode.isin': 'TESTISIN001',
      });
      expect(db.stocks.update).toHaveBeenCalledWith('existing-id', {
        transactions: [...existingHolding.transactions, transaction],
      });
      expect(db.stocks.add).not.toHaveBeenCalled();
    });

    it('should add new stock with generated uuid and transaction when no existing stock found', async () => {
      (db.stocks.get as jest.Mock).mockResolvedValue(undefined);

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.add).toHaveBeenCalledWith(
        { ...holding, id: 'new-uuid', transactions: [transaction] },
        'new-uuid',
      );
      expect(db.stocks.update).not.toHaveBeenCalled();
    });

    it('should NOT include details when existing stock already has sector', async () => {
      const existingWithSectorNoMetrics = {
        ...existingHolding,
        metrics: undefined,
      };
      (db.stocks.get as jest.Mock).mockResolvedValue(
        existingWithSectorNoMetrics,
      );

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.update).toHaveBeenCalledWith(
        'existing-id',
        expect.not.objectContaining({ details: expect.anything() }),
      );
    });

    it('should include details when existing stock lacks sector', async () => {
      const existingNoSector = { ...existingHolding, details: undefined };
      (db.stocks.get as jest.Mock).mockResolvedValue(existingNoSector);

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.update).toHaveBeenCalledWith(
        'existing-id',
        expect.objectContaining({ details: holding.details }),
      );
    });
  });

  describe('delete', () => {
    it('should call db.stocks.delete with the given id', async () => {
      await service.delete('stock-id');
      expect(db.stocks.delete).toHaveBeenCalledWith('stock-id');
    });
  });

  describe('importDb', () => {
    it('should delete db, open db, and import blob with progress callback', async () => {
      const blob = new Blob(['data']);
      const progressCallback = jest.fn();

      await service.importDb(blob, progressCallback);

      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
      const { importInto } = await import('dexie-export-import');
      expect(importInto).toHaveBeenCalledWith(db, blob, {
        progressCallback,
      });
    });
  });

  describe('exportDb', () => {
    it('should call exportDB with progress callback and return the blob', async () => {
      const progressCallback = jest.fn();

      const result = await service.exportDb(progressCallback);

      const { exportDB } = await import('dexie-export-import');
      expect(exportDB).toHaveBeenCalledWith(db, { progressCallback });
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('deleteDb', () => {
    it('should call db.delete() then db.open()', async () => {
      await service.deleteDb();

      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
    });
  });
});
