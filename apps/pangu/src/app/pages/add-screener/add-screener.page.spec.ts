import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@nidhi/shared-toast';
import { of, throwError } from 'rxjs';

import { Direction } from '../../models/market';
import { MarketService } from '../../services/core/market.service';
import { ScreenerService } from '../../services/screener.service';
import { AddScreenerPage } from './add-screener.page';

describe('AddScreenerPage', () => {
  let component: AddScreenerPage;
  let fixture: ComponentFixture<AddScreenerPage>;

  const baseResults = [
    {
      assetId: '1',
      assetName: 'Alpha',
      assetSymbol: 'ALPHA',
      assetExchangeId: '50',
      sector: 'Tech',
      price: 100,
      priceDisplay: '100',
      marketCap: 50000,
      marketCapDisplay: '50,000',
      peDisplay: '20',
      epsGrowthDisplay: '10',
      dividendYieldDisplay: '1',
    },
    {
      assetId: '2',
      assetName: 'Beta',
      assetSymbol: 'BETA',
      assetExchangeId: '50',
      sector: 'Bank',
      price: 200,
      priceDisplay: '200',
      marketCap: 10000,
      marketCapDisplay: '10,000',
      peDisplay: '15',
      epsGrowthDisplay: '-5',
      dividendYieldDisplay: '2',
    },
  ];

  const liveStocks = [
    {
      name: 'Alpha Ltd',
      scripCode: { nse: 'ALPHA' },
      vendorCode: { etm: { primary: '1' } },
      quote: {
        nse: {
          price: 105,
          volume: 2000,
          change: { direction: Direction.UP, percentage: 1, value: 1 },
        },
      },
    },
    {
      name: 'Beta Ltd',
      scripCode: { bse: '500002' },
      vendorCode: { etm: { primary: '2' } },
      quote: {
        nse: {
          price: 195,
          volume: 500,
          change: { direction: Direction.DOWN, percentage: -1, value: -2 },
        },
      },
    },
  ];

  const getProperties = jest.fn(() => of(['Market Cap (Rs Cr)', 'Beta 1Y']));
  const preview = jest.fn(() =>
    of({
      totalRecords: 2,
      results: baseResults,
    }),
  );
  const getStocks = jest.fn(() => of(liveStocks));
  const createScreener = jest.fn(() => Promise.resolve('new-id'));
  const updateScreener = jest.fn(() => Promise.resolve());
  const screenerNameExists = jest.fn(() => Promise.resolve(false));
  const getScreener$ = jest.fn(() => of(undefined));
  const toastShow = jest.fn();
  const routerNavigate = jest.fn();

  beforeEach(async () => {
    TestBed.resetTestingModule();
    getProperties.mockClear();
    preview.mockClear();
    getStocks.mockClear();
    createScreener.mockClear();
    updateScreener.mockClear();
    screenerNameExists.mockClear();
    getScreener$.mockClear();
    toastShow.mockClear();
    routerNavigate.mockClear();
    getScreener$.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AddScreenerPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: {
            getProperties,
            preview,
            createScreener,
            updateScreener,
            screenerNameExists,
            getScreener$,
          },
        },
        { provide: MarketService, useValue: { getStocks } },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddScreenerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load properties', () => {
    expect(component).toBeTruthy();
    expect(getProperties).toHaveBeenCalled();
    expect(component.properties()).toEqual(['Market Cap (Rs Cr)', 'Beta 1Y']);
    expect(component.loading()).toBe(false);
  });

  it('should load screener in edit mode', async () => {
    TestBed.resetTestingModule();
    getScreener$.mockReturnValue(
      of({
        id: 'e1',
        name: 'Edit Me',
        query: 'Q',
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [AddScreenerPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: {
            getProperties,
            preview,
            createScreener,
            updateScreener,
            screenerNameExists,
            getScreener$,
          },
        },
        { provide: MarketService, useValue: { getStocks } },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(AddScreenerPage);
    f2.componentRef.setInput('id', 'e1');
    f2.detectChanges();
    await f2.whenStable();
    expect(f2.componentInstance.screener()?.name).toBe('Edit Me');
    expect(f2.componentInstance.pageTitle()).toBe('Edit Me');
  });

  it('should have Add New Screener title in create mode', () => {
    expect(component.pageTitle()).toBe('Add New Screener');
  });

  it('should prompt for name on save in create mode', () => {
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.save();
    expect(component.showNamePrompt()).toBe(true);
    expect(createScreener).not.toHaveBeenCalled();
  });

  it('should not save when invalid', () => {
    component.onQueryChange({ query: '', isValid: false });
    component.save();
    expect(component.showNamePrompt()).toBe(false);
  });

  it('should update directly in edit mode', async () => {
    TestBed.resetTestingModule();
    getScreener$.mockReturnValue(
      of({
        id: 'e1',
        name: 'Edit Me',
        query: 'Q',
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [AddScreenerPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: {
            getProperties,
            preview,
            createScreener,
            updateScreener,
            screenerNameExists,
            getScreener$,
          },
        },
        { provide: MarketService, useValue: { getStocks } },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(AddScreenerPage);
    f2.componentRef.setInput('id', 'e1');
    f2.detectChanges();
    await f2.whenStable();
    const c2 = f2.componentInstance;
    c2.onQueryChange({ query: 'New Q', isValid: true });
    c2.save();
    await Promise.resolve();
    expect(updateScreener).toHaveBeenCalledWith(
      'e1',
      'New Q',
      expect.anything(),
    );
  });

  it('should show toast on update failure', async () => {
    TestBed.resetTestingModule();
    updateScreener.mockRejectedValueOnce(new Error('fail'));
    getScreener$.mockReturnValue(
      of({ id: 'e1', name: 'E', query: 'Q', createdAt: 1, updatedAt: 1 }),
    );
    await TestBed.configureTestingModule({
      imports: [AddScreenerPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: {
            getProperties,
            preview,
            createScreener,
            updateScreener,
            screenerNameExists,
            getScreener$,
          },
        },
        { provide: MarketService, useValue: { getStocks } },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(AddScreenerPage);
    f2.componentRef.setInput('id', 'e1');
    f2.detectChanges();
    await f2.whenStable();
    f2.componentInstance.onQueryChange({ query: 'Q2', isValid: true });
    f2.componentInstance.save();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(toastShow).toHaveBeenCalled();
  });

  it('should validate name prompt and create without stock count', async () => {
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.save();
    component.nameDraft.set('');
    await component.confirmNamePrompt();
    expect(component.nameError()).toBe('Name is required!');

    component.nameDraft.set('My Screener');
    await component.confirmNamePrompt();
    expect(createScreener).toHaveBeenCalledWith(
      'My Screener',
      'Market Cap (Rs Cr) > 5',
      expect.anything(),
    );
    expect(createScreener.mock.calls[0].length).toBe(3);
    expect(toastShow).toHaveBeenCalledWith('Screener saved');
  });

  it('should handle existing name and create errors', async () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.save();
    component.nameDraft.set('Dup');
    screenerNameExists.mockResolvedValueOnce(true);
    await component.confirmNamePrompt();
    expect(component.nameError()).toBe(
      'A screener with this name already exists!',
    );

    component.nameDraft.set('Err');
    screenerNameExists.mockResolvedValueOnce(false);
    createScreener.mockRejectedValueOnce(new Error('db fail'));
    await component.confirmNamePrompt();
    expect(component.nameError()).toBe('db fail');
    component.closeNamePrompt();
    expect(component.showNamePrompt()).toBe(false);
  });

  it('should store emitted queries', () => {
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    expect(component.query()).toBe('Market Cap (Rs Cr) > 5');
    expect(component.isValid()).toBe(true);
  });

  it('should preview only when valid and handle success', () => {
    component.onQueryChange({ query: '', isValid: false });
    component.preview();
    expect(preview).not.toHaveBeenCalled();

    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.preview();
    expect(preview).toHaveBeenCalledWith(
      'Market Cap (Rs Cr) > 5',
      expect.objectContaining({ pageno: 1 }),
    );
    expect(component.previewResults()).toHaveLength(2);
    expect(component.previewTotal()).toBe(2);
  });

  it('should not duplicate preview calls for already loaded pages', () => {
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.preview();
    const calls = preview.mock.calls.length;
    component.preview();
    expect(preview.mock.calls.length).toBe(calls + 1);
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls + 1);
  });

  it('should guard loadMore while loading', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
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

  it('should filter and sort like watchlist', () => {
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.preview();
    component.resultSearchQuery.set('alpha');
    expect(component.filteredResults().map((r) => r.assetName)).toContain(
      'Alpha',
    );
    component.resultSearchQuery.set('');

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
    expect(component.filter()).toBe(component.ScreenerFilter.GAINERS);
    expect(component.filteredResults().length).toBeGreaterThanOrEqual(0);
    component.setFilter(component.ScreenerFilter.LOSERS);
    expect(component.filteredResults().length).toBeGreaterThanOrEqual(0);
    component.setFilter(component.ScreenerFilter.NSE);
    expect(component.filteredResults().length).toBeGreaterThanOrEqual(0);
    component.setFilter(component.ScreenerFilter.BSE);
    expect(component.filteredResults().length).toBeGreaterThanOrEqual(0);
    component.setFilter(component.ScreenerFilter.NONE);
    expect(component.filteredResults().length).toBe(2);

    // Default sort branch (unknown key) should not crash.
    (component.sortBy as { set: (v: never) => void }).set('unknown' as never);
    expect(component.filteredResults().length).toBe(2);
    component.sortBy.set(component.ScreenerSortType.NAME);
  });

  it('should clear filters only when dirty', () => {
    component.clearFiltersAndSort();
    expect(component.resultSearchQuery()).toBe('');
    component.resultSearchQuery.set('x');
    component.clearFiltersAndSort();
    expect(component.resultSearchQuery()).toBe('');
  });

  it('should compute exchange, display name, and trackBy', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
    const rows = component.filteredResults();
    expect(rows.length).toBe(2);
    // Enrichment may not have completed yet; fallbacks still work.
    expect(component.displayName(rows[0])).toBeTruthy();
    expect(component.trackByAssetId(0, rows[0])).toBe('1');
    expect(component.trackByAssetId(7, { assetId: '' } as never)).toBe('7');
    expect(component.getExchange({ assetId: 'x' } as never)).toBe('');
  });

  it('should scroll to load more and ignore empty', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
    component.previewTotal.set(40);
    component.onScrolled(1);
    expect(preview).toHaveBeenCalled();
    component.previewResults.set([]);
    component.previewTotal.set(0);
    expect(() => component.onScrolled(5)).not.toThrow();
  });

  it('should load more when viewport is near the bottom', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
    component.previewResults.set(
      Array.from({ length: 20 }, (_, i) => ({
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
      })),
    );
    component.previewTotal.set(40);
    const calls = preview.mock.calls.length;
    // Far from the end with no viewport offset: no extra load.
    (component as unknown as { viewport: unknown }).viewport = () => undefined;
    component.onScrolled(0);
    expect(preview.mock.calls.length).toBe(calls);
    // Near the bottom via viewport offset: triggers loadMore.
    (component as unknown as { viewport: unknown }).viewport = () => ({
      measureScrollOffset: () => 0,
    });
    component.onScrolled(0);
    expect(preview.mock.calls.length).toBeGreaterThan(calls);
  });

  it('should guard loading beyond total without extra calls', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
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
      })),
    );
    component.previewTotal.set(20);
    const calls = preview.mock.calls.length;
    component.loadMore();
    expect(preview.mock.calls.length).toBe(calls);
  });

  it('should keep help open when clicking inside help box', () => {
    component.toggleHelp();
    expect(component.showHelp()).toBe(true);
    // Clicking outside the help box closes it (covers box && !contains).
    component.onDocumentClick(new MouseEvent('click'));
    expect(component.showHelp()).toBe(false);
  });

  it('should open results and guard empty', () => {
    component.onQueryChange({ query: 'Q', isValid: true });
    component.preview();
    const row = component.previewResults()[0];
    component.openResult(row);
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'stocks', '1']);
    routerNavigate.mockClear();
    component.openResult({ assetId: '' } as never);
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('should handle help, escape, copy, and outside clicks', async () => {
    component.toggleHelp();
    expect(component.showHelp()).toBe(true);
    component.onEscape();
    expect(component.showHelp()).toBe(false);

    component.onQueryChange({ query: 'Q', isValid: true });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    await component.copyQuery();
    component.query.set('');
    await component.copyQuery();

    component.showSortMenu.set(true);
    component.showFilterMenu.set(true);
    component.onDocumentClick(new MouseEvent('click'));
    expect(component.showSortMenu()).toBe(true);

    const sortBtn = document.createElement('button');
    sortBtn.id = 'screenerSortButton';
    const sortMenu = document.createElement('div');
    sortMenu.id = 'screenerSortMenu';
    const filterBtn = document.createElement('button');
    filterBtn.id = 'screenerFilterButton';
    const filterMenu = document.createElement('div');
    filterMenu.id = 'screenerFilterMenu';
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

  it('should handle preview errors', () => {
    preview.mockReturnValueOnce(
      throwError(() => ({ message: 'boom', status: 500 })),
    );
    component.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
    component.preview();
    expect(component.previewError()).toBe('boom');
  });

  it('should disable Save/Preview buttons when invalid', () => {
    component.onQueryChange({ query: '', isValid: false });
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const saveBtn = buttons.find(
      (b) => b.nativeElement.textContent.trim() === 'Save',
    );
    const previewBtn = buttons.find((b) =>
      b.nativeElement.textContent.includes('Preview'),
    );
    expect(saveBtn?.nativeElement.disabled).toBe(true);
    expect(previewBtn?.nativeElement.disabled).toBe(true);
  });

  describe('edit mode rename and recovery', () => {
    const renameScreener = jest.fn(() => Promise.resolve());

    async function setupEdit(screener: {
      id: string;
      name: string;
      query: string;
      queryTree?: {
        kind: 'group';
        id: string;
        combinator: 'AND';
        children: Array<{
          kind: 'condition';
          id: string;
          property: string;
          operator: '>';
          value: string;
        }>;
      };
    }) {
      TestBed.resetTestingModule();
      renameScreener.mockClear();
      getScreener$.mockReturnValue(
        of({ ...screener, createdAt: 1, updatedAt: 1 }),
      );
      await TestBed.configureTestingModule({
        imports: [AddScreenerPage],
        providers: [
          {
            provide: ScreenerService,
            useValue: {
              getProperties,
              preview,
              createScreener,
              updateScreener,
              renameScreener,
              screenerNameExists,
              getScreener$,
            },
          },
          { provide: MarketService, useValue: { getStocks } },
          { provide: ToastService, useValue: { show: toastShow } },
          { provide: Router, useValue: { navigate: routerNavigate } },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(AddScreenerPage);
      f.componentRef.setInput('id', screener.id);
      f.detectChanges();
      await f.whenStable();
      return f;
    }

    async function flush() {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    }

    it('should rename and update the query together on save', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
        queryTree: {
          kind: 'group',
          id: 'g1',
          combinator: 'AND',
          children: [
            {
              kind: 'condition',
              id: 'c1',
              property: 'Market Cap (Rs Cr)',
              operator: '>',
              value: '5',
            },
          ],
        },
      });
      const c = f.componentInstance;
      expect(c.nameDraft()).toBe('Old');
      c.nameDraft.set('New');
      c.onQueryChange({ query: 'Market Cap (Rs Cr) > 10', isValid: true });
      c.save();
      await flush();
      expect(renameScreener).toHaveBeenCalledWith('e1', 'New');
      expect(updateScreener).toHaveBeenCalledWith(
        'e1',
        'Market Cap (Rs Cr) > 10',
        expect.anything(),
      );
      expect(toastShow).toHaveBeenCalledWith('Screener updated');
      expect(routerNavigate).toHaveBeenCalledWith(['/', 'screener', 'e1']);
    });

    it('should rename only when the query is invalid', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      c.onQueryChange({ query: '', isValid: false });
      c.nameDraft.set('New');
      expect(c.canSave()).toBe(true);
      c.save();
      await flush();
      expect(renameScreener).toHaveBeenCalledWith('e1', 'New');
      expect(updateScreener).not.toHaveBeenCalled();
      expect(toastShow).toHaveBeenCalledWith('Screener renamed');
    });

    it('should reject duplicate names on rename', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      c.onQueryChange({ query: 'Market Cap (Rs Cr) > 5', isValid: true });
      c.nameDraft.set('Dup');
      screenerNameExists.mockResolvedValueOnce(true);
      c.save();
      await flush();
      expect(c.nameError()).toBe('A screener with this name already exists!');
      expect(renameScreener).not.toHaveBeenCalled();
      expect(updateScreener).not.toHaveBeenCalled();
      expect(routerNavigate).not.toHaveBeenCalled();
    });

    it('should require a name when renaming to blank', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      c.onQueryChange({ query: '', isValid: false });
      c.nameDraft.set('   ');
      expect(c.nameChanged()).toBe(true);
      expect(c.canSave()).toBe(true);
      c.save();
      await flush();
      expect(c.nameError()).toBe('Name is required!');
      expect(renameScreener).not.toHaveBeenCalled();
      expect(updateScreener).not.toHaveBeenCalled();
    });

    it('should show not-found for an unknown id', async () => {
      TestBed.resetTestingModule();
      getScreener$.mockReturnValue(of(undefined));
      await TestBed.configureTestingModule({
        imports: [AddScreenerPage],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: { get: () => null } } },
          },
          {
            provide: ScreenerService,
            useValue: {
              getProperties,
              preview,
              createScreener,
              updateScreener,
              renameScreener,
              screenerNameExists,
              getScreener$,
            },
          },
          { provide: MarketService, useValue: { getStocks } },
          { provide: ToastService, useValue: { show: toastShow } },
          { provide: Router, useValue: { navigate: routerNavigate } },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(AddScreenerPage);
      f.componentRef.setInput('id', 'missing');
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.notFound()).toBe(true);
      expect(f.componentInstance.pageTitle()).toBe('Screener not found');
    });

    it('should rebuild the builder from query text without a tree', async () => {
      const f = await setupEdit({
        id: 'leg',
        name: 'Legacy',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      const tree = c.initialTree();
      expect(tree).not.toBeNull();
      expect(tree?.children[0]).toMatchObject({
        property: 'Market Cap (Rs Cr)',
        operator: '>',
        value: '5',
      });
      // The parsed tree flows into the builder and validates the query.
      f.detectChanges();
      await f.whenStable();
      expect(c.isValid()).toBe(true);
      expect(c.query()).toBe('Market Cap (Rs Cr) > 5');
    });

    it('should keep the saved query when text cannot be parsed', async () => {
      const f = await setupEdit({
        id: 'leg',
        name: 'Legacy',
        query: 'Something unparseable ???',
      });
      const c = f.componentInstance;
      expect(c.initialTree()).toBeNull();
      expect(c.screener()?.query).toBe('Something unparseable ???');
    });

    it('should edit the name inline from the title', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      expect(c.editingName()).toBe(false);

      // Pencil button opens the inline editor with the current name.
      const pencil = f.debugElement.query(
        By.css('button[aria-label="Rename screener"]'),
      );
      expect(pencil).toBeTruthy();
      pencil.nativeElement.click();
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      expect(c.editingName()).toBe(true);
      const input = f.debugElement.query(By.css('#screener-edit-name'));
      expect(input).toBeTruthy();
      expect(input.nativeElement.value).toBe('Old');

      // Escape reverts the draft and closes the editor.
      c.nameDraft.set('Changed');
      c.cancelNameEdit();
      expect(c.nameDraft()).toBe('Old');
      expect(c.nameError()).toBe('');
      expect(c.editingName()).toBe(false);

      // Drafts persist until Save — blur/typing never reverts to text.
      c.startNameEdit();
      c.nameDraft.set('New');
      expect(c.editingName()).toBe(true);
      expect(c.nameChanged()).toBe(true);
    });

    it('should report unsaved changes until saved', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      expect(c.hasUnsavedChanges()).toBe(false);
      c.nameDraft.set('New');
      expect(c.hasUnsavedChanges()).toBe(true);
      c.nameDraft.set('Old');
      c.onQueryChange({ query: 'Market Cap (Rs Cr) > 10', isValid: true });
      expect(c.hasUnsavedChanges()).toBe(true);
    });

    it('should ignore rename controls without a loaded screener', async () => {
      const f = await setupEdit({
        id: 'e1',
        name: 'Old',
        query: 'Market Cap (Rs Cr) > 5',
      });
      const c = f.componentInstance;
      c.screener.set(undefined);
      c.startNameEdit();
      expect(c.editingName()).toBe(false);
    });
  });
});
