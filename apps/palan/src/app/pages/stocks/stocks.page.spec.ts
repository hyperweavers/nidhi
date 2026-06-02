import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import userEvent from '@testing-library/user-event';
import { of, Subject } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';

import { Period } from '../../models/chart';
import { Direction, Status } from '../../models/market';
import { Plan } from '../../models/plan';
import { ColorScheme } from '../../models/settings';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { PlanService } from '../../services/core/plan.service';
import { SettingsService } from '../../services/core/settings.service';
import { StocksPage } from './stocks.page';

let mockTimeScale: Record<string, jest.Mock>;
let mockAreaSeries: Record<string, jest.Mock>;
let mockChart: Record<string, jest.Mock>;

jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(),
  AreaSeries: 'AreaSeries',
  LineType: { Curved: 'Curved' },
}));

import { createChart } from 'lightweight-charts';

describe('StocksPage', () => {
  let component: StocksPage;
  let fixture: ComponentFixture<StocksPage>;
  let marketStatus$: Subject<{ status: Status; lastUpdated: number }>;
  let resize$: Subject<null>;
  let settings$: Subject<{
    colorScheme: ColorScheme;
    refreshInterval: number;
    theme: string;
  }>;
  let mockMarketService: jest.Mocked<
    Pick<
      MarketService,
      'marketStatus$' | 'getStock' | 'getIntraDayChart' | 'getHistoricalChart'
    >
  >;
  let mockSettingsService: any;
  let plan$: Subject<Plan | undefined>;
  let mockLogger: jest.Mocked<typeof LOGGER>;

  const mockStock: Stock = {
    name: 'Test Corp',
    scripCode: { isin: 'US123456', ticker: 'TST', country: 'US' },
    vendorCode: { mc: { primary: 'TEST:US' } },
    details: { sector: 'Technology' },
    quote: {
      price: 150.5,
      change: { direction: Direction.UP, value: 2.5, percentage: 1.68 },
      open: 148.0,
      close: 148.0,
      low: 147.5,
      high: 151.0,
      fiftyTwoWeekLow: 100.0,
      fiftyTwoWeekHigh: 200.0,
    },
    metrics: { marketCap: 500, dividendYield: 1.5 },
    performance: {
      weekly: { direction: Direction.UP, percentage: 2.0, value: 3.0 },
      monthly: { direction: Direction.UP, percentage: 5.0, value: 7.5 },
      quarterly: { direction: Direction.DOWN, percentage: -1.0, value: -1.5 },
      halfYearly: { direction: Direction.UP, percentage: 10.0, value: 15.0 },
      yearly: {
        one: { direction: Direction.UP, percentage: 20.0, value: 30.0 },
        three: { direction: Direction.UP, percentage: 50.0, value: 75.0 },
        five: { direction: Direction.DOWN, percentage: -5.0, value: -7.5 },
      },
    },
  };

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksPage],
      providers: [
        { provide: MarketService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        {
          provide: PlanService,
          useValue: { plan$: new Subject<Plan | undefined>().asObservable() },
        },
        { provide: LOGGER, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeScale = {
      fitContent: jest.fn(),
      setVisibleRange: jest.fn(),
      setVisibleLogicalRange: jest.fn(),
    };
    mockAreaSeries = {
      setData: jest.fn(),
      applyOptions: jest.fn(),
      data: jest.fn().mockReturnValue([]),
    };
    mockChart = {
      addSeries: jest.fn().mockReturnValue(mockAreaSeries),
      applyOptions: jest.fn(),
      timeScale: jest.fn().mockReturnValue(mockTimeScale),
      resize: jest.fn(),
      subscribeCrosshairMove: jest.fn(),
      unsubscribeCrosshairMove: jest.fn(),
      clearCrosshairPosition: jest.fn(),
    };
    (createChart as jest.Mock).mockReturnValue(mockChart);
    marketStatus$ = new Subject();
    resize$ = new Subject<null>();
    settings$ = new Subject<{
      colorScheme: ColorScheme;
      refreshInterval: number;
      theme: string;
    }>();
    plan$ = new Subject<Plan | undefined>();

    mockMarketService = {
      marketStatus$: marketStatus$.asObservable(),
      getStock: jest.fn().mockReturnValue(of(mockStock)),
      getIntraDayChart: jest.fn().mockReturnValue(of([])),
      getHistoricalChart: jest.fn().mockReturnValue(of([])),
    } as any;

    mockSettingsService = {
      settings$: settings$.asObservable(),
      resize$: resize$.asObservable(),
    };

    mockLogger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    TestBed.overrideProvider(MarketService, { useValue: mockMarketService });
    TestBed.overrideProvider(SettingsService, {
      useValue: mockSettingsService,
    });
    TestBed.overrideProvider(PlanService, {
      useValue: { plan$: plan$.asObservable() },
    });
    TestBed.overrideProvider(LOGGER, { useValue: mockLogger });
  });

  function createComponent(id = ''): void {
    fixture = TestBed.createComponent(StocksPage);
    component = fixture.componentInstance;

    if (id) {
      fixture.componentRef.setInput('id', id);
    }

    fixture.detectChanges();
  }

  describe('initial state', () => {
    it('should create with default values', () => {
      createComponent();
      expect(component).toBeTruthy();
      expect(component.isChartLoading).toBe(true);
      expect(component.isChartNoData).toBe(false);
      expect(component.isChartInFullscreen).toBe(false);
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
    });

    it('should show loading spinner while stock$ is loading', () => {
      createComponent('TEST:US');
      expect(
        fixture.debugElement.query(By.css('[role="status"]')),
      ).toBeTruthy();
    });
  });

  describe('when stock ID is provided', () => {
    beforeEach(() => {
      createComponent('TEST:US');
    });

    it('should call getStock with the provided id', () => {
      expect(mockMarketService.getStock).toHaveBeenCalledWith('TEST:US');
    });
  });

  describe('chart initialization', () => {
    it('should initialize chart when intraday data arrives', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );
      createComponent('TEST:US');
      tick(200);

      expect(mockChart.subscribeCrosshairMove).toHaveBeenCalled();
      expect(component.isChartNoData).toBe(false);
      expect(component.isChartLoading).toBe(false);
    }));

    it('should show no data message when chart returns empty', fakeAsync(() => {
      createComponent('TEST:US');
      tick(200);

      expect(component.isChartNoData).toBe(true);
    }));
  });

  describe('resize and colorScheme subscriptions', () => {
    it('should resize chart when resize$ emits after chart init', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );
      createComponent('TEST:US');
      tick(200);

      settings$.next({
        colorScheme: ColorScheme.DARK,
        refreshInterval: 30000,
        theme: 'dark' as const,
      });
      tick();

      (component as any).chart = mockChart;
      (component as any).chartRef = () => ({
        nativeElement: { offsetWidth: 500, offsetHeight: 400 },
      });

      resize$.next(null);
      tick();

      expect(mockChart.resize).toHaveBeenCalledWith(500, 400);
    }));

    it('should apply color scheme on settings change after chart init', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );
      createComponent('TEST:US');
      tick(200);

      settings$.next({
        colorScheme: ColorScheme.LIGHT,
        refreshInterval: 30000,
        theme: 'light' as const,
      });
      tick();

      expect((component as any).colorScheme).toBe(ColorScheme.LIGHT);
      expect(mockChart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: expect.objectContaining({ textColor: '#111827' }),
        }),
      );
    }));

    it('should not error on resize when chart is null', fakeAsync(() => {
      createComponent('TEST:US');

      resize$.next(null);
      tick();

      expect(mockChart.resize).not.toHaveBeenCalled();
    }));
  });

  describe('setChartTimeRange', () => {
    beforeEach(() => {
      createComponent('TEST:US');
    });

    it('should set range to ONE_DAY', () => {
      component.setChartTimeRange(Period.ONE_DAY);
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
    });

    it('should set range to ONE_WEEK', () => {
      component.setChartTimeRange(Period.ONE_WEEK);
      expect(component.activeChartTimeRange).toBe(Period.ONE_WEEK);
    });

    it('should set range to ONE_MONTH', () => {
      component.setChartTimeRange(Period.ONE_MONTH);
      expect(component.activeChartTimeRange).toBe(Period.ONE_MONTH);
    });

    it('should set range to THREE_MONTHS', () => {
      component.setChartTimeRange(Period.THREE_MONTHS);
      expect(component.activeChartTimeRange).toBe(Period.THREE_MONTHS);
    });

    it('should set range to SIX_MONTHS', () => {
      component.setChartTimeRange(Period.SIX_MONTHS);
      expect(component.activeChartTimeRange).toBe(Period.SIX_MONTHS);
    });

    it('should set range to ONE_YEAR', () => {
      component.setChartTimeRange(Period.ONE_YEAR);
      expect(component.activeChartTimeRange).toBe(Period.ONE_YEAR);
    });

    it('should set range to FIVE_YEAR', () => {
      component.setChartTimeRange(Period.FIVE_YEAR);
      expect(component.activeChartTimeRange).toBe(Period.FIVE_YEAR);
    });

    it('should log warning for invalid range', () => {
      component.setChartTimeRange('INVALID' as Period);
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid range: INVALID');
    });

    it('should update chart options for non-1D range with chart initialized', () => {
      (component as any).chart = mockChart;
      (component as any).areaSeries = mockAreaSeries;
      mockAreaSeries.data.mockReturnValue([{ value: 1 } as any]);

      component.setChartTimeRange(Period.ONE_WEEK);

      expect(mockChart.applyOptions).toHaveBeenCalledWith({
        timeScale: { timeVisible: false },
      });
      expect(mockTimeScale.setVisibleRange).toHaveBeenCalled();
    });

    it('should set visible logical range for ONE_DAY', () => {
      (component as any).chart = mockChart;
      (component as any).areaSeries = mockAreaSeries;

      component.setChartTimeRange(Period.ONE_DAY);

      expect(mockChart.applyOptions).toHaveBeenCalledWith({
        timeScale: { timeVisible: true },
      });
      expect(mockTimeScale.setVisibleLogicalRange).toHaveBeenCalledWith({
        from: 0,
        to: 375,
      });
    });

    it('should do nothing when range is falsy', () => {
      const initialRange = component.activeChartTimeRange;
      component.setChartTimeRange(undefined as any);
      expect(component.activeChartTimeRange).toBe(initialRange);
    });
  });

  describe('historic chart data', () => {
    it('should build historic chart data map when historical data arrives', fakeAsync(() => {
      mockMarketService.getHistoricalChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-15',
            value: 155,
            open: 150,
            close: 155,
            high: 156,
            low: 149,
          },
          {
            time: '2026-01-16',
            value: 158,
            open: 155,
            close: 158,
            high: 160,
            low: 154,
          },
        ]),
      );
      createComponent('TEST:US');
      tick(200);

      component.setChartTimeRange(Period.ONE_WEEK);
      tick(200);

      expect((component as any).historicChartData).toBeInstanceOf(Map);
      expect((component as any).historicChartData.size).toBe(2);
    }));
  });

  describe('fullscreen', () => {
    beforeEach(() => {
      createComponent('TEST:US');
    });

    it('should toggle to fullscreen', () => {
      const requestFullscreen = jest.fn().mockReturnValue(Promise.resolve());
      const containerRef = { nativeElement: { requestFullscreen } };
      (component as any).chartContainerRef = () => containerRef;

      Object.defineProperty(document, 'fullscreenElement', {
        get: () => null,
        configurable: true,
      });

      component.toggleFullscreen();

      expect(requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when already fullscreen', () => {
      const exitFullscreen = jest.fn();
      document.exitFullscreen = exitFullscreen;

      Object.defineProperty(document, 'fullscreenElement', {
        get: () => ({}),
        configurable: true,
      });

      component.toggleFullscreen();

      expect(exitFullscreen).toHaveBeenCalled();
    });

    it('should update isChartInFullscreen on fullscreen change', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        get: () => ({}),
        configurable: true,
      });

      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(true);
    });

    it('should set isChartInFullscreen to false when not fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        get: () => null,
        configurable: true,
      });

      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(false);
    });

    it('should resize chart on fullscreen change when chart exists', () => {
      (component as any).chart = mockChart;
      (component as any).chartRef = () => ({
        nativeElement: { offsetWidth: 500, offsetHeight: 400 },
      });

      component.onFullscreenChange();

      expect(mockChart.resize).toHaveBeenCalledWith(500, 400);
    });

    it('should log error when screen orientation lock fails', fakeAsync(() => {
      const requestFullscreen = jest.fn().mockResolvedValue(undefined);
      const containerRef = { nativeElement: { requestFullscreen } };
      (component as any).chartContainerRef = () => containerRef;

      (screen as any).orientation = {
        lock: jest.fn().mockRejectedValue(new Error('Orientation lock failed')),
      };

      Object.defineProperty(document, 'fullscreenElement', {
        get: () => null,
        configurable: true,
      });

      component.toggleFullscreen();
      tick();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('screen orientation to landscape'),
      );
    }));
  });

  describe('crosshair', () => {
    it('should set crosshair data when historic data exists', () => {
      createComponent('TEST:US');
      const historicData = new Map<string | number, any>();
      historicData.set('2026-01-15', {
        time: '2026-01-15',
        open: 150,
        close: 155,
        high: 156,
        low: 149,
        value: 155,
      });
      (component as any).historicChartData = historicData;

      const handler = (component as any).boundCrosshairHandler;
      handler({ time: '2026-01-15' });

      expect(component.chartCrosshairData).toBeTruthy();
      expect(component.chartCrosshairData?.open).toBe(150);
    });

    it('should clear crosshair data when no historic data', () => {
      createComponent('TEST:US');
      (component as any).historicChartData = new Map();

      const handler = (component as any).boundCrosshairHandler;
      handler({ time: undefined });

      expect(component.chartCrosshairData).toBeUndefined();
    });
  });

  describe('lifecycle', () => {
    it('should unsubscribe crosshair move on destroy', () => {
      createComponent();
      (component as any).chart = mockChart;

      component.ngOnDestroy();

      expect(mockChart.unsubscribeCrosshairMove).toHaveBeenCalled();
    });

    it('should not fail on destroy when chart is null', () => {
      createComponent();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('market status subscription', () => {
    it('should update isMarketOpen on status change', () => {
      createComponent('TEST:US');

      marketStatus$.next({ status: Status.OPEN, lastUpdated: Date.now() });

      expect((component as any).isMarketOpen).toBe(true);
    });

    it('should set isMarketOpen to false on CLOSED status', () => {
      createComponent('TEST:US');

      marketStatus$.next({ status: Status.CLOSED, lastUpdated: Date.now() });

      expect((component as any).isMarketOpen).toBe(false);
    });
  });

  describe('chart colors based on direction', () => {
    it('should apply red colors when direction is DOWN with intraday data', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );
      const downStock = {
        ...mockStock,
        quote: {
          ...mockStock.quote,
          change: { direction: Direction.DOWN, value: -2.5, percentage: -1.68 },
        },
      };
      mockMarketService.getStock = jest.fn().mockReturnValue(of(downStock));

      createComponent('TEST:US');
      tick(200);

      expect(mockAreaSeries.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lineColor: '#ef4444' }),
      );
    }));

    it('should apply blue colors when direction is undefined', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );
      const noDirStock = {
        ...mockStock,
        quote: {
          ...mockStock.quote,
          change: { direction: undefined, value: 0, percentage: 0 },
        },
      };
      mockMarketService.getStock = jest.fn().mockReturnValue(of(noDirStock));

      createComponent('TEST:US');
      tick(200);

      expect(mockAreaSeries.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lineColor: '#2962FF' }),
      );
    }));

    it('should apply lastPriceAnimation=1 when market is open with intraday', fakeAsync(() => {
      mockMarketService.getIntraDayChart = jest.fn().mockReturnValue(
        of([
          {
            time: '2026-01-01',
            value: 150,
            open: 148,
            close: 150,
            high: 152,
            low: 147,
          },
        ]),
      );

      createComponent('TEST:US');

      marketStatus$.next({ status: Status.OPEN, lastUpdated: Date.now() });

      tick(200);

      expect(mockAreaSeries.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lastPriceAnimation: 1 }),
      );
    }));
  });

  describe('crosshair with time as object', () => {
    it('should build key from time object for historic data lookup', () => {
      createComponent('TEST:US');
      const historicData = new Map<string | number, any>();
      historicData.set('2026-1-15', {
        time: '2026-1-15',
        value: 155,
      });
      (component as any).historicChartData = historicData;

      const handler = (component as any).boundCrosshairHandler;
      handler({ time: { year: 2026, month: 1, day: 15 } });

      expect(component.chartCrosshairData).toBeTruthy();
    });
  });

  describe('portfolio contribution currency computation', () => {
    it('should return undefined when plan is undefined', () => {
      plan$.next(undefined);
      expect(component.contributionCurrency()).toBeUndefined();
    });
  });

  describe('user interactions', () => {
    it('should change chart period when 1W button is clicked', async () => {
      createComponent('TEST:US');
      const spy = jest.spyOn(component, 'setChartTimeRange');
      const weekBtn = fixture.debugElement
        .queryAll(By.css('[role="group"] button'))
        .find(
          (b) => b.nativeElement.textContent.trim() === '1W',
        )?.nativeElement;
      expect(weekBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(weekBtn!);
      expect(spy).toHaveBeenCalledWith(Period.ONE_WEEK);
    });

    it('should change chart period when 3M button is clicked', async () => {
      createComponent('TEST:US');
      const spy = jest.spyOn(component, 'setChartTimeRange');
      const btn = fixture.debugElement
        .queryAll(By.css('[role="group"] button'))
        .find(
          (b) => b.nativeElement.textContent.trim() === '3M',
        )?.nativeElement;
      expect(btn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(btn!);
      expect(spy).toHaveBeenCalledWith(Period.THREE_MONTHS);
    });
  });
});
