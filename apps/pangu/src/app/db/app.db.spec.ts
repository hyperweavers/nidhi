import Dexie from 'dexie';
import { Constants } from '../constants';

jest.mock('dexie', () => {
  class StoreMock {
    stores = jest.fn();
  }
  class DexieMock {
    // placeholder
  }
  DexieMock.prototype.version = jest.fn().mockReturnValue(new StoreMock());
  DexieMock.prototype.on = jest.fn();
  return DexieMock;
});

describe('AppDB Init and Upgrade', () => {
  let dbModule: any;
  let dexieOnSpy: jest.Mock;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      dbModule = require('./app.db');
    });

    // We expect Dexie.prototype.on to be called during db instantiation.
    // However, since it's an ES6 class extending a mocked class, we can find the mock via prototype.
    dexieOnSpy = Dexie.prototype.on as jest.Mock;
    // fetch might not exist on global in jsdom env
    global.fetch = jest.fn();
    fetchSpy = global.fetch as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize successfully', () => {
    expect(dbModule.db).toBeDefined();
    expect(Dexie.prototype.version).toHaveBeenCalledWith(1);
    expect(Dexie.prototype.version).toHaveBeenCalledWith(2);
    expect(dexieOnSpy).toHaveBeenCalledWith('ready', expect.any(Function));
  });

  describe('Upgrade DB ready callback logic', () => {
    let readyCallback: Function;

    beforeEach(() => {
      // Extract the callback
      const callArgs = dexieOnSpy.mock.calls.find(
        (call) => call[0] === 'ready',
      );
      readyCallback = callArgs[1];

      // Mock stocks table
      dbModule.db.stocks = {
        toArray: jest.fn(),
        clear: jest.fn(),
        bulkAdd: jest.fn(),
      } as any;
    });

    it('should skip stocks that already have an isin', async () => {
      const mockStockWithIsin = {
        scripCode: { isin: 'INE123' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithIsin]);

      await readyCallback();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        mockStockWithIsin,
      ]);
    });

    it('should continue with original stock if fetch primary fails', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);
      fetchSpy.mockResolvedValue({ ok: false } as Response);

      await readyCallback();

      expect(fetchSpy).toHaveBeenCalledWith(Constants.api.STOCK_QUOTE + '123');
      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        mockStockWithoutIsin,
      ]);
    });

    it('should merge company details when primary fetch succeeds but secondary fetch fails', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);

      const mockCompanyDetails = {
        isinCode: 'INE456',
        nseScripCode: 'RELIANCEEQ',
        bseScripCode: '500325',
        companyId: 'comp-1',
        nse: { symbol: 'RELIANCE' },
        bse: { symbol: '500325' },
      };

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response) // Primary fetch
        .mockResolvedValueOnce({
          ok: false,
        } as unknown as Response); // Secondary fetch

      await readyCallback();

      const expectedUpdatedStock = {
        scripCode: { isin: 'INE456', nse: 'RELIANCE', bse: '500325' },
        vendorCode: {
          etm: { primary: 'comp-1', chart: 'RELIANCE' },
          mc: { primary: '' },
        },
      };

      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        expectedUpdatedStock,
      ]);
    });

    it('should merge secondary fetch results if secondary fetch succeeds', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);

      const mockCompanyDetails = {
        isinCode: 'INE789',
        nseScripCode: 'TCS',
        bseScripCode: '532540',
        companyId: 'comp-2',
        nse: { symbol: 'TCS' }, // if it does not end with EQ, it should remain TCS
        bse: undefined, // bse is missing
      };

      const mockSecondaryResult = {
        result: [
          { isinid: 'INE789', id: 'mc-1' },
          { isinid: 'OTHER', id: 'mc-2' },
        ],
      };

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSecondaryResult),
        } as unknown as Response);

      await readyCallback();

      const expectedUpdatedStock = {
        scripCode: { isin: 'INE789', nse: 'TCS', bse: '532540' },
        vendorCode: {
          etm: { primary: 'comp-2', chart: 'TCS' },
          mc: { primary: 'mc-1' },
        },
      };

      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        expectedUpdatedStock,
      ]);
    });

    it('should fallback chart to empty if neither nse nor bse symbol is available in primary response', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);

      const mockCompanyDetails = {
        // missing nseScripCode
        companyId: 'comp-3',
      };

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({ ok: false } as unknown as Response);

      await readyCallback();

      const expectedUpdatedStock = {
        scripCode: { isin: '', nse: '', bse: '' },
        vendorCode: {
          etm: { primary: 'comp-3', chart: '' },
          mc: { primary: '' },
        },
      };

      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        expectedUpdatedStock,
      ]);
    });

    it('should fallback chart to bse symbol if nse symbol is available but nse object is missing', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);

      const mockCompanyDetails = {
        companyId: 'comp-4',
        nseScripCode: 'SOMETHING',
        bse: { symbol: 'BSEVAL' },
      };

      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({ ok: false } as unknown as Response);

      await readyCallback();

      const expectedUpdatedStock = {
        scripCode: { isin: '', nse: 'SOMETHING', bse: '' },
        vendorCode: {
          etm: { primary: 'comp-4', chart: 'BSEVAL' },
          mc: { primary: '' },
        },
      };

      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalledWith([
        expectedUpdatedStock,
      ]);
    });

    it('should handle empty secondary result array cleanly', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);

      const mockCompanyDetails = { companyId: 'comp-5' };
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ result: [] }),
        } as unknown as Response);

      await readyCallback();

      expect(dbModule.db.stocks.bulkAdd).toHaveBeenCalled();
      const payload = dbModule.db.stocks.bulkAdd.mock.calls[0][0][0];
      expect(payload.vendorCode.mc.primary).toBe('');
    });

    it('should find secondary details by nseid if isin does not match', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);
      const mockCompanyDetails = {
        companyId: 'comp',
        isinCode: 'A',
        nseScripCode: 'NSEEQ',
      };
      const secondaryResult = {
        result: [
          { isinid: 'B', nseid: 'NSE' }, // matches by nseScripCode truncated
        ],
      };
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(secondaryResult),
        } as unknown as Response);

      await readyCallback();
      const payload = dbModule.db.stocks.bulkAdd.mock.calls[0][0][0];
      expect(payload.vendorCode.mc.primary).toBe(''); // id is missing from our mock above so it is empty string
    });

    it('should find secondary details by bseid if isin and nse do not match', async () => {
      const mockStockWithoutIsin = {
        scripCode: { isin: '' },
        vendorCode: { etm: '123' },
      };
      dbModule.db.stocks.toArray.mockResolvedValue([mockStockWithoutIsin]);
      const mockCompanyDetails = {
        companyId: 'comp',
        isinCode: 'A',
        bseScripCode: '12345',
      };
      const secondaryResult = {
        result: [{ isinid: 'B', nseid: 'C', bseid: '12345', id: 'target_id' }],
      };
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockCompanyDetails),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(secondaryResult),
        } as unknown as Response);

      await readyCallback();
      const payload = dbModule.db.stocks.bulkAdd.mock.calls[0][0][0];
      expect(payload.vendorCode.mc.primary).toBe('target_id');
    });
  });
});
