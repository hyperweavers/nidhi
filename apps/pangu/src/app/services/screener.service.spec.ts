import { TestBed, fakeAsync } from '@angular/core/testing';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';

import {
  extractPropertyNames,
  mapPreviewResponse,
} from '../adapters/market.adapter';
import { MarketService } from './core/market.service';
import { ScreenerService } from './screener.service';

function createMockTable() {
  return {
    get: jest.fn(),
    toArray: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    where: jest.fn(),
    equalsIgnoreCase: jest.fn(),
    first: jest.fn(),
  };
}

jest.mock('dexie', () => ({
  liveQuery: jest.fn((fn: () => unknown) => {
    const dexieObservable = {
      subscribe(observer: {
        next?: (v: unknown) => void;
        error?: (e: unknown) => void;
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
    (dexieObservable as unknown as Record<string, unknown>)[
      (Symbol as unknown as { observable?: symbol }).observable ??
        '@@observable'
    ] = () => dexieObservable;
    return dexieObservable;
  }),
}));

jest.mock('../db/app.db', () => {
  const screeners = createMockTable();
  screeners.where.mockReturnThis();
  screeners.equalsIgnoreCase.mockReturnThis();
  return {
    db: {
      screeners,
    },
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('ScreenerService', () => {
  let service: ScreenerService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  const getScreenerFieldMapping = jest.fn();
  const getScreenerPreview = jest.fn();
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    captureException: jest.fn(),
  };

  const fieldMappingResponse = {
    datainfo: {
      screenerCategoryLevelZero: {
        screenerCategoryLevelOne: [
          {
            screenerCategoryLevelTwo: [
              {
                screenerCategoryFields: [
                  { displayName: 'Market Cap' },
                  { displayName: 'Beta' },
                  { displayName: 'Beta' },
                  { displayName: '  ' },
                ],
              },
            ],
          },
        ],
      },
    },
  };

  const previewResponse = {
    totalRecords: 1,
    dataList: [
      {
        assetName: 'Reliance Industries Ltd.',
        assetId: '13215',
        assetSymbol: 'RELIANCEEQ',
        assetExchangeId: '50',
        data: [
          { keyId: 'sectorName', value: 'Diversified' },
          {
            keyId: 'lastTradedPrice',
            value: '1,256',
            filterFormatValue: '1256.3',
          },
          {
            keyId: 'marketCap',
            value: '16,99,958',
            filterFormatValue: '1699957.51',
          },
          { keyId: 'pe', value: '22.77' },
          { keyId: 'Annual_EPS_Growth', value: '-49.98' },
          { keyId: 'dividendyield', value: '0.44' },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    db = jest.requireMock('../db/app.db').db;
    db.screeners.where.mockReturnThis();
    db.screeners.equalsIgnoreCase.mockReturnThis();
    db.screeners.toArray.mockResolvedValue([]);
    db.screeners.get.mockResolvedValue(undefined);
    db.screeners.first.mockResolvedValue(undefined);
    getScreenerFieldMapping.mockReturnValue(of(fieldMappingResponse));
    getScreenerPreview.mockReturnValue(of(previewResponse));

    TestBed.configureTestingModule({
      providers: [
        ScreenerService,
        {
          provide: MarketService,
          useValue: { getScreenerFieldMapping, getScreenerPreview },
        },
        { provide: LOGGER, useValue: mockLogger },
      ],
    });
    service = TestBed.inject(ScreenerService);
    jest.clearAllMocks();
    db.screeners.where.mockReturnThis();
    db.screeners.equalsIgnoreCase.mockReturnThis();
    getScreenerFieldMapping.mockReturnValue(of(fieldMappingResponse));
    getScreenerPreview.mockReturnValue(of(previewResponse));
  });

  it('should extract sorted unique property names via the market service', () => {
    service.getProperties().subscribe((names) => {
      expect(names).toEqual(['Beta', 'Market Cap']);
    });

    expect(getScreenerFieldMapping).toHaveBeenCalledTimes(1);
  });

  it('should return [] when the field mapping API fails', () => {
    getScreenerFieldMapping.mockReturnValue(
      throwError(() => ({ message: 'boom' })),
    );
    service.getProperties().subscribe((names) => {
      expect(names).toEqual([]);
    });

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should cache properties across subscriptions', () => {
    getScreenerFieldMapping.mockReturnValue(
      of({
        datainfo: {
          screenerCategoryLevelZero: {
            screenerCategoryLevelOne: [
              {
                screenerCategoryLevelTwo: [
                  { screenerCategoryFields: [{ displayName: 'Beta' }] },
                ],
              },
            ],
          },
        },
      }),
    );
    service.getProperties().subscribe();
    service.getProperties().subscribe((names) => {
      expect(names).toEqual(['Beta']);
    });

    expect(getScreenerFieldMapping).toHaveBeenCalledTimes(1);
  });

  it('should handle empty responses', () => {
    expect(extractPropertyNames(null)).toEqual([]);
    expect(extractPropertyNames({})).toEqual([]);
    expect(extractPropertyNames({ datainfo: {} })).toEqual([]);
    expect(
      extractPropertyNames({
        datainfo: {
          screenerCategoryLevelZero: { screenerCategoryLevelOne: [{}] },
        },
      }),
    ).toEqual([]);
  });

  it('should skip fields without a display name', () => {
    expect(
      extractPropertyNames({
        datainfo: {
          screenerCategoryLevelZero: {
            screenerCategoryLevelOne: [
              {
                screenerCategoryLevelTwo: [
                  { screenerCategoryFields: [{}, { displayName: 'Beta' }] },
                ],
              },
            ],
          },
        },
      }),
    ).toEqual(['Beta']);
  });

  it('should fetch preview and map results via the market service', () => {
    service.preview('Market Cap (Rs Cr) > 50000').subscribe((res) => {
      expect(res.totalRecords).toBe(1);
      expect(res.results[0].assetName).toBe('Reliance Industries Ltd.');
      expect(res.results[0].marketCap).toBe(1699957.51);
      expect(res.results[0].priceDisplay).toBe('1,256');
    });

    expect(getScreenerPreview).toHaveBeenCalledWith(
      'Market Cap (Rs Cr) > 50000',
      20,
      1,
    );
  });

  it('should respect pagesize and pageno options', () => {
    getScreenerPreview.mockReturnValue(of({ totalRecords: 0, dataList: [] }));
    service.preview('q', { pagesize: 50, pageno: 3 }).subscribe();
    expect(getScreenerPreview).toHaveBeenCalledWith('q', 50, 3);
  });

  it('should propagate preview errors', () => {
    const err = { status: 500 };
    getScreenerPreview.mockReturnValue(throwError(() => err));
    service.preview('x').subscribe({
      next: () => fail('expected error'),
      error: (e) => expect(e).toBe(err),
    });

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should map empty preview responses', () => {
    expect(mapPreviewResponse(null)).toEqual([]);
    expect(mapPreviewResponse({})).toEqual([]);
    expect(mapPreviewResponse({ dataList: [] })).toEqual([]);
  });

  it('should map preview items with missing fields', () => {
    const out = mapPreviewResponse({
      totalRecords: 1,
      dataList: [{}, { assetName: 'X', data: [{ value: '1' }, {}] }],
    });
    expect(out).toHaveLength(2);
    expect(out[0].assetId).toBe('');
    expect(out[0].priceDisplay).toBe('--');
    expect(out[1].assetName).toBe('X');
  });

  it('should default missing totals and display values', () => {
    getScreenerPreview.mockReturnValue(of({ dataList: [] }));
    service.preview('q').subscribe((res) => {
      expect(res.totalRecords).toBe(0);
      expect(res.results).toEqual([]);
    });

    const out = mapPreviewResponse({
      dataList: [
        {
          assetName: 'Y',
          data: [
            { keyId: 'lastTradedPrice' },
            { keyId: 'marketCap', value: '1,000' },
          ],
        },
      ],
    });
    expect(out[0].price).toBe(0);
    expect(out[0].priceDisplay).toBe('--');
    expect(out[0].marketCap).toBe(1000);

    expect(
      extractPropertyNames({
        datainfo: {
          screenerCategoryLevelZero: {
            screenerCategoryLevelOne: [{ screenerCategoryLevelTwo: [{}] }],
          },
        },
      }),
    ).toEqual([]);
  });

  describe('screeners$', () => {
    it('should expose a genuine RxJS Observable', () => {
      expect(service.screeners$ instanceof Observable).toBe(true);
    });

    it('should emit screeners from db', fakeAsync(async () => {
      const list = [{ id: '1', name: 'A' }];
      db.screeners.toArray.mockResolvedValue(list);
      const result = await firstValueFrom(service.screeners$);
      expect(result).toEqual(list);
    }));
  });

  describe('getScreener$', () => {
    it('should emit a screener by id', fakeAsync(async () => {
      const s = { id: '1', name: 'A' };
      db.screeners.get.mockResolvedValue(s);
      const result = await firstValueFrom(service.getScreener$('1'));
      expect(result).toEqual(s);
      expect(db.screeners.get).toHaveBeenCalledWith('1');
    }));
  });

  describe('screenerNameExists', () => {
    it('should return false for blank names', async () => {
      await expect(service.screenerNameExists('   ')).resolves.toBe(false);
    });

    it('should return false when none exists', async () => {
      db.screeners.first.mockResolvedValue(undefined);
      await expect(service.screenerNameExists('Alpha')).resolves.toBe(false);
    });

    it('should return false when existing is excluded', async () => {
      db.screeners.first.mockResolvedValue({ id: '1', name: 'Alpha' });
      await expect(service.screenerNameExists('Alpha', '1')).resolves.toBe(
        false,
      );
    });

    it('should return true when a different screener has the name', async () => {
      db.screeners.first.mockResolvedValue({ id: '2', name: 'Alpha' });
      await expect(service.screenerNameExists('Alpha', '1')).resolves.toBe(
        true,
      );
    });
  });

  describe('getScreener', () => {
    it('should return screener by id', async () => {
      const s = { id: '1' };
      db.screeners.get.mockResolvedValue(s);
      await expect(service.getScreener('1')).resolves.toEqual(s);
    });
  });

  describe('createScreener', () => {
    it('should throw for blank name', async () => {
      await expect(service.createScreener('  ', 'q')).rejects.toThrow(
        'Name is required!',
      );
    });

    it('should throw for blank query', async () => {
      await expect(service.createScreener('A', '  ')).rejects.toThrow(
        'Query is required!',
      );
    });

    it('should throw when name already exists', async () => {
      db.screeners.first.mockResolvedValue({ id: 'x' });
      await expect(service.createScreener('A', 'q')).rejects.toThrow(
        'already exists',
      );
    });

    it('should create and return id', async () => {
      db.screeners.first.mockResolvedValue(undefined);
      db.screeners.add.mockResolvedValue('mock-uuid');
      const id = await service.createScreener('Alpha', 'q', { a: 1 } as never);
      expect(id).toBe('mock-uuid');
      expect(db.screeners.add).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alpha', query: 'q' }),
      );
    });
  });

  describe('updateScreener', () => {
    it('should throw when not found', async () => {
      db.screeners.get.mockResolvedValue(undefined);
      await expect(service.updateScreener('1', 'q')).rejects.toThrow(
        'Screener not found!',
      );
    });

    it('should throw for blank query', async () => {
      db.screeners.get.mockResolvedValue({ id: '1' });
      await expect(service.updateScreener('1', '  ')).rejects.toThrow(
        'Query is required!',
      );
    });

    it('should update', async () => {
      db.screeners.get.mockResolvedValue({ id: '1' });
      db.screeners.update.mockResolvedValue(1);
      await expect(service.updateScreener('1', 'q2')).resolves.toBeUndefined();
      expect(db.screeners.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ query: 'q2' }),
      );
    });
  });

  describe('renameScreener', () => {
    it('should throw for blank name', async () => {
      await expect(service.renameScreener('1', '  ')).rejects.toThrow(
        'Name is required!',
      );
    });

    it('should throw when another screener has the name', async () => {
      db.screeners.first.mockResolvedValue({ id: '2' });
      await expect(service.renameScreener('1', 'A')).rejects.toThrow(
        'already exists',
      );
    });

    it('should rename when same id or no conflict', async () => {
      db.screeners.first.mockResolvedValue({ id: '1' });
      db.screeners.update.mockResolvedValue(1);
      await expect(service.renameScreener('1', 'B')).resolves.toBeUndefined();

      db.screeners.first.mockResolvedValue(undefined);
      await expect(service.renameScreener('1', 'C')).resolves.toBeUndefined();
    });
  });

  describe('setFavorite', () => {
    it('should throw when not found', async () => {
      db.screeners.get.mockResolvedValue(undefined);
      await expect(service.setFavorite('1', true)).rejects.toThrow(
        'Screener not found!',
      );
    });

    it('should update the favorite flag', async () => {
      db.screeners.get.mockResolvedValue({ id: '1' });
      db.screeners.update.mockResolvedValue(1);
      await expect(service.setFavorite('1', true)).resolves.toBeUndefined();
      expect(db.screeners.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ isFavorite: true }),
      );
    });
  });

  describe('deleteScreener', () => {
    it('should throw when not found', async () => {
      db.screeners.get.mockResolvedValue(undefined);
      await expect(service.deleteScreener('1')).rejects.toThrow(
        'Screener not found!',
      );
    });

    it('should delete', async () => {
      db.screeners.get.mockResolvedValue({ id: '1' });
      db.screeners.delete.mockResolvedValue(undefined);
      await expect(service.deleteScreener('1')).resolves.toBeUndefined();
      expect(db.screeners.delete).toHaveBeenCalledWith('1');
    });
  });
});
