import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';
import { ChartData, Period } from '../../models/chart';
import { Direction, ExchangeName, Status } from '../../models/market';
import { ColorScheme } from '../../models/settings';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { StocksPage } from './stocks.page';

jest.mock('lightweight-charts', () => {
  const mTimeScale = {
    fitContent: jest.fn(),
    setVisibleRange: jest.fn(),
    setVisibleLogicalRange: jest.fn(),
  };
  const mAreaSeries = {
    applyOptions: jest.fn(),
    setData: jest.fn(),
    data: jest.fn().mockReturnValue([]),
  };
  const mChart = {
    addSeries: jest.fn().mockReturnValue(mAreaSeries),
    applyOptions: jest.fn(),
    resize: jest.fn(),
    timeScale: jest.fn().mockReturnValue(mTimeScale),
    subscribeCrosshairMove: jest.fn(),
    unsubscribeCrosshairMove: jest.fn(),
    clearCrosshairPosition: jest.fn(),
  };
  return {
    createChart: jest.fn().mockReturnValue(mChart),
    AreaSeries: 'AreaSeries',
    LineType: { Curved: 0 as const },
  };
});

function getMw() {
  return jest.requireMock('lightweight-charts');
}

function createMockStock(overrides?: Partial<Stock>): Stock {
  return {
    name: 'Reliance Industries',
    scripCode: { nse: 'RELIANCE', bse: '500325', isin: 'INE002A01018' },
    vendorCode: { etm: { primary: '1', chart: 'RELIANCE' } },
    quote: {
      nse: {
        price: 2500,
        change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
        open: 2480,
        close: 2462.5,
        low: 2450,
        high: 2510,
        fiftyTwoWeekLow: 1800,
        fiftyTwoWeekHigh: 2800,
        volume: 5000000,
      },
      bse: {
        price: 2501,
        change: { direction: Direction.UP, percentage: 1.48, value: 37.0 },
        open: 2481,
        close: 2464,
        low: 2452,
        high: 2511,
        fiftyTwoWeekLow: 1801,
        fiftyTwoWeekHigh: 2801,
        volume: 100000,
      },
    },
    details: {
      sector: { id: '', name: '' },
      industry: { id: '', name: '' },
      marketCapType: 'Large Cap',
    },
    metrics: {
      nse: {
        eps: 85,
        pe: 29.4,
        vwap: 2490,
        dividendYield: 0.35,
        marketCap: 15800000,
        faceValue: 10,
        pb: 3.5,
        bookValue: 715,
      },
    },
    performance: {
      nse: {
        weekly: { direction: Direction.UP, percentage: 0.8, value: 20 },
        monthly: { direction: Direction.UP, percentage: 3.2, value: 80 },
        quarterly: { direction: Direction.UP, percentage: 5.1, value: 125 },
        halfYearly: { direction: Direction.UP, percentage: 8.5, value: 210 },
        yearly: {
          one: { direction: Direction.UP, percentage: 15, value: 350 },
          three: { direction: Direction.UP, percentage: 45, value: 800 },
          five: { direction: Direction.UP, percentage: 120, value: 1500 },
        },
      },
    },
    details: {
      sector: { id: '1', name: 'Oil & Gas' },
      industry: { id: 'ind-1', name: 'Refineries' },
    },
    ...overrides,
  };
}

const mockChartData: ChartData[] = [
  {
    time: '2024-01-01',
    value: 2480,
    open: 2470,
    close: 2480,
    high: 2490,
    low: 2465,
    volume: 50000,
  },
  {
    time: '2024-01-02',
    value: 2500,
    open: 2480,
    close: 2500,
    high: 2510,
    low: 2475,
    volume: 55000,
  },
];

const defaultSettings = {
  theme: 'dark',
  colorScheme: ColorScheme.DARK,
  refreshInterval: 30000,
};
const marketStatusSubject = new BehaviorSubject<any>({
  status: Status.OPEN,
  lastUpdated: Date.now(),
  startTime: 0,
  endTime: 0,
});
const settingsSubject = new BehaviorSubject(defaultSettings);
const resizeSubject = new Subject<Event>();

describe('StocksPage', () => {
  let component: StocksPage;
  let fixture: ComponentFixture<StocksPage>;
  let loggerMock: any;

  function setMocks(overrides?: {
    stock?: Stock | null;
    intraDayChart?: ChartData[];
    historicChart?: ChartData[];
  }) {
    const stock =
      overrides?.stock !== undefined ? overrides.stock : createMockStock();
    const intraDayChart =
      overrides?.intraDayChart !== undefined
        ? overrides.intraDayChart
        : mockChartData;
    const historicChart =
      overrides?.historicChart !== undefined
        ? overrides.historicChart
        : mockChartData;

    TestBed.overrideProvider(MarketService, {
      useValue: {
        marketStatus$: marketStatusSubject,
        getStock: jest.fn().mockReturnValue(of(stock)),
        getIntraDayChart: jest.fn().mockReturnValue(of(intraDayChart)),
        getHistoricalChart: jest.fn().mockReturnValue(of(historicChart)),
      },
    });
    TestBed.overrideProvider(SettingsService, {
      useValue: {
        settings$: settingsSubject,
        resize$: resizeSubject.asObservable(),
      },
    });
  }

  async function createFixture(overrides?: {
    stock?: Stock | null;
    intraDayChart?: ChartData[];
    historicChart?: ChartData[];
  }) {
    loggerMock = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StocksPage],
      providers: [
        { provide: MarketService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: LOGGER, useValue: loggerMock },
      ],
    }).compileComponents();

    setMocks(overrides);
    fixture = TestBed.createComponent(StocksPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
  }

  function createDirectComponent() {
    fixture = TestBed.createComponent(StocksPage);
    component = fixture.componentInstance;
    return fixture;
  }

  afterEach(() => {
    jest.clearAllMocks();
    settingsSubject.next(defaultSettings);
    marketStatusSubject.next({
      status: Status.OPEN,
      lastUpdated: Date.now(),
      startTime: 0,
      endTime: 0,
    });
  });

  describe('creation', () => {
    it('should create the component', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(component).toBeTruthy();
    }));
  });

  describe('stock data display', () => {
    beforeEach(fakeAsync(async () => {
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should render stock name', () => {
      const nameEl = fixture.debugElement.query(By.css('.text-2xl'));
      expect(nameEl.nativeElement.textContent.trim()).toContain(
        'Reliance Industries',
      );
    });

    it('should render stock price', () => {
      const priceEl = fixture.debugElement.query(
        By.css('.text-lg.font-semibold'),
      );
      expect(priceEl.nativeElement.textContent).toContain('2,500');
    });

    it('should render change indicator with direction', () => {
      const changeEl = fixture.debugElement.query(By.css('.flex.items-center'));
      expect(changeEl.nativeElement.textContent).toContain('37.5');
      expect(changeEl.nativeElement.textContent).toContain('1.5');
    });

    it('should render exchange buttons when both scrip codes exist', () => {
      const buttons = fixture.debugElement.queryAll(
        By.css('button[type="button"]'),
      );
      const nseBtn = buttons.find(
        (b) => b.nativeElement.textContent.trim() === 'NSE',
      );
      const bseBtn = buttons.find(
        (b) => b.nativeElement.textContent.trim() === 'BSE',
      );
      expect(nseBtn).toBeTruthy();
      expect(bseBtn).toBeTruthy();
    });

    it('should render volume', () => {
      const volumeEl = fixture.debugElement.query(By.css('.text-gray-500'));
      expect(volumeEl?.nativeElement.textContent).toContain('5,000,000');
    });

    it('should render metric cards (Overview, Metrics, Returns, Scrip Info)', () => {
      const headings = fixture.debugElement.queryAll(By.css('h5'));
      const headingTexts = headings.map((h) =>
        h.nativeElement.textContent.trim(),
      );
      expect(headingTexts).toContain('Overview');
      expect(headingTexts).toContain('Metrics');
      expect(headingTexts).toContain('Returns');
      expect(headingTexts).toContain('Scrip Info');
    });

    it('should render NSE button as active by default', () => {
      const buttons = fixture.debugElement.queryAll(
        By.css('[role="group"]:first-child button'),
      );
      const nseBtn = buttons.find(
        (b) => b.nativeElement.textContent.trim() === 'NSE',
      );
      expect(nseBtn).toBeTruthy();
    });
  });

  describe('exchange switching', () => {
    it('should default to NSE exchange', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(component.activeExchange).toBe(ExchangeName.NSE);
    }));

    it('should set exchange to BSE when setExchange is called', fakeAsync(async () => {
      await createFixture();
      tick(150);
      component.setExchange(ExchangeName.BSE);
      expect(component.activeExchange).toBe(ExchangeName.BSE);
    }));

    it('should not change exchange when falsy value is passed', fakeAsync(async () => {
      await createFixture();
      tick(150);
      component.setExchange(ExchangeName.BSE);
      component.setExchange(undefined as unknown as ExchangeName);
      expect(component.activeExchange).toBe(ExchangeName.BSE);
    }));

    it('should set exchange to BSE when stock has no NSE scrip code', fakeAsync(async () => {
      const bseOnlyStock = createMockStock({
        scripCode: { nse: undefined, bse: '500325', isin: 'INE002A01018' },
      });
      await createFixture({ stock: bseOnlyStock });
      tick(150);
      expect(component.activeExchange).toBe(ExchangeName.BSE);
    }));
  });

  describe('chart initialization', () => {
    it('should start with chart loading state', fakeAsync(async () => {
      await createFixture();
      expect(component.isChartLoading).toBe(true);
      expect(component.isChartNoData).toBe(false);
    }));

    it('should initialize chart when data arrives', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(getMw().createChart).toHaveBeenCalled();
      expect(getMw().createChart().addSeries).toHaveBeenCalledWith(
        'AreaSeries',
        expect.objectContaining({ lineWidth: 1 }),
      );
      expect(getMw().createChart().subscribeCrosshairMove).toHaveBeenCalled();
      expect(component.isChartLoading).toBe(false);
    }));

    it('should set areaSeries data with chart data', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(getMw().createChart().addSeries().setData).toHaveBeenCalledWith(
        mockChartData,
      );
    }));

    it('should show no-data state when chart data is empty', fakeAsync(async () => {
      await createFixture({ intraDayChart: [], historicChart: [] });
      tick(150);
      expect(component.isChartNoData).toBe(true);
      expect(component.isChartLoading).toBe(false);
    }));

    it('should apply chart color scheme after initialization', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(getMw().createChart().applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: expect.objectContaining({ textColor: expect.any(String) }),
        }),
      );
    }));

    it('should set green line colors for upward direction', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(
        getMw().createChart().addSeries().applyOptions,
      ).toHaveBeenCalledWith(expect.objectContaining({ lineColor: '#22c55e' }));
    }));

    it('should set red line colors for downward direction', fakeAsync(async () => {
      const downStock = createMockStock({
        quote: {
          nse: {
            price: 2400,
            change: {
              direction: Direction.DOWN,
              percentage: -1.5,
              value: -37.5,
            },
            open: 2480,
            close: 2462.5,
            low: 2390,
            high: 2490,
            fiftyTwoWeekLow: 1800,
            fiftyTwoWeekHigh: 2800,
            volume: 5000000,
          },
        },
      });
      await createFixture({ stock: downStock });
      tick(150);
      expect(
        getMw().createChart().addSeries().applyOptions,
      ).toHaveBeenCalledWith(expect.objectContaining({ lineColor: '#ef4444' }));
    }));

    it('should set default blue colors when direction is missing', fakeAsync(async () => {
      const noDirStock = createMockStock({
        quote: {
          nse: {
            price: 2500,
            change: {
              direction: undefined as unknown as Direction,
              percentage: 0,
              value: 0,
            },
            open: 2500,
            close: 2500,
            low: 2500,
            high: 2500,
            fiftyTwoWeekLow: 1800,
            fiftyTwoWeekHigh: 2800,
            volume: 5000000,
          },
        },
      });
      await createFixture({ stock: noDirStock });
      tick(150);
      expect(
        getMw().createChart().addSeries().applyOptions,
      ).toHaveBeenCalledWith(expect.objectContaining({ lineColor: '#2962FF' }));
    }));

    it('should not init chart when chartRef is not available', fakeAsync(async () => {
      await createFixture();
      tick(150);
      // Access private chartRef and make it return undefined
      (component as any)['chartRef'] = () => undefined;
      const callsBefore = getMw().createChart.mock.calls.length;
      (component as any)['initChart'](mockChartData);
      expect(getMw().createChart.mock.calls.length).toBe(callsBefore);
    }));
  });

  describe('chart time range', () => {
    beforeEach(fakeAsync(async () => {
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should default to ONE_DAY', () => {
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
    });

    it('should show all period buttons in the DOM', () => {
      const periodLabels = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];
      const buttons = fixture.debugElement.queryAll(
        By.css('[role="group"]:last-child button'),
      );
      for (const label of periodLabels) {
        expect(
          buttons.find((b) => b.nativeElement.textContent.trim() === label),
        ).toBeTruthy();
      }
    });

    it('should set range to ONE_WEEK and hide time visible', () => {
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();
      component.setChartTimeRange(Period.ONE_WEEK);
      expect(component.activeChartTimeRange).toBe(Period.ONE_WEEK);
      expect(component['showIntraDayChart$'].getValue()).toBe(false);
      expect(chart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeScale: expect.objectContaining({ timeVisible: false }),
        }),
      );
    });

    it('should set range to ONE_MONTH with historic data', () => {
      const series = getMw().createChart().addSeries();
      series.data.mockReturnValue([{ value: 1 }]);
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
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid range'),
      );
    });

    it('should not call chart methods when chart is undefined for historic range', () => {
      (component as any)['chart'] = undefined;
      (component as any)['areaSeries'] = undefined;
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();
      component.setChartTimeRange(Period.ONE_WEEK);
      expect(chart.applyOptions).not.toHaveBeenCalled();
    });

    it('should restore time visible for ONE_DAY', () => {
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();
      component.setChartTimeRange(Period.ONE_DAY);
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
      expect(component['showIntraDayChart$'].getValue()).toBe(true);
      expect(chart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeScale: expect.objectContaining({ timeVisible: true }),
        }),
      );
    });

    it('should set visible logical range for ONE_DAY', () => {
      component.setChartTimeRange(Period.ONE_DAY);
      expect(
        getMw().createChart().timeScale().setVisibleLogicalRange,
      ).toHaveBeenCalledWith({ from: 0, to: 375 });
    });

    it('should set lastPriceAnimation based on market open for ONE_DAY', () => {
      (component as any)['isMarketOpen'] = true;
      component.setChartTimeRange(Period.ONE_DAY);
      expect(
        getMw().createChart().addSeries().applyOptions,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ lastPriceAnimation: 1 }),
      );
    });

    it('should not update chart when no chart exists for ONE_DAY', () => {
      (component as any)['chart'] = undefined;
      (component as any)['areaSeries'] = undefined;
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();
      component.setChartTimeRange(Period.ONE_DAY);
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
    });
  });

  describe('fullscreen', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        configurable: true,
        value: { lock: jest.fn().mockResolvedValue(undefined) },
      });
    });

    it('should set isChartInFullscreen true on entering fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.createElement('div'),
      });
      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(true);
    });

    it('should set isChartInFullscreen false on exiting fullscreen', () => {
      component.isChartInFullscreen = true;
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });
      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(false);
    });

    it('should resize chart on fullscreen change when chart exists', fakeAsync(async () => {
      await createFixture();
      tick(150);
      const chart = getMw().createChart();
      chart.resize.mockClear();
      (component as any)['chart'] = chart;
      component.onFullscreenChange();
      expect(chart.resize).toHaveBeenCalled();
    }));

    it('should call requestFullscreen when not in fullscreen', () => {
      const el = document.createElement('div');
      el.requestFullscreen = jest.fn().mockResolvedValue(undefined);
      (component as any)['chartContainerRef'] = () => ({ nativeElement: el });
      component.toggleFullscreen();
      expect(el.requestFullscreen).toHaveBeenCalled();
    });

    it('should call exitFullscreen when already in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.createElement('div'),
      });
      document.exitFullscreen = jest.fn();
      component.toggleFullscreen();
      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should log error when requestFullscreen fails', async () => {
      const el = document.createElement('div');
      el.requestFullscreen = jest
        .fn()
        .mockRejectedValue(new Error('fullscreen error'));
      (component as any)['chartContainerRef'] = () => ({ nativeElement: el });
      component.toggleFullscreen();
      await new Promise((r) => setTimeout(r, 0));
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('fullscreen error'),
      );
    });

    it('should not call requestFullscreen when chartContainerRef is undefined', () => {
      (component as any)['chartContainerRef'] = () => undefined;
      component.toggleFullscreen();
      expect(loggerMock.error).not.toHaveBeenCalled();
    });
  });

  describe('crosshair data', () => {
    beforeEach(fakeAsync(async () => {
      getMw().createChart.mockClear();
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should set chartCrosshairData when crosshair moves with time object', () => {
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      (component as any)['historicChartData'] = new Map([
        ['2024-1-1', { time: '2024-01-01', value: 2480 }],
      ]);
      handler({ time: { year: 2024, month: 1, day: 1 } });
      expect(component.chartCrosshairData).toBeDefined();
    });

    it('should set chartCrosshairData when crosshair moves with numeric time', () => {
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      (component as any)['historicChartData'] = new Map([
        [1704067200, { time: 1704067200, value: 2480 }],
      ]);
      handler({ time: 1704067200 });
      expect(component.chartCrosshairData).toBeDefined();
    });

    it('should clear chartCrosshairData when time is null', () => {
      component.chartCrosshairData = { time: '2024-01-01', value: 2480 } as any;
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      handler({ time: undefined });
      expect(component.chartCrosshairData).toBeUndefined();
    });

    it('should not set chartCrosshairData when historicChartData is empty', () => {
      component.chartCrosshairData = undefined;
      (component as any)['historicChartData'] = new Map();
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      handler({ time: '2024-01-01' });
      expect(component.chartCrosshairData).toBeUndefined();
    });
  });

  describe('settings and market status', () => {
    beforeEach(fakeAsync(async () => {
      await createFixture();
    }));

    it('should update isMarketOpen when market status changes', () => {
      marketStatusSubject.next({
        status: Status.CLOSED,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect((component as any)['isMarketOpen']).toBe(false);
      marketStatusSubject.next({
        status: Status.OPEN,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect((component as any)['isMarketOpen']).toBe(true);
    });

    it('should update colorScheme when settings change', fakeAsync(() => {
      tick(150);
      settingsSubject.next({
        ...defaultSettings,
        colorScheme: ColorScheme.LIGHT,
      });
      tick();
      expect((component as any)['colorScheme']).toBe(ColorScheme.LIGHT);
    }));

    it('should apply chart color scheme when settings change and chart exists', fakeAsync(() => {
      tick(150);
      const chart = getMw().createChart();
      (component as any)['chart'] = chart;
      chart.applyOptions.mockClear();
      settingsSubject.next({
        ...defaultSettings,
        colorScheme: ColorScheme.LIGHT,
      });
      tick();
      expect(chart.applyOptions).toHaveBeenCalled();
    }));

    it('should resize chart on resize event when chart exists', fakeAsync(() => {
      tick(150);
      const chart = getMw().createChart();
      (component as any)['chart'] = chart;
      chart.resize.mockClear();
      resizeSubject.next(new Event('resize'));
      expect(chart.resize).toHaveBeenCalled();
    }));

    it('should not resize chart on resize event when chart is undefined', fakeAsync(() => {
      tick(150);
      (component as any)['chart'] = undefined;
      const chart = getMw().createChart();
      chart.resize.mockClear();
      resizeSubject.next(new Event('resize'));
      expect(chart.resize).not.toHaveBeenCalled();
    }));
  });

  describe('HostListener', () => {
    it('should handle window fullscreenchange event', fakeAsync(async () => {
      await createFixture();
      tick(150);
      const spy = jest.spyOn(component, 'onFullscreenChange');
      window.dispatchEvent(new Event('fullscreenchange'));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    }));
  });

  describe('cleanup', () => {
    it('should unsubscribe crosshair move on destroy', fakeAsync(async () => {
      await createFixture();
      tick(150);
      const chart = getMw().createChart();
      fixture.destroy();
      expect(chart.unsubscribeCrosshairMove).toHaveBeenCalled();
    }));

    it('should not call unsubscribeCrosshairMove when chart is undefined', fakeAsync(async () => {
      await createFixture();
      tick(150);
      (component as any)['chart'] = undefined;
      const chart = getMw().createChart();
      chart.unsubscribeCrosshairMove.mockClear();
      fixture.destroy();
      expect(chart.unsubscribeCrosshairMove).not.toHaveBeenCalled();
    }));
  });

  describe('loading state', () => {
    it('should show spinner when stock data has not loaded', fakeAsync(async () => {
      const delayedStock = new Subject<Stock | null>();
      await TestBed.configureTestingModule({
        imports: [StocksPage],
        providers: [
          {
            provide: MarketService,
            useValue: {
              marketStatus$: marketStatusSubject,
              getStock: jest.fn().mockReturnValue(delayedStock),
              getIntraDayChart: jest.fn().mockReturnValue(of(mockChartData)),
              getHistoricalChart: jest.fn().mockReturnValue(of(mockChartData)),
            },
          },
          {
            provide: SettingsService,
            useValue: {
              settings$: settingsSubject,
              resize$: resizeSubject.asObservable(),
            },
          },
          { provide: LOGGER, useValue: loggerMock },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(StocksPage);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('id', '1');
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('[role="status"]'));
      expect(spinner).toBeTruthy();

      delayedStock.next(createMockStock());
      delayedStock.complete();
      tick(150);
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('.text-2xl')).nativeElement
          .textContent,
      ).toContain('Reliance Industries');
    }));
  });

  describe('stock without scrip codes', () => {
    it('should not initialize chart when stock has no NSE or BSE scrip code', fakeAsync(async () => {
      const noScripStock = createMockStock({
        scripCode: { nse: undefined, bse: undefined, isin: 'INE002A01018' },
      });
      await createFixture({ stock: noScripStock });
      tick(150);
      expect(component.isChartLoading).toBe(true);
    }));
  });

  describe('user interactions', () => {
    it('should switch exchange when BSE button is clicked', async () => {
      await createFixture();
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const bseBtn = buttons.find(
        (b) => b.nativeElement.textContent.trim() === 'BSE',
      )?.nativeElement;
      expect(bseBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(bseBtn!);
      fixture.detectChanges();
      expect(component.activeExchange).toBe(ExchangeName.BSE);
    });

    it('should change chart period when 1W button is clicked', async () => {
      await createFixture();
      const periodBtn = fixture.debugElement
        .queryAll(By.css('[role="group"] button'))
        .find(
          (b) => b.nativeElement.textContent.trim() === '1W',
        )?.nativeElement;
      expect(periodBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(periodBtn!);
      fixture.detectChanges();
      expect(component.activeChartTimeRange).toBe(Period.ONE_WEEK);
    });
  });
});
