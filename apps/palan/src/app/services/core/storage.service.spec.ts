import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StorageService } from './storage.service';
import { PlanService } from './plan.service';

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
  exportDB: jest.fn().mockResolvedValue(new Blob(['test-data'])),
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));

jest.mock('dexie', () => {
  const { of } = jest.requireActual('rxjs');
  return {
    liveQuery: jest.fn((fn) => {
      fn();
      return of([]);
    }),
    Observable: class {},
  };
});

import { db } from '../../db/app.db';
import { importInto, exportDB } from 'dexie-export-import';
import { v4 as uuid } from 'uuid';
import { liveQuery } from 'dexie';
import { Transaction } from '../../models/portfolio';

const mockPlan = {
  id: 'plan-1',
  stock: {
    name: 'Apple Inc.',
    scripCode: { isin: 'US0378331005', ticker: 'AAPL', country: 'US' },
    vendorCode: 'NASDAQ',
  },
  lockInPeriod: 0,
  currencies: {
    purchase: { code: 'USD' },
    contribution: { code: 'USD' },
  },
};

const mockTransaction: Transaction = {
  id: 'tx-1',
  type: 'BUY' as any,
  date: 1234567890,
  quantity: 10,
  price: { value: 150, currency: { code: 'USD' } },
  source: 'employee' as any,
  contribution: { value: 1500, currency: { code: 'USD' } },
};

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: PlanService, useValue: { plan$: of(mockPlan) } },
      ],
    });

    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addOrUpdate', () => {
    it('should update existing stock when plan is defined and stock found', async () => {
      const existingTransactions = [{ id: 'old-tx', type: 'BUY' }];
      (db.stocks.get as jest.Mock).mockResolvedValue({
        id: 'stock-1',
        transactions: existingTransactions,
      });

      await service.addOrUpdate(mockTransaction);

      expect(db.stocks.get).toHaveBeenCalledWith({
        'scripCode.isin': 'US0378331005',
      });
      expect(db.stocks.update).toHaveBeenCalledWith('stock-1', {
        transactions: [...existingTransactions, mockTransaction],
      });
      expect(db.stocks.add).not.toHaveBeenCalled();
    });

    it('should add new stock when plan is defined and no stock found', async () => {
      (db.stocks.get as jest.Mock).mockResolvedValue(undefined);

      await service.addOrUpdate(mockTransaction);

      expect(db.stocks.get).toHaveBeenCalledWith({
        'scripCode.isin': 'US0378331005',
      });
      expect(db.stocks.add).toHaveBeenCalledWith(
        {
          ...mockPlan.stock,
          id: 'mock-uuid',
          transactions: [mockTransaction],
        },
        'mock-uuid',
      );
      expect(db.stocks.update).not.toHaveBeenCalled();
      expect(uuid).toHaveBeenCalled();
    });

    it('should throw error when no plan defined', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          StorageService,
          { provide: PlanService, useValue: { plan$: of(undefined) } },
        ],
      });
      service = TestBed.inject(StorageService);

      await expect(service.addOrUpdate(mockTransaction)).rejects.toThrow(
        'No plan defined!',
      );
      expect(db.stocks.get).not.toHaveBeenCalled();
      expect(db.stocks.update).not.toHaveBeenCalled();
      expect(db.stocks.add).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should call db.stocks.delete with given id', async () => {
      await service.delete('stock-1');
      expect(db.stocks.delete).toHaveBeenCalledWith('stock-1');
    });
  });

  describe('importDb', () => {
    it('should delete db, open, import, and reconnect live query', async () => {
      const blob = new Blob(['test']);
      const progressCallback = jest.fn();
      const oldStocks$ = service.stocks$;

      await service.importDb(blob, progressCallback);

      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
      expect(importInto).toHaveBeenCalledWith(db, blob, {
        progressCallback,
      });
      expect(liveQuery).toHaveBeenCalledTimes(2);
      expect(service.stocks$).not.toBe(oldStocks$);
    });
  });

  describe('exportDb', () => {
    it('should export db and return a blob', async () => {
      const progressCallback = jest.fn();
      const result = await service.exportDb(progressCallback);

      expect(exportDB).toHaveBeenCalledWith(db, { progressCallback });
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('deleteDb', () => {
    it('should delete db, open, and reconnect live query', async () => {
      const oldStocks$ = service.stocks$;

      await service.deleteDb();

      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
      expect(liveQuery).toHaveBeenCalledTimes(2);
      expect(service.stocks$).not.toBe(oldStocks$);
    });
  });

  describe('stocks$', () => {
    it('should emit values from liveQuery', (done) => {
      service.stocks$.subscribe((val) => {
        expect(val).toEqual([]);
        done();
      });
    });
  });
});
