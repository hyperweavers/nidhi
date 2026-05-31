jest.mock(
  'dexie',
  () => {
    const mockTable = {
      toArray: jest.fn(),
      bulkPut: jest.fn(),
    };
    class MockDexie {
      version = jest.fn().mockReturnThis();
      stores = jest.fn().mockReturnThis();
      on = jest.fn();
      stocks = mockTable;
    }
    return { __esModule: true, default: MockDexie, Table: class {} };
  },
);

jest.mock('flowbite');

describe('AppDB', () => {
  let readyHandler: () => Promise<void>;
  let db: { stocks: { toArray: jest.Mock; bulkPut: jest.Mock } };
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    const mod = await import('./app.db');
    db = mod.db as never;
    const readyCall = (db as unknown as { on: jest.Mock }).on.mock.calls.find(
      ([event]: [string]) => event === 'ready',
    );
    readyHandler = readyCall[1];
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    db.stocks.toArray.mockReset();
    db.stocks.bulkPut.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should create and export db instance', () => {
    expect(db).toBeDefined();
  });

  it('should resolve when ready handler runs with empty stocks', async () => {
    db.stocks.toArray.mockResolvedValue([]);
    await expect(readyHandler()).resolves.toBeUndefined();
    expect(db.stocks.bulkPut).not.toHaveBeenCalled();
  });

  it('should update stocks with nseScripCode ending in EQ', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: 'RELIANCEEQ',
            bseScripCode: '500325',
            isinCode: 'INE002A01018',
            companyId: '1001',
            nse: { symbol: 'RELIANCE' },
            bse: { symbol: 'RELIANCE-BSE' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: [{ id: '2001', isinid: 'INE002A01018' }],
          }),
      });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.scripCode.isin).toBe('INE002A01018');
    expect(s.scripCode.nse).toBe('RELIANCE');
    expect(s.scripCode.bse).toBe('500325');
  });

  it('should handle nseScripCode without EQ suffix', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: 'TCS',
            bseScripCode: '500570',
            isinCode: 'INE467A01021',
            companyId: '2002',
            bse: { symbol: 'TCS-BSE' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: [] }),
      });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.scripCode.nse).toBe('TCS');
    expect(s.scripCode.bse).toBe('500570');
    expect(s.vendorCode.etm.chart).toBe('TCS-BSE');
  });

  it('should handle empty nseScripCode falling back to bseScripCode', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: '',
            bseScripCode: '500570',
            isinCode: 'INE467A01021',
            companyId: '2002',
          }),
      })
      .mockResolvedValueOnce({ ok: false });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.scripCode.isin).toBe('INE467A01021');
    expect(s.scripCode.nse).toBe('');
    expect(s.scripCode.bse).toBe('500570');
  });

  it('should handle null nseScripCode and null bseScripCode', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: null,
            bseScripCode: null,
            isinCode: 'INE002A01018',
            companyId: '1001',
          }),
      })
      .mockResolvedValueOnce({ ok: false });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.scripCode.isin).toBe('INE002A01018');
  });

  it('should handle secondary fetch with matching result by nse id', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: 'HDFCBANK',
            bseScripCode: '500180',
            isinCode: 'INE040A01034',
            companyId: '3003',
            nse: { symbol: 'HDFCBANK' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            result: [{ id: '3003mc', bseid: '500180' }],
          }),
      });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.vendorCode.mc.primary).toBe('3003mc');
  });

  it('should handle secondary fetch with empty result', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nseScripCode: 'INFY',
            isinCode: 'INE009A01021',
            companyId: '4004',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: [] }),
      });

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.vendorCode.mc.primary).toBe('');
  });

  it('should handle stock with all data missing', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: undefined, vendorCode: { etm: { primary: 'XYZ' } } },
    ]);

    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));

    await readyHandler();

    expect(db.stocks.bulkPut).toHaveBeenCalled();
    const s = db.stocks.bulkPut.mock.calls[0][0][0];
    expect(s.scripCode).toBeUndefined();
  });

  it('should not call bulkPut when all stocks already have ISIN', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: { isin: 'INE002A01018' }, vendorCode: { etm: { primary: 'ABC' } } },
    ]);
    await readyHandler();
    expect(db.stocks.bulkPut).not.toHaveBeenCalled();
  });

  it('should handle fetch failure gracefully', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
    await readyHandler();
    expect(db.stocks.bulkPut).toHaveBeenCalled();
  });

  it('should handle non-ok response from primary fetch', async () => {
    db.stocks.toArray.mockResolvedValue([
      { id: '1', scripCode: {}, vendorCode: { etm: { primary: 'ABC' } } },
    ]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await readyHandler();
    expect(db.stocks.bulkPut).toHaveBeenCalled();
  });
});
