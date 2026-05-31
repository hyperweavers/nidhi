import { CommonModule } from '@angular/common';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Directive, Input } from '@angular/core';

import { IndicesPage } from './indices.page';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { LOGGER } from '@nidhi/shared-logger';
import { Direction, ExchangeName, Status } from '../../models/market';
import { Period, ChartCategory, ChartData } from '../../models/chart';
import { ColorScheme } from '../../models/settings';
import { Index } from '../../models/index';
import { Stock } from '../../models/stock';
import { Constants } from '../../constants';

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

@Directive({ selector: '[routerLink]', standalone: true })
class MockRouterLink {
  @Input() routerLink?: unknown;
}

function createMockIndex(overrides?: Partial<Index>): Index {
  return {
    id: '2369',
    name: 'Nifty 50',
    exchange: ExchangeName.NSE,
    vendorCode: { etm: { primary: '2369' } },
    quote: {
      lastUpdated: Date.now(),
      value: 22000,
      change: { direction: Direction.UP, percentage: 0.5, value: 110 },
      open: 21900,
      close: 21890,
      low: 21850,
      high: 22050,
      fiftyTwoWeekLow: 18000,
      fiftyTwoWeekHigh: 23000,
      advance: { percentage: 60, value: 30 },
      decline: { percentage: 40, value: 20 },
    },
    metrics: {
      marketCap: 50000000,
      pe: 22,
      pb: 3.5,
      dividendYield: 1.2,
    },
    performance: {
      weekly: { direction: Direction.UP, percentage: 0.3, value: 65 },
      monthly: { direction: Direction.UP, percentage: 1.2, value: 260 },
      quarterly: { direction: Direction.UP, percentage: 3.5, value: 750 },
      halfYearly: { direction: Direction.UP, percentage: 6.0, value: 1300 },
      yearly: {
        one: { direction: Direction.UP, percentage: 12, value: 2500 },
        three: { direction: Direction.UP, percentage: 35, value: 6000 },
        five: { direction: Direction.UP, percentage: 80, value: 10000 },
      },
    },
    constituents: [
      {
        name: 'Reliance Industries',
        vendorCode: { etm: { primary: 'RELIANCE', chart: 'RELIANCE' } },
        scripCode: { nse: 'RELIANCE' },
        quote: {
          nse: {
            price: 2500,
            change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
            volume: 5000000,
          },
        },
      },
      {
        name: 'TCS',
        vendorCode: { etm: { primary: 'TCS', chart: 'TCS' } },
        scripCode: { nse: 'TCS' },
        quote: {
          nse: {
            price: 3500,
            change: { direction: Direction.DOWN, percentage: -0.8, value: -28 },
            volume: 3000000,
          },
        },
      },
    ] as Stock[],
    ...overrides,
  };
}

const mockChartData: ChartData[] = [
  {
    time: '2024-01-01',
    value: 21800,
    open: 21700,
    close: 21800,
    high: 21850,
    low: 21650,
    volume: 1000000,
  },
  {
    time: '2024-01-02',
    value: 22000,
    open: 21800,
    close: 22000,
    high: 22050,
    low: 21750,
    volume: 1200000,
  },
];

const defaultSettings = {
  theme: 'dark',
  colorScheme: ColorScheme.DARK,
  refreshInterval: 30000,
};
const marketStatusSubject = new BehaviorSubject<{
  status: Status;
  lastUpdated: number;
  startTime: number;
  endTime: number;
}>({ status: Status.OPEN, lastUpdated: Date.now(), startTime: 0, endTime: 0 });
const settingsSubject = new BehaviorSubject(defaultSettings);
const resizeSubject = new Subject<Event>();

describe('IndicesPage', () => {
  let component: IndicesPage;
  let fixture: ComponentFixture<IndicesPage>;
  let marketServiceSpy: {
    marketStatus$: BehaviorSubject<any>;
    getIndex: jest.Mock;
    getIntraDayChart: jest.Mock;
    getHistoricalChart: jest.Mock;
  };
  let settingsServiceSpy: {
    settings$: BehaviorSubject<any>;
    resize$: Subject<Event>;
  };
  let loggerMock: {
    captureException: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
  };

  async function createFixture(mockOverrides?: {
    index?: Index | null;
    intraDayChart?: ChartData[];
    historicChart?: ChartData[];
  }) {
    const index =
      mockOverrides?.index !== undefined
        ? mockOverrides.index
        : createMockIndex();
    const intraDayChart =
      mockOverrides?.intraDayChart !== undefined
        ? mockOverrides.intraDayChart
        : mockChartData;
    const historicChart =
      mockOverrides?.historicChart !== undefined
        ? mockOverrides.historicChart
        : mockChartData;

    marketServiceSpy = {
      marketStatus$: marketStatusSubject,
      getIndex: jest.fn().mockReturnValue(of(index)),
      getIntraDayChart: jest.fn().mockReturnValue(of(intraDayChart)),
      getHistoricalChart: jest.fn().mockReturnValue(of(historicChart)),
    };

    settingsServiceSpy = {
      settings$: settingsSubject,
      resize$: resizeSubject.asObservable(),
    };

    loggerMock = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [IndicesPage],
      providers: [
        { provide: MarketService, useValue: marketServiceSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: LOGGER, useValue: loggerMock },
      ],
    }).compileComponents();

    TestBed.overrideComponent(IndicesPage, {
      set: {
        imports: [CommonModule, MockRouterLink, ValueOrPlaceholderPipe],
      },
    });

    fixture = TestBed.createComponent(IndicesPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '2369');
    fixture.componentRef.setInput('exchange', 'nse');
    fixture.detectChanges();
  }

  afterEach(() => {
    jest.clearAllMocks();
    settingsSubject.next(defaultSettings);
    marketStatusSubject.next({ status: Status.OPEN, lastUpdated: Date.now(), startTime: 0, endTime: 0 });
  });

  describe('creation', () => {
    it('should create the component', fakeAsync(async () => {
      await createFixture();
      tick(150);
      expect(component).toBeTruthy();
    }));
  });

  describe('index data display', () => {
    beforeEach(fakeAsync(async () => {
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should render index name', () => {
      const nameEl = fixture.debugElement.query(By.css('.text-2xl'));
      expect(nameEl.nativeElement.textContent).toContain('Nifty 50');
    });

    it('should render exchange label', () => {
      const exchangeEl = fixture.debugElement.query(By.css('.bg-gray-100'));
      expect(exchangeEl?.nativeElement.textContent).toContain('NSE');
    });

    it('should render index value', () => {
      const valueEl = fixture.debugElement.query(By.css('.text-lg.font-semibold'));
      expect(valueEl.nativeElement.textContent).toContain('22,000');
    });

    it('should render change indicator with direction', () => {
      const changeEl = fixture.debugElement.query(By.css('.flex.items-center'));
      expect(changeEl.nativeElement.textContent).toContain('110');
      expect(changeEl.nativeElement.textContent).toContain('0.5');
    });

    it('should render overview card', () => {
      const overviewHeading = fixture.debugElement.queryAll(By.css('h5'));
      const texts = overviewHeading.map((h) => h.nativeElement.textContent.trim());
      expect(texts).toContain('Overview');
    });

    it('should render advance/decline card', () => {
      const adHeading = fixture.debugElement.queryAll(By.css('h5'));
      const texts = adHeading.map((h) => h.nativeElement.textContent.trim());
      expect(texts).toContain('Advance/Decline');
    });

    it('should render advance/decline bar', () => {
      const adBar = fixture.debugElement.query(By.css('.rounded-full.bg-red-600'));
      expect(adBar).toBeTruthy();
      const advanceBar = adBar?.query(By.css('.bg-green-500'));
      expect(advanceBar).toBeTruthy();
    });

    it('should render returns card', () => {
      const returnsHeading = fixture.debugElement.queryAll(By.css('h5'));
      const texts = returnsHeading.map((h) => h.nativeElement.textContent.trim());
      expect(texts).toContain('Returns');
    });
  });

  describe('constituents table', () => {
    beforeEach(fakeAsync(async () => {
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should render constituents section heading', () => {
      const heading = fixture.debugElement.query(By.css('h5'));
      const texts = fixture.debugElement
        .queryAll(By.css('h5'))
        .map((h) => h.nativeElement.textContent.trim());
      expect(texts).toContain('Constituent Stocks');
    });

    it('should render table with constituent rows', () => {
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(2);
    });

    it('should display constituent company names', () => {
      const firstRowName = fixture.debugElement.query(
        By.css('tbody tr:first-child th div'),
      );
      expect(firstRowName?.nativeElement.textContent).toContain(
        'Reliance Industries',
      );
    });

    it('should display LTP for constituents', () => {
      const cells = fixture.debugElement.queryAll(By.css('tbody tr td'));
      expect(cells.length).toBeGreaterThan(0);
      const ltpCell = cells[0];
      expect(ltpCell?.nativeElement.textContent).toContain('2,500');
    });

    it('should apply routerLink to constituent rows', () => {
      const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(rows.length).toBe(2);
    });

    it('should render advance/decline values', () => {
      const adText = fixture.debugElement.query(By.css('.flex.w-full.justify-between.text-sm'));
      expect(adText?.nativeElement.textContent).toContain('Advances');
      expect(adText?.nativeElement.textContent).toContain('Declines');
    });
  });

  describe('constituents empty', () => {
    it('should not render table when constituents array is empty', fakeAsync(async () => {
      const indexNoConstituents = createMockIndex({ constituents: [] });
      await createFixture({ index: indexNoConstituents });
      tick(150);
      fixture.detectChanges();
      const table = fixture.debugElement.query(By.css('table'));
      expect(table).toBeFalsy();
    }));

    it('should not render table when constituents is undefined', fakeAsync(async () => {
      const indexNoConstituents = createMockIndex({
        constituents: undefined as unknown as Stock[],
      });
      await createFixture({ index: indexNoConstituents });
      tick(150);
      fixture.detectChanges();
      const table = fixture.debugElement.query(By.css('table'));
      expect(table).toBeFalsy();
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
      const series = getMw().createChart().addSeries();
      expect(series.setData).toHaveBeenCalledWith(mockChartData);
    }));

    it('should show no-data state when chart data is empty', fakeAsync(async () => {
      await createFixture({ intraDayChart: [], historicChart: [] });
      tick(150);
      expect(component.isChartNoData).toBe(true);
      expect(component.isChartLoading).toBe(false);
    }));

    it('should set green line colors for upward direction', fakeAsync(async () => {
      await createFixture();
      tick(150);
      const series = getMw().createChart().addSeries();
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          lineColor: '#22c55e',
        }),
      );
    }));

    it('should set red line colors for downward direction', fakeAsync(async () => {
      const downIndex = createMockIndex({
        quote: {
          lastUpdated: Date.now(),
          value: 21500,
          change: { direction: Direction.DOWN, percentage: -1.2, value: -260 },
          open: 21900,
          close: 21890,
          low: 21400,
          high: 21950,
          fiftyTwoWeekLow: 18000,
          fiftyTwoWeekHigh: 23000,
          advance: { percentage: 40, value: 20 },
          decline: { percentage: 60, value: 30 },
        },
      });
      await createFixture({ index: downIndex });
      tick(150);
      const series = getMw().createChart().addSeries();
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          lineColor: '#ef4444',
        }),
      );
    }));

    it('should set default blue colors when direction is missing', fakeAsync(async () => {
      const noDirIndex = createMockIndex({
        quote: {
          lastUpdated: Date.now(),
          value: 22000,
          change: { direction: undefined as unknown as Direction, percentage: 0, value: 0 },
          open: 22000,
          close: 22000,
          low: 22000,
          high: 22000,
          fiftyTwoWeekLow: 18000,
          fiftyTwoWeekHigh: 23000,
          advance: { percentage: 50, value: 25 },
          decline: { percentage: 50, value: 25 },
        },
      });
      await createFixture({ index: noDirIndex });
      tick(150);
      const series = getMw().createChart().addSeries();
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          lineColor: '#2962FF',
        }),
      );
    }));

    it('should not init chart when chartRef is not available', fakeAsync(async () => {
      await createFixture();
      tick(150);
      const callsBefore = getMw().createChart.mock.calls.length;
      (component as any)['chartRef'] = () => undefined;
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
        By.css('[role="group"] button'),
      );
      for (const label of periodLabels) {
        expect(
          buttons.find((b) => b.nativeElement.textContent.trim() === label),
        ).toBeTruthy();
      }
    });

    it('should set range to ONE_WEEK and hide time visible', () => {
      component.setChartTimeRange(Period.ONE_WEEK);
      expect(component.activeChartTimeRange).toBe(Period.ONE_WEEK);
      expect(component.showIntraDayChart$.getValue()).toBe(false);
      expect(getMw().createChart().applyOptions).toHaveBeenCalledWith(
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
      component['chart'] = undefined;
      component['areaSeries'] = undefined;
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();

      component.setChartTimeRange(Period.ONE_WEEK);
      expect(chart.applyOptions).not.toHaveBeenCalled();
    });

    it('should restore time visible for ONE_DAY', () => {
      component.setChartTimeRange(Period.ONE_WEEK);
      component.setChartTimeRange(Period.ONE_DAY);
      expect(component.activeChartTimeRange).toBe(Period.ONE_DAY);
      const chart = getMw().createChart();
      expect(chart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          timeScale: expect.objectContaining({ timeVisible: true }),
        }),
      );
    });

    it('should set visible logical range for ONE_DAY', () => {
      component.setChartTimeRange(Period.ONE_DAY);
      const chart = getMw().createChart();
      expect(chart.timeScale().setVisibleLogicalRange).toHaveBeenCalledWith({
        from: 0,
        to: 375,
      });
    });

    it('should set lastPriceAnimation based on market open for ONE_DAY', () => {
      component['isMarketOpen'] = true;
      component.setChartTimeRange(Period.ONE_DAY);
      const series = getMw().createChart().addSeries();
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lastPriceAnimation: 1 }),
      );
    });

    it('should not update chart when no chart exists for ONE_DAY', () => {
      component['chart'] = undefined;
      component['areaSeries'] = undefined;
      component.setChartTimeRange(Period.ONE_DAY);
      const chart = getMw().createChart();
      chart.applyOptions.mockClear();
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
      component['chart'] = chart;
      component.onFullscreenChange();
      expect(chart.resize).toHaveBeenCalled();
    }));

    it('should call requestFullscreen when not in fullscreen', () => {
      const el = document.createElement('div');
      el.requestFullscreen = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(component, 'chartContainerRef', {
        writable: true,
        value: () => ({ nativeElement: el }),
      });
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
      Object.defineProperty(component, 'chartContainerRef', {
        writable: true,
        value: () => ({ nativeElement: el }),
      });
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
      await createFixture();
      tick(150);
      fixture.detectChanges();
    }));

    it('should set chartCrosshairData when crosshair moves with time object', () => {
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      component['historicChartData'] = new Map([
        ['2024-1-1', { time: '2024-01-01', value: 21800 }],
      ]);
      handler({ time: { year: 2024, month: 1, day: 1 } });
      expect(component.chartCrosshairData).toBeDefined();
    });

    it('should set chartCrosshairData when crosshair moves with numeric time', () => {
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      component['historicChartData'] = new Map([
        [1704067200, { time: 1704067200, value: 21800 }],
      ]);
      handler({ time: 1704067200 });
      expect(component.chartCrosshairData).toBeDefined();
    });

    it('should clear chartCrosshairData when time is null', () => {
      component.chartCrosshairData = {
        time: '2024-01-01',
        value: 21800,
      } as any;
      const handler =
        getMw().createChart().subscribeCrosshairMove.mock.calls[0][0];
      handler({ time: undefined });
      expect(component.chartCrosshairData).toBeUndefined();
    });

    it('should not set chartCrosshairData when historicChartData is empty', () => {
      component.chartCrosshairData = undefined;
      component['historicChartData'] = new Map();
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

    it('should update isMarketOpen when market status changes', fakeAsync(() => {
      marketStatusSubject.next({
        status: Status.CLOSED,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect(component['isMarketOpen']).toBe(false);

      marketStatusSubject.next({
        status: Status.OPEN,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect(component['isMarketOpen']).toBe(true);
    }));

    it('should update colorScheme when settings change', fakeAsync(() => {
      settingsSubject.next({
        ...defaultSettings,
        colorScheme: ColorScheme.LIGHT,
      });
      expect(component['colorScheme']).toBe(ColorScheme.LIGHT);
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
    it('should show spinner when index data has not loaded', fakeAsync(async () => {
      const delayedIndex = new Subject<Index | null>();
      marketServiceSpy = {
        marketStatus$: marketStatusSubject,
        getIndex: jest.fn().mockReturnValue(delayedIndex),
        getIntraDayChart: jest.fn().mockReturnValue(of(mockChartData)),
        getHistoricalChart: jest.fn().mockReturnValue(of(mockChartData)),
      };

      await TestBed.configureTestingModule({
        imports: [IndicesPage],
        providers: [
          { provide: MarketService, useValue: marketServiceSpy },
          { provide: SettingsService, useValue: settingsServiceSpy },
          { provide: LOGGER, useValue: loggerMock },
        ],
      }).compileComponents();

      TestBed.overrideComponent(IndicesPage, {
        set: {
          imports: [CommonModule, MockRouterLink, ValueOrPlaceholderPipe],
        },
      });

      fixture = TestBed.createComponent(IndicesPage);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('id', '2369');
      fixture.componentRef.setInput('exchange', 'nse');
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('[role="status"]'));
      expect(spinner).toBeTruthy();

      delayedIndex.next(createMockIndex());
      delayedIndex.complete();
      tick(150);
      fixture.detectChanges();
      const indexName = fixture.debugElement.query(By.css('.text-2xl'));
      expect(indexName.nativeElement.textContent).toContain('Nifty 50');
    }));
  });
});
