import { TestBed } from '@angular/core/testing';
import { liveQuery } from 'dexie';
import { exportDB, importInto } from 'dexie-export-import';
import { db } from '../../db/app.db';
import { StorageService } from './storage.service';

jest.mock('../../db/app.db', () => ({
  db: {
    stocks: {
      toArray: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
    },
    delete: jest.fn(),
    open: jest.fn(),
  },
}));

jest.mock('dexie', () => ({
  liveQuery: jest.fn().mockImplementation((cb) => cb()),
}));

jest.mock('dexie-export-import', () => ({
  exportDB: jest.fn(),
  importInto: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  it('should be created and set up stocks$', () => {
    expect(service).toBeTruthy();
    expect(liveQuery).toHaveBeenCalled();
    // Since we mocked liveQuery to return cb(), we can verify it called toArray
    expect(db.stocks.toArray).toHaveBeenCalled();
  });

  describe('addOrUpdate', () => {
    it('should update stock if it already exists', async () => {
      const existingStock = {
        id: 'stock-1',
        scripCode: { isin: '123' },
        transactions: ['tx1'],
      };

      (db.stocks.get as jest.Mock).mockResolvedValue(existingStock);

      const holding = { scripCode: { isin: '123' } } as any;
      const transaction = 'tx2' as any;

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.get).toHaveBeenCalledWith({ 'scripCode.isin': '123' });
      expect(db.stocks.update).toHaveBeenCalledWith('stock-1', {
        transactions: ['tx1', 'tx2'],
      });
      expect(db.stocks.add).not.toHaveBeenCalled();
    });

    it('should assign a uuid and add stock if it does not exist', async () => {
      (db.stocks.get as jest.Mock).mockResolvedValue(undefined);

      const holding = { scripCode: { isin: '456' } } as any;
      const transaction = 'tx1' as any;

      await service.addOrUpdate(holding, transaction);

      expect(db.stocks.add).toHaveBeenCalledWith(
        {
          ...holding,
          id: 'test-uuid',
          transactions: ['tx1'],
        },
        'test-uuid',
      );
    });
  });

  describe('delete', () => {
    it('should delete stock by id', async () => {
      await service.delete('stock-1');
      expect(db.stocks.delete).toHaveBeenCalledWith('stock-1');
    });
  });

  describe('importDb', () => {
    it('should delete, open, and import db', async () => {
      const mockBlob = new Blob();
      const progressCb = () => true;

      await service.importDb(mockBlob, progressCb);

      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
      expect(importInto).toHaveBeenCalledWith(db, mockBlob, {
        progressCallback: progressCb,
      });
    });
  });

  describe('exportDb', () => {
    it('should export db', async () => {
      (exportDB as jest.Mock).mockResolvedValue('exported-blob');
      const progressCb = () => true;

      const result = await service.exportDb(progressCb);

      expect(exportDB).toHaveBeenCalledWith(db, {
        progressCallback: progressCb,
      });
      expect(result).toBe('exported-blob');
    });
  });

  describe('deleteDb', () => {
    it('should delete and open db', async () => {
      await service.deleteDb();
      expect(db.delete).toHaveBeenCalled();
      expect(db.open).toHaveBeenCalled();
    });
  });
});
