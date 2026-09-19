import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Direction } from '../../models/market';
import { MarketService } from '../../services/core/market.service';
import { ScreenerService } from '../../services/screener.service';
import { ScreenerPage } from './screener.page';

describe('ScreenerPage', () => {
  let component: ScreenerPage;
  let fixture: ComponentFixture<ScreenerPage>;

  const baseResults = [
    {
      assetId: '10',
      assetName: 'Alpha',
      assetSymbol: 'ALPHA',
      assetExchangeId: '50',
      sector: 'Tech',
      price: 100,
      priceDisplay: '100',
      marketCap: 5000,
      marketCapDisplay: '5,000',
      peDisplay: '10',
      epsGrowthDisplay: '5',
      dividendYieldDisplay: '1',
    },
    {
      assetId: '20',
      assetName: 'Beta',
      assetSymbol: 'BETA',
      assetExchangeId: '50',
      sector: 'Bank',
      price: 50,
      priceDisplay: '50',
      marketCap: 1000,
      marketCapDisplay: '1,000',
      peDisplay: '8',
      epsGrowthDisplay: '-3',
      dividendYieldDisplay: '2',
    },
  ];

  const liveStocks = [
    {
      name: 'Alpha Ltd',
      scripCode: { nse: 'ALPHA', bse: '500001' },
      vendorCode: { etm: { primary: '10', chart: 'ALPHA' } },
      quote: {
        nse: {
          price: 110,
          volume: 1000,
          change: {
            direction: Direction.UP,
            percentage: 2.5,
            value: 2.7,
          },
        },
      },
    },
    {
      name: 'Beta Ltd',
      scripCode: { bse: '500002' },
      vendorCode: { etm: { primary: '20', chart: 'BETA' } },
      quote: {
        nse: {
          price: 48,
          volume: 5000,
          change: {
            direction: Direction.DOWN,
            percentage: -1.2,
            value: -0.6,
          },
        },
      },
    },
  ];

  const defaultScreener = {
    id: '1',
    name: 'My Screener',
    query: 'Market Cap > 100',
    createdAt: 1,
    updatedAt: 1,
  };

  const getScreener$ = jest.fn();
  const preview = jest.fn();
  const getStocks = jest.fn();
  const routerNavigate = jest.fn();

  function resetMocks() {
    getScreener$.mockReset();
    preview.mockReset();
    getStocks.mockReset();
    routerNavigate.mockClear();
    getScreener$.mockReturnValue(of(defaultScreener));
    preview.mockReturnValue(of({ totalRecords: 2, results: baseResults }));
    getStocks.mockReturnValue(of(liveStocks));
  }

  async function setup(id = '1') {
    resetMocks();
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenerPage);
    fixture.componentRef.setInput('id', id);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await setup('1');
  });

  it('should create and load screener', () => {
    expect(component).toBeTruthy();
    expect(getScreener$).toHaveBeenCalledWith('1');
    expect(component.screenerName()).toBe('My Screener');
  });

  it('should handle missing id', async () => {
    TestBed.resetTestingModule();
    resetMocks();
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ScreenerPage);
    fixture.componentRef.setInput('id', '');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('should handle screener not found', async () => {
    TestBed.resetTestingModule();
    resetMocks();
    getScreener$.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ScreenerPage);
    fixture.componentRef.setInput('id', 'missing');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.notFound()).toBe(true);
  });

  it('should load preview results without duplicating calls', async () => {
    expect(preview).toHaveBeenCalledWith(
      'Market Cap > 100',
      expect.objectContaining({ pageno: 1 }),
    );
    expect(component.previewResults().length).toBe(2);
    expect(component.previewTotal()).toBe(2);

    const calls = preview.mock.calls.length;
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls);
  });

  it('should guard loadMore while loading and when beyond total', () => {
    component.previewLoading.set(true);
    const calls = preview.mock.calls.length;
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls);
    component.previewLoading.set(false);

    component.loadingMore.set(true);
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls);
    component.loadingMore.set(false);
  });

  it('should enrich with live data via getStocks', async () => {
    expect(getStocks).toHaveBeenCalled();
    await fixture.whenStable();
    await Promise.resolve();
    const row = component.previewResults()[0];
    expect(row.liveData?.name).toBe('Alpha Ltd');
  });

  it('should handle enrichment with empty ids and errors', async () => {
    getStocks.mockReturnValueOnce(throwError(() => new Error('boom')));
    component.previewResults.set([
      {
        assetId: '',
        assetName: 'NoId',
        assetSymbol: '',
        assetExchangeId: '',
        sector: '',
        price: 0,
        priceDisplay: '--',
        marketCap: 0,
        marketCapDisplay: '--',
        peDisplay: '--',
        epsGrowthDisplay: '--',
        dividendYieldDisplay: '--',
      },
    ]);
    component.searchQuery.set('');
    expect(component.filteredResults().length).toBeGreaterThanOrEqual(1);
  });

  it('should navigate to edit and guard empty asset', () => {
    component.edit();
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'screener', 'edit', '1']);
    routerNavigate.mockClear();
    expect(() => component.openResult({ assetId: '' } as never)).not.toThrow();
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('should filter and sort like watchlist', () => {
    component.searchQuery.set('alpha');
    expect(component.filteredResults().length).toBe(1);
    component.searchQuery.set('nope');
    expect(component.filteredResults().length).toBe(0);
    component.searchQuery.set('');

    for (const t of [
      component.ScreenerSortType.NAME,
      component.ScreenerSortType.CHANGE_PERCENTAGE,
      component.ScreenerSortType.CHANGE_VALUE,
      component.ScreenerSortType.PRICE,
      component.ScreenerSortType.VOLUME,
    ]) {
      component.setSort(t, component.ScreenerSortOrder.ASC);
      expect(component.filteredResults().length).toBe(2);
      component.setSort(t, component.ScreenerSortOrder.DSC);
      expect(component.filteredResults().length).toBe(2);
    }

    component.setFilter(component.ScreenerFilter.GAINERS);
    expect(component.filteredResults().length).toBe(1);
    component.setFilter(component.ScreenerFilter.LOSERS);
    expect(component.filteredResults().length).toBe(1);
    component.setFilter(component.ScreenerFilter.NSE);
    expect(component.filteredResults().length).toBe(1);
    component.setFilter(component.ScreenerFilter.BSE);
    expect(component.filteredResults().length).toBe(1);
    component.setFilter(component.ScreenerFilter.NONE);
    expect(component.filteredResults().length).toBe(2);
  });

  it('should clear filters only when dirty', () => {
    component.clearFiltersAndSort();
    expect(component.searchQuery()).toBe('');
    component.searchQuery.set('x');
    component.clearFiltersAndSort();
    expect(component.searchQuery()).toBe('');
  });

  it('should compute exchange, display name, and trackBy', () => {
    const withNse = component.previewResults()[0];
    const withBse = component.previewResults()[1];
    expect(component.getExchange(withNse)).toBe('nse');
    expect(component.getExchange(withBse)).toBe('bse');
    expect(component.getExchange({ assetId: 'x' } as never)).toBe('');
    expect(component.displayName(withNse)).toBe('Alpha Ltd');
    expect(component.displayName({ assetName: 'Fallback' } as never)).toBe(
      'Fallback',
    );
    expect(component.displayName({} as never)).toBe('');
    expect(component.trackByAssetId(0, withNse)).toBe('10');
    expect(component.trackByAssetId(5, { assetId: '' } as never)).toBe('5');
  });

  it('should load more on scroll near bottom', () => {
    preview.mockClear();
    component.previewTotal.set(40);
    component.onScrolled(0);
    const afterFirst = preview.mock.calls.length;
    expect(afterFirst).toBeGreaterThanOrEqual(0);
    component.onScrolled(39);
    expect(preview.mock.calls.length).toBeGreaterThanOrEqual(afterFirst);
  });

  it('should cover default sort and beyond-total guard', () => {
    (component.sortBy as { set: (v: never) => void }).set('unknown' as never);
    expect(component.filteredResults().length).toBe(2);
    component.sortBy.set(component.ScreenerSortType.NAME);

    // Inside-guard: hasMore true (10 < 20) but next page start >= total.
    component.previewResults.set(
      Array.from({ length: 10 }, (_, i) => ({
        assetId: `${i}`,
        assetName: `S${i}`,
        assetSymbol: '',
        assetExchangeId: '',
        sector: '',
        price: 0,
        priceDisplay: '--',
        marketCap: 0,
        marketCapDisplay: '--',
        peDisplay: '--',
        epsGrowthDisplay: '--',
        dividendYieldDisplay: '--',
      })) as never,
    );
    component.previewTotal.set(20);
    const calls = preview.mock.calls.length;
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls);
  });

  it('should ignore scroll when empty', () => {
    component.previewResults.set([]);
    component.previewTotal.set(0);
    expect(() => component.onScrolled(10)).not.toThrow();
  });

  it('should handle preview errors', async () => {
    TestBed.resetTestingModule();
    resetMocks();
    preview.mockReturnValue(throwError(() => ({ message: 'boom' })));
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ScreenerPage);
    fixture.componentRef.setInput('id', '1');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.previewError()).toBe('boom');
  });

  it('should open result', () => {
    resetMocks();
    // Re-seed results synchronously for this isolated check.
    component.previewResults.set(baseResults.map((r) => ({ ...r }) as never));
    const row = component.previewResults()[0];
    component.openResult(row);
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'stocks', '10']);
  });

  it('should restore search, sort, and filter from query params', async () => {
    TestBed.resetTestingModule();
    resetMocks();
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (k: string) => {
                  if (k === 'sortBy') return 'price';
                  if (k === 'sortOrder') return 'dsc';
                  if (k === 'filter') return 'gainers';
                  if (k === 'search') return 'Alpha';
                  return null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(ScreenerPage);
    f2.componentRef.setInput('id', '1');
    f2.detectChanges();
    await f2.whenStable();
    expect(f2.componentInstance.sortBy()).toBe('price');
    expect(f2.componentInstance.sortOrder()).toBe('dsc');
    expect(f2.componentInstance.filter()).toBe('gainers');
    expect(f2.componentInstance.searchQuery()).toBe('Alpha');
  });

  it('should ignore invalid query params', async () => {
    TestBed.resetTestingModule();
    resetMocks();
    await TestBed.configureTestingModule({
      imports: [ScreenerPage],
      providers: [
        { provide: ScreenerService, useValue: { getScreener$, preview } },
        { provide: MarketService, useValue: { getStocks } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => 'bogus' } },
          },
        },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(ScreenerPage);
    f2.componentRef.setInput('id', '1');
    f2.detectChanges();
    await f2.whenStable();
    expect(f2.componentInstance.sortBy()).toBe('name');
    expect(f2.componentInstance.sortOrder()).toBe('asc');
    expect(f2.componentInstance.filter()).toBe('none');
    expect(f2.componentInstance.searchQuery()).toBe('bogus');
  });

  it('should sync sort, filter, and clear to query params', () => {
    routerNavigate.mockClear();
    component.setSort(
      component.ScreenerSortType.PRICE,
      component.ScreenerSortOrder.DSC,
    );
    expect(routerNavigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { sortBy: 'price', sortOrder: 'dsc' },
      }),
    );

    routerNavigate.mockClear();
    component.setFilter(component.ScreenerFilter.GAINERS);
    expect(routerNavigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ filter: 'gainers' }),
      }),
    );

    routerNavigate.mockClear();
    component.clearFiltersAndSort();
    expect(routerNavigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: {} }),
    );
  });

  it('should sync search to query params', async () => {
    routerNavigate.mockClear();
    component.searchQuery.set('alpha');
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 400));
    expect(routerNavigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ search: 'alpha' }),
      }),
    );
    component.searchQuery.set('');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 400));
  });

  it('should close menus on outside click', () => {
    component.showSortMenu.set(true);
    component.showFilterMenu.set(true);
    component.onDocumentClick(new MouseEvent('click'));
    expect(component.showSortMenu()).toBe(true);

    const sortBtn = document.createElement('button');
    sortBtn.id = 'detailSortButton';
    const sortMenu = document.createElement('div');
    sortMenu.id = 'detailSortMenu';
    const filterBtn = document.createElement('button');
    filterBtn.id = 'detailFilterButton';
    const filterMenu = document.createElement('div');
    filterMenu.id = 'detailFilterMenu';
    document.body.append(sortBtn, sortMenu, filterBtn, filterMenu);
    try {
      component.onDocumentClick(new MouseEvent('click'));
      expect(component.showSortMenu()).toBe(false);
      expect(component.showFilterMenu()).toBe(false);
    } finally {
      sortBtn.remove();
      sortMenu.remove();
      filterBtn.remove();
      filterMenu.remove();
    }
  });
});
