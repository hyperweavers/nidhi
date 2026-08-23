import { fakeAsync, TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';

import { WatchList, WatchListStock } from '../models/watch-list';
import { WatchListService } from './watch-list.service';

interface MockDbTable {
  get: jest.Mock;
  toArray: jest.Mock;
  add: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  limit: jest.Mock;
  where: jest.Mock;
  equals: jest.Mock;
  first: jest.Mock;
  equalsIgnoreCase: jest.Mock;
  filter: jest.Mock;
  modify: jest.Mock;
  anyOf: jest.Mock;
}

interface MockDbTransaction {
  run: jest.Mock;
}

const mockUuid = '550e8400-e29b-41d4-a716-446655440000';

jest.mock('dexie', () => ({
  liveQuery: jest.fn((fn: () => any) => {
    const dexieObservable = {
      subscribe(observer: {
        next?: (v: any) => void;
        error?: (e: any) => void;
      }): { unsubscribe: () => void } {
        let active = true;

        Promise.resolve()
          .then(fn)
          .then((result) => {
            if (active && observer.next) observer.next(result);
          })
          .catch((e) => {
            if (active && observer.error) observer.error(e);
          });

        return {
          unsubscribe: () => {
            active = false;
          },
        };
      },
    };

    (dexieObservable as any)[
      (Symbol as { observable?: symbol }).observable ?? '@@observable'
    ] = () => dexieObservable;

    return dexieObservable;
  }),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => mockUuid),
}));

function createMockTable(): MockDbTable {
  return {
    get: jest.fn(),
    toArray: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    limit: jest.fn(),
    where: jest.fn(),
    equals: jest.fn(),
    first: jest.fn(),
    equalsIgnoreCase: jest.fn(),
    filter: jest.fn(),
    modify: jest.fn(),
    anyOf: jest.fn(),
  };
}

jest.mock('../db/app.db', () => {
  const watchLists = createMockTable();
  const watchListStocks = createMockTable();

  watchLists.where.mockReturnThis();
  watchLists.limit.mockReturnThis();
  watchLists.toArray.mockResolvedValue([]);

  watchListStocks.where.mockReturnThis();
  watchListStocks.toArray.mockResolvedValue([]);
  watchListStocks.filter.mockReturnThis();

  return {
    db: {
      watchLists,
      watchListStocks,
      transaction: jest.fn((...args: any[]) => args[args.length - 1]()),
    },
  };
});

const mockStock = {
  scripCode: {
    nse: 'RELIANCE',
    bse: '500325',
    isin: 'INE002A01018',
  },
  vendorCode: {
    etm: { primary: '1', chart: 'RELIANCE' },
  },
};

describe('WatchListService', () => {
  let service: WatchListService;
  let db: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    db = jest.requireMock('../db/app.db').db;

    TestBed.configureTestingModule({});
    service = TestBed.inject(WatchListService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('watchLists$', () => {
    it('should expose a genuine RxJS Observable', () => {
      expect(service.watchLists$ instanceof Observable).toBe(true);
    });

    it('should emit watch lists from db', fakeAsync(async () => {
      const lists: WatchList[] = [
        { id: '1', name: 'My List', isDefault: true },
      ];
      db.watchLists.toArray.mockResolvedValue(lists);
      const result = await firstValueFrom(service.watchLists$);
      expect(result).toEqual(lists);
    }));
  });

  describe('watchListStocksAll$', () => {
    it('should emit all stocks from db', fakeAsync(async () => {
      const allStocks: WatchListStock[] = [
        {
          id: 1,
          watchListId: '1',
          scripCode: {} as any,
          vendorCode: {} as any,
        },
      ];
      db.watchListStocks.toArray.mockResolvedValue(allStocks);
      const result = await firstValueFrom(service.watchListStocksAll$);
      expect(result).toEqual(allStocks);
    }));
  });

  describe('getWatchList$', () => {
    it('should return a genuine RxJS Observable', () => {
      expect(service.getWatchList$('1') instanceof Observable).toBe(true);
    });

    it('should emit a watch list by id', fakeAsync(async () => {
      const list: WatchList = { id: '1', name: 'My List', isDefault: true };
      db.watchLists.get.mockResolvedValue(list);
      const result = await firstValueFrom(service.getWatchList$('1'));
      expect(result).toEqual(list);
      expect(db.watchLists.get).toHaveBeenCalledWith('1');
    }));
  });

  describe('getWatchListStocks$', () => {
    it('should emit stocks for a watch list', fakeAsync(async () => {
      const stocks: WatchListStock[] = [
        {
          watchListId: '1',
          scripCode: mockStock.scripCode as any,
          vendorCode: mockStock.vendorCode as any,
        },
      ];
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ toArray: jest.fn().mockResolvedValue(stocks) }),
      });
      const result = await firstValueFrom(service.getWatchListStocks$('1'));
      expect(result).toEqual(stocks);
    }));
  });

  describe('ensureDefaultWatchList', () => {
    it('should return existing default list id', async () => {
      db.watchLists.toArray.mockResolvedValue([
        { id: 'default-1', name: 'Default', isDefault: true },
      ]);
      const id = await service.ensureDefaultWatchList();
      expect(id).toBe('default-1');
    });

    it('should set first list as default if no default exists but lists exist', async () => {
      db.watchLists.toArray.mockResolvedValue([
        { id: 'first-1', name: 'First', isDefault: false },
      ]);
      const id = await service.ensureDefaultWatchList();
      expect(id).toBe('first-1');
      expect(db.watchLists.update).toHaveBeenCalledWith('first-1', {
        isDefault: true,
      });
    });

    it('should create a new default list if none exist', async () => {
      db.watchLists.toArray.mockResolvedValue([]);
      const id = await service.ensureDefaultWatchList();
      expect(id).toBe(mockUuid);
      expect(db.watchLists.add).toHaveBeenCalledWith({
        id: mockUuid,
        name: 'My Watch List',
        isDefault: true,
        createdAt: expect.any(Number),
      });
    });
  });

  describe('createWatchList', () => {
    it('should create a new watch list', async () => {
      db.watchLists.where.mockReturnValue({
        equalsIgnoreCase: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      const id = await service.createWatchList('My New List');
      expect(id).toBe(mockUuid);
      expect(db.watchLists.add).toHaveBeenCalledWith({
        id: mockUuid,
        name: 'My New List',
        isDefault: false,
        createdAt: expect.any(Number),
      });
    });

    it('should throw if name is empty', async () => {
      await expect(service.createWatchList('  ')).rejects.toThrow(
        'Name is required',
      );
    });

    it('should throw if name already exists', async () => {
      db.watchLists.where.mockReturnValue({
        equalsIgnoreCase: jest.fn().mockReturnValue({
          first: jest
            .fn()
            .mockResolvedValue({ id: 'existing', name: 'My New List' }),
        }),
      });
      await expect(service.createWatchList('My New List')).rejects.toThrow(
        'A watch list with this name already exists',
      );
    });
  });

  describe('renameWatchList', () => {
    it('should rename a watch list', async () => {
      db.watchLists.where.mockReturnValue({
        equalsIgnoreCase: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      await service.renameWatchList('1', 'Renamed');
      expect(db.watchLists.update).toHaveBeenCalledWith('1', {
        name: 'Renamed',
      });
    });

    it('should allow renaming to the same name', async () => {
      db.watchLists.where.mockReturnValue({
        equalsIgnoreCase: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ id: '1', name: 'Original' }),
        }),
      });
      await service.renameWatchList('1', 'Original');
      expect(db.watchLists.update).toHaveBeenCalledWith('1', {
        name: 'Original',
      });
    });

    it('should throw if name is empty', async () => {
      await expect(service.renameWatchList('1', '')).rejects.toThrow(
        'Name is required',
      );
    });

    it('should throw if name conflicts with another list', async () => {
      db.watchLists.where.mockReturnValue({
        equalsIgnoreCase: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ id: 'other', name: 'Taken' }),
        }),
      });
      await expect(service.renameWatchList('1', 'Taken')).rejects.toThrow(
        'A watch list with this name already exists',
      );
    });
  });

  describe('deleteWatchList', () => {
    it('should delete a non-default watch list and its stocks', async () => {
      db.watchLists.get.mockResolvedValue({
        id: '2',
        name: 'To Delete',
        isDefault: false,
      });
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ delete: jest.fn().mockResolvedValue(undefined) }),
      });
      await service.deleteWatchList('2');
      expect(db.watchLists.delete).toHaveBeenCalledWith('2');
    });

    it('should throw if list not found', async () => {
      db.watchLists.get.mockResolvedValue(null);
      await expect(service.deleteWatchList('nonexistent')).rejects.toThrow(
        'Watch list not found',
      );
    });

    it('should throw if list is default', async () => {
      db.watchLists.get.mockResolvedValue({
        id: '1',
        name: 'Default',
        isDefault: true,
      });
      await expect(service.deleteWatchList('1')).rejects.toThrow(
        'Cannot delete the default watch list',
      );
    });
  });

  describe('setDefaultWatchList', () => {
    it('should set a list as default', async () => {
      db.watchLists.get.mockResolvedValue({
        id: '2',
        name: 'New Default',
        isDefault: false,
      });
      db.watchLists.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ modify: jest.fn().mockResolvedValue(undefined) }),
      });
      await service.setDefaultWatchList('2');
      expect(db.watchLists.update).toHaveBeenCalledWith('2', {
        isDefault: true,
      });
    });

    it('should unset existing default when setting new default', async () => {
      db.watchLists.get.mockResolvedValue({
        id: '2',
        name: 'New Default',
        isDefault: false,
      });
      db.watchLists.toArray.mockResolvedValue([
        { id: '1', name: 'Old Default', isDefault: true },
        { id: '2', name: 'New Default', isDefault: false },
      ]);
      db.watchLists.update.mockResolvedValue(undefined);
      await service.setDefaultWatchList('2');
      expect(db.watchLists.update).toHaveBeenCalledWith('1', {
        isDefault: false,
      });
      expect(db.watchLists.update).toHaveBeenCalledWith('2', {
        isDefault: true,
      });
    });

    it('should throw if list not found', async () => {
      db.watchLists.get.mockResolvedValue(null);
      await expect(service.setDefaultWatchList('nonexistent')).rejects.toThrow(
        'Watch list not found',
      );
    });
  });

  describe('addStock', () => {
    it('should add a stock to a watch list', async () => {
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      await service.addStock(
        '1',
        mockStock.scripCode as any,
        mockStock.vendorCode as any,
      );
      expect(db.watchListStocks.add).toHaveBeenCalledWith({
        watchListId: '1',
        scripCode: mockStock.scripCode,
        vendorCode: mockStock.vendorCode,
        addedAt: expect.any(Number),
      });
    });

    it('should throw if stock lacks isin', async () => {
      await expect(
        service.addStock(
          '1',
          { nse: 'RELIANCE' } as any,
          mockStock.vendorCode as any,
        ),
      ).rejects.toThrow('Stock must have an ISIN code');
    });

    it('should throw if stock already exists', async () => {
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue({ id: 1 }) }),
      });
      await expect(
        service.addStock(
          '1',
          mockStock.scripCode as any,
          mockStock.vendorCode as any,
        ),
      ).rejects.toThrow('Stock is already in this watch list');
    });
  });

  describe('addStockToMultipleLists', () => {
    it('should add stock to multiple lists', async () => {
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      await service.addStockToMultipleLists(
        ['1', '2', '3'],
        mockStock.scripCode as any,
        mockStock.vendorCode as any,
      );
      expect(db.watchListStocks.add).toHaveBeenCalledTimes(3);
    });

    it('should skip lists where stock already exists', async () => {
      const addMock = jest.fn().mockResolvedValue(undefined);
      db.watchListStocks.add = addMock;
      db.watchListStocks.where.mockReturnValueOnce({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue({ id: 1 }) }),
      });
      db.watchListStocks.where.mockReturnValueOnce({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      await service.addStockToMultipleLists(
        ['1', '2'],
        mockStock.scripCode as any,
        mockStock.vendorCode as any,
      );
      expect(addMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeStock', () => {
    it('should remove a stock by isin', async () => {
      db.watchListStocks.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ id: 1, watchListId: '1' }),
        }),
      });
      await service.removeStock('1', 'INE002A01018');
      expect(db.watchListStocks.delete).toHaveBeenCalledWith(1);
    });

    it('should do nothing if stock not found', async () => {
      db.watchListStocks.where.mockReturnValue({
        equals: jest
          .fn()
          .mockReturnValue({ first: jest.fn().mockResolvedValue(null) }),
      });
      await service.removeStock('1', 'INVALID');
      expect(db.watchListStocks.delete).not.toHaveBeenCalled();
    });
  });

  describe('moveStock', () => {
    it('should remove from source and add to target', async () => {
      const firstMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 1, watchListId: '1' })
        .mockResolvedValueOnce(null);
      db.watchListStocks.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          first: firstMock,
          toArray: jest.fn().mockResolvedValue([]),
        }),
      });
      await service.moveStock(
        '1',
        '2',
        mockStock.scripCode as any,
        mockStock.vendorCode as any,
      );
      expect(db.watchListStocks.delete).toHaveBeenCalledWith(1);
      expect(db.watchListStocks.add).toHaveBeenCalled();
    });

    it('should use empty string as isin when scripCode.isin is undefined', async () => {
      const firstMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 1, watchListId: '1' })
        .mockResolvedValueOnce(null);
      db.watchListStocks.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          first: firstMock,
          toArray: jest.fn().mockResolvedValue([]),
        }),
      });
      jest.spyOn(service, 'addStock').mockResolvedValue(undefined);
      const scripCodeNoIsin = { nse: 'RELIANCE', bse: '500325' };
      await service.moveStock(
        '1',
        '2',
        scripCodeNoIsin as any,
        mockStock.vendorCode as any,
      );
      expect(db.watchListStocks.where().equals).toHaveBeenCalledWith(['1', '']);
      expect(db.watchListStocks.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getListsWithoutStock', () => {
    it('should return lists not containing the stock', async () => {
      const lists: WatchList[] = [
        { id: '1', name: 'List 1', isDefault: false },
        { id: '2', name: 'List 2', isDefault: true },
        { id: '3', name: 'List 3', isDefault: false },
      ];
      const stocks: WatchListStock[] = [
        {
          id: 1,
          watchListId: '1',
          scripCode: { isin: 'INE002A01018' } as any,
          vendorCode: {} as any,
        },
      ];
      db.watchLists.toArray.mockResolvedValue(lists);
      db.watchListStocks.where.mockReturnValue({
        anyOf: jest.fn().mockReturnValue({
          filter: jest.fn((cb: (s: WatchListStock) => boolean) => ({
            toArray: jest.fn().mockResolvedValue(stocks.filter(cb)),
          })),
        }),
      });
      const result = await service.getListsWithoutStock('INE002A01018');
      expect(result.map((l) => l.id)).toEqual(['2', '3']);
    });

    it('should exclude the specified list id', async () => {
      const lists: WatchList[] = [
        { id: '1', name: 'List 1', isDefault: false },
        { id: '2', name: 'List 2', isDefault: false },
      ];
      db.watchLists.toArray.mockResolvedValue(lists);
      db.watchListStocks.where.mockReturnValue({
        anyOf: jest.fn().mockReturnValue({
          filter: jest.fn((cb: (s: WatchListStock) => boolean) => ({
            toArray: jest.fn().mockResolvedValue(
              [
                {
                  id: 1,
                  watchListId: '1',
                  scripCode: { isin: 'INE002A01018' } as any,
                  vendorCode: {} as any,
                },
              ].filter(cb),
            ),
          })),
        }),
      });
      const result = await service.getListsWithoutStock('INE002A01018', '1');
      expect(result.map((l) => l.id)).toEqual(['2']);
    });

    it('should treat rows without scripCode as not containing the stock', async () => {
      const lists: WatchList[] = [
        { id: '1', name: 'List 1', isDefault: false },
        { id: '2', name: 'List 2', isDefault: false },
      ];
      db.watchLists.toArray.mockResolvedValue(lists);
      db.watchListStocks.where.mockReturnValue({
        anyOf: jest.fn().mockReturnValue({
          filter: jest.fn((cb: (s: WatchListStock) => boolean) => ({
            toArray: jest.fn().mockResolvedValue(
              [
                {
                  id: 1,
                  watchListId: '1',
                  scripCode: undefined,
                  vendorCode: {} as any,
                },
              ].filter(cb),
            ),
          })),
        }),
      });
      const result = await service.getListsWithoutStock('INE002A01018');
      expect(result.map((l) => l.id)).toEqual(['1', '2']);
    });
  });
});
