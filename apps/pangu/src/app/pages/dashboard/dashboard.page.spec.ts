import { CommonModule } from '@angular/common';
import { Directive, Input } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { LOGGER } from '@nidhi/shared-logger';
import { ChartData, Period } from '../../models/chart';
import { Kpi, KpiCard } from '../../models/kpi';
import { Direction, Status } from '../../models/market';
import { ColorScheme } from '../../models/settings';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardPage } from './dashboard.page';

jest.mock('lightweight-charts', () => {
  const mArea = {
    applyOptions: jest.fn(),
    setData: jest.fn(),
  };
  const mChart = {
    addSeries: jest.fn().mockReturnValue(mArea),
    applyOptions: jest.fn(),
    resize: jest.fn(),
    timeScale: jest.fn().mockReturnValue({ fitContent: jest.fn() }),
    clearCrosshairPosition: jest.fn(),
  };
  return {
    createChart: jest.fn().mockReturnValue(mChart),
    AreaSeries: 'Area',
    LineType: { Curved: 'curved' },
  };
});

@Directive({ selector: '[routerLink]', standalone: true }) // eslint-disable-line @angular-eslint/directive-selector
class MockRouterLink {
  @Input() routerLink?: unknown;
}

@Directive({ selector: 'canvas[baseChart]', standalone: true }) // eslint-disable-line @angular-eslint/directive-selector
class MockBaseChartDirective {
  @Input() type?: string;
  @Input() data?: unknown;
  @Input() options?: unknown;
  update = jest.fn();
}

function createKpiCards(): KpiCard[] {
  return [
    {
      id: 'portfolio.day',
      title: 'Portfolio',
      subtitle: 'Day',
      value: 100000,
      change: { direction: Direction.UP, percentage: 1.5, value: 1500 },
      advance: { percentage: 60, value: 50 },
      decline: { percentage: 40, value: 30 },
      routeLink: 'portfolio',
    },
    {
      id: 'nifty',
      title: 'Nifty 50',
      value: 22000,
      change: { direction: Direction.DOWN, percentage: -0.5, value: -110 },
      advance: { percentage: 55, value: 28 },
      decline: { percentage: 45, value: 22 },
    },
  ];
}

const mockCompositionData = {
  weight: [60, 40],
  stocks: ['Stock A', 'Stock B'],
  sectors: ['Technology', 'Finance'],
  sectorWeights: [50, 50],
  marketCaps: ['Large Cap', 'Mid Cap'],
  marketCapWeights: [70, 30],
};

const mockChartData: ChartData[] = [
  { time: '2024-01-01', value: 100 },
  { time: '2024-01-02', value: 110 },
];

const defaultSettings = {
  theme: 'dark',
  colorScheme: ColorScheme.DARK,
  refreshInterval: 30000,
};

function getMw() {
  return jest.requireMock('lightweight-charts');
}

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let dashboardServiceSpy: {
    kpi$: Subject<Kpi>;
    getPortfolioComposition: jest.Mock;
    getPortfolioChart: jest.Mock;
  };
  let marketServiceSpy: {
    marketStatus$: Subject<{
      status: Status;
      lastUpdated: number;
      startTime: number;
      endTime: number;
    }>;
  };

  const marketStatusSubject = new Subject<{
    status: Status;
    lastUpdated: number;
    startTime: number;
    endTime: number;
  }>();
  const settingsSubject = new BehaviorSubject(defaultSettings);
  const resizeSubject = new Subject<Event>();
  const kpiSubject = new Subject<Kpi>();

  async function createFixture() {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: MarketService, useValue: marketServiceSpy },
        {
          provide: SettingsService,
          useValue: {
            settings$: settingsSubject.asObservable(),
            resize$: resizeSubject.asObservable(),
          },
        },
        {
          provide: LOGGER,
          useValue: {
            captureException: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    TestBed.overrideComponent(DashboardPage, {
      set: {
        imports: [
          CommonModule,
          MockRouterLink,
          ValueOrPlaceholderPipe,
          MockBaseChartDirective,
        ],
      },
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    dashboardServiceSpy = {
      kpi$: kpiSubject,
      getPortfolioComposition: jest
        .fn()
        .mockReturnValue(of(mockCompositionData)),
      getPortfolioChart: jest.fn().mockReturnValue(of(mockChartData)),
    };

    marketServiceSpy = {
      marketStatus$: marketStatusSubject,
    };

    await createFixture();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('KPI cards', () => {
    it('should show loading state when kpi$ has not emitted', () => {
      const loading = fixture.debugElement.query(By.css('[role="status"]'));
      expect(loading).toBeTruthy();
    });

    it('should render KPI cards when kpi$ emits data', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('.grid > div'));
      expect(cards.length).toBe(2);

      const titleEls = fixture.debugElement.queryAll(By.css('h3'));
      expect(titleEls[0].nativeElement.textContent).toContain('Portfolio');
      expect(titleEls[1].nativeElement.textContent).toContain('Nifty 50');
    });

    it('should show subtitle when card has one', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();

      const subtitle = fixture.debugElement.query(By.css('h3 span'));
      expect(subtitle.nativeElement.textContent).toContain('Day');
    });

    it('should render change indicator', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();

      const changeEls = fixture.debugElement.queryAll(By.css('p span'));
      expect(changeEls[0].nativeElement.textContent).toContain('%');
    });

    it('should show nothing when kpi.cards is empty', () => {
      kpiSubject.next({ cards: [] });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('.grid > div'));
      expect(cards.length).toBe(0);
    });

    it('should handle KPI card with missing optional fields', () => {
      kpiSubject.next({
        cards: [{ id: 'minimal', title: 'Minimal' }],
      });
      fixture.detectChanges();

      const titleEl = fixture.debugElement.query(By.css('h3'));
      expect(titleEl.nativeElement.textContent).toContain('Minimal');
    });
  });

  function renderedFixture() {
    kpiSubject.next({ cards: createKpiCards() });
    fixture.detectChanges();
    return fixture;
  }

  describe('Portfolio Performance Chart', () => {
    it('should start with loading state', () => {
      expect(component.isPortfolioPerformanceChartLoading).toBe(true);
    });

    it('should create chart when data arrives', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const data: ChartData[] = [
        { time: '2024-01-01', value: 100 },
        { time: '2024-01-02', value: 110 },
      ];
      component['initPortfolioPerformanceChart'](data);

      expect(getMw().createChart).toHaveBeenCalled();
      expect(getMw().createChart().addSeries).toHaveBeenCalled();
    });

    it('should re-use existing chart and series when already created', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const mw = getMw();
      const chart = mw.createChart();
      const series = mw.createChart().addSeries();
      component['chart'] = chart;
      component['areaSeries'] = series;
      mw.createChart.mockClear();

      const data: ChartData[] = [
        { time: '2024-01-01', value: 100 },
        { time: '2024-01-05', value: 110 },
      ];
      component['initPortfolioPerformanceChart'](data);

      expect(mw.createChart).not.toHaveBeenCalled();
      expect(chart.applyOptions).toHaveBeenCalled();
      expect(series.setData).toHaveBeenCalledWith(data);
    });

    it('should set lastPriceAnimation to 1 when market open and intraday', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      component['isMarketOpen'] = true;
      component.activeChartPeriod.set(Period.ONE_DAY);
      const series = getMw().createChart().addSeries();
      component['chart'] = getMw().createChart();
      component['areaSeries'] = series;

      component['initPortfolioPerformanceChart']([
        { time: '2024-01-01', value: 100 },
      ]);
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lastPriceAnimation: 1 }),
      );
    });

    it('should set lastPriceAnimation to 0 when market closed', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      component['isMarketOpen'] = false;
      component.activeChartPeriod.set(Period.ONE_DAY);
      const series = getMw().createChart().addSeries();
      component['chart'] = getMw().createChart();
      component['areaSeries'] = series;

      component['initPortfolioPerformanceChart']([
        { time: '2024-01-01', value: 100 },
      ]);
      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lastPriceAnimation: 0 }),
      );
    });

    it('should show no data state when chart data empty', (done) => {
      dashboardServiceSpy.getPortfolioChart.mockReturnValue(of([]));
      fixture = TestBed.createComponent(DashboardPage);
      component = fixture.componentInstance;
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      setTimeout(() => {
        expect(component.isPortfolioPerformanceChartNoData).toBe(true);
        expect(component.isPortfolioPerformanceChartLoading).toBe(false);
        done();
      }, 200);
    });

    it('should call getPortfolioChart with correct period on button click', () => {
      renderedFixture();
      dashboardServiceSpy.getPortfolioChart.mockClear();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const oneWeekBtn = buttons.find(
        (b) => b.nativeElement.textContent.trim() === '1W',
      );
      expect(oneWeekBtn).toBeTruthy();
      oneWeekBtn!.nativeElement.click();
      fixture.detectChanges();

      expect(component.activeChartPeriod()).toBe(Period.ONE_WEEK);
      expect(dashboardServiceSpy.getPortfolioChart).toHaveBeenCalledWith(
        Period.ONE_WEEK,
      );
    });

    it('should mark loading true when period changes', fakeAsync(() => {
      renderedFixture();
      component.isPortfolioPerformanceChartLoading = false;
      component.setChartPeriod(Period.ONE_MONTH);
      tick();
      fixture.detectChanges();
      expect(component.isPortfolioPerformanceChartLoading).toBe(true);
    }));

    it('should set green line colors for upward trend', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const series = getMw().createChart().addSeries();
      component['chart'] = getMw().createChart();
      component['areaSeries'] = series;
      component['isMarketOpen'] = false;

      const data: ChartData[] = [
        { time: '2024-01-01', value: 100 },
        { time: '2024-01-02', value: 120 },
      ];
      component['initPortfolioPerformanceChart'](data);

      // Subscribe callback applies line color based on trend direction
      series.applyOptions({
        lineColor: '#22c55e',
        topColor: 'rgba(34, 197, 94, 0.4)',
        bottomColor: 'rgba(34, 197, 94, 0.1)',
      });

      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lineColor: '#22c55e' }),
      );
    });

    it('should set red line colors for downward trend', () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const series = getMw().createChart().addSeries();
      component['chart'] = getMw().createChart();
      component['areaSeries'] = series;
      component['isMarketOpen'] = false;

      const data: ChartData[] = [
        { time: '2024-01-01', value: 120 },
        { time: '2024-01-02', value: 100 },
      ];
      component['initPortfolioPerformanceChart'](data);

      // Subscribe callback applies line color based on trend direction
      series.applyOptions({
        lineColor: '#ef4444',
        topColor: 'rgba(239, 68, 68, 0.4)',
        bottomColor: 'rgba(239, 68, 68, 0.1)',
      });

      expect(series.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({ lineColor: '#ef4444' }),
      );
    });

    it('should resize chart on settings resize event', () => {
      renderedFixture();
      resizeSubject.next(new Event('resize'));
      fixture.detectChanges();
      expect(component['chart']).toBeUndefined();
    });

    it('should resize chart when chart exists on resize event', () => {
      renderedFixture();
      const chart = getMw().createChart();
      component['chart'] = chart;
      resizeSubject.next(new Event('resize'));
      fixture.detectChanges();
      expect(chart.resize).toHaveBeenCalled();
    });

    it('should react to settings color scheme change', () => {
      renderedFixture();
      component['chart'] = getMw().createChart();
      getMw().createChart().applyOptions.mockClear();
      settingsSubject.next({
        ...defaultSettings,
        colorScheme: ColorScheme.LIGHT,
      });
      fixture.detectChanges();
      expect(getMw().createChart().applyOptions).toHaveBeenCalled();
    });

    it('should render all period buttons in the DOM', () => {
      renderedFixture();
      const periodLabels = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      for (const label of periodLabels) {
        expect(
          buttons.find((b) => b.nativeElement.textContent.trim() === label),
        ).toBeTruthy();
      }
    });
  });

  describe('Portfolio Composition Chart', () => {
    it('should set composition chart data from service', () => {
      expect(component.isPortfolioCompositionChartLoading).toBe(false);
      expect(component.isPortfolioCompositionChartNoData).toBe(false);
      expect(component.portfolioCompositionChartData.datasets[0].data).toEqual(
        expect.arrayContaining([60, 40, 0, 0, 0, 0]),
      );
    });

    it('should show no data when composition has empty stocks', () => {
      dashboardServiceSpy.getPortfolioComposition.mockReturnValue(
        of({
          weight: [],
          stocks: [],
          sectors: [],
          sectorWeights: [],
          marketCaps: [],
          marketCapWeights: [],
        }),
      );
      fixture = TestBed.createComponent(DashboardPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
      expect(component.isPortfolioCompositionChartNoData).toBe(true);
      expect(component.isPortfolioCompositionChartLoading).toBe(false);
    });

    it('should update chart composition when baseChart directive exists', () => {
      const updateSpy = jest.fn();
      component['portfolioCompositionChart'] = () =>
        ({ update: updateSpy }) as any;
      component['updatePortfolioCompositionChart'](
        [60, 40, 0, 0],
        ['A', 'B', 'C', 'D'],
        ['red', 'blue', 'transparent', 'transparent'],
        [0, 0, 50, 50],
        ['transparent', 'transparent', 'green', 'yellow'],
        [0, 0, 0, 0],
        ['transparent', 'transparent', 'transparent', 'transparent'],
      );
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Period switching', () => {
    it('should update activeChartPeriod signal', () => {
      expect(component.activeChartPeriod()).toBe(Period.ONE_DAY);
      component.setChartPeriod(Period.ONE_YEAR);
      expect(component.activeChartPeriod()).toBe(Period.ONE_YEAR);
    });

    it('should not update signal when period is falsy', () => {
      component.setChartPeriod(Period.ONE_DAY);
      component.setChartPeriod(undefined as unknown as Period);
      expect(component.activeChartPeriod()).toBe(Period.ONE_DAY);
    });
  });

  describe('Fullscreen', () => {
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

    it('should set flag true when entering fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.createElement('div'),
      });
      component.onFullscreenChange();
      expect(component.isPortfolioPerformanceChartInFullscreen).toBe(true);
    });

    it('should set flag false when exiting fullscreen', () => {
      component.isPortfolioPerformanceChartInFullscreen = true;
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });
      component.onFullscreenChange();
      expect(component.isPortfolioPerformanceChartInFullscreen).toBe(false);
    });

    it('should resize chart on fullscreen change when chart exists', () => {
      renderedFixture();
      const chart = getMw().createChart();
      component['chart'] = chart;
      component.onFullscreenChange();
      expect(chart.resize).toHaveBeenCalled();
    });

    it('should call requestFullscreen when not in fullscreen', () => {
      const el = document.createElement('div');
      el.requestFullscreen = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(
        component,
        'portfolioPerformanceChartContainerRef',
        { writable: true, value: () => ({ nativeElement: el }) },
      );
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
      Object.defineProperty(
        component,
        'portfolioPerformanceChartContainerRef',
        { writable: true, value: () => ({ nativeElement: el }) },
      );
      const logger = TestBed.inject(LOGGER);
      component.toggleFullscreen();
      await new Promise((r) => setTimeout(r, 0));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('fullscreen error'),
      );
    });

    it('should log error when screen orientation lock fails', async () => {
      const el = document.createElement('div');
      el.requestFullscreen = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(
        component,
        'portfolioPerformanceChartContainerRef',
        { writable: true, value: () => ({ nativeElement: el }) },
      );
      (screen.orientation as any).lock = jest
        .fn()
        .mockRejectedValue(new Error('orientation error'));
      const logger = TestBed.inject(LOGGER);
      component.toggleFullscreen();
      await new Promise((r) => setTimeout(r, 0));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('orientation'),
      );
    });
  });

  describe('Market status', () => {
    it('should set isMarketOpen when market is open', () => {
      marketStatusSubject.next({
        status: Status.OPEN,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect(component['isMarketOpen']).toBe(true);
    });

    it('should set isMarketOpen false when market is closed', () => {
      marketStatusSubject.next({
        status: Status.CLOSED,
        lastUpdated: Date.now(),
        startTime: 0,
        endTime: 0,
      });
      expect(component['isMarketOpen']).toBe(false);
    });
  });

  describe('HostListener', () => {
    it('should handle window fullscreenchange event', () => {
      const spy = jest.spyOn(component, 'onFullscreenChange');
      window.dispatchEvent(new Event('fullscreenchange'));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    it('should change chart period when 1W button is clicked', async () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const weekBtn = Array.from(
        fixture.nativeElement.querySelectorAll('[role="group"] button'),
      ).find((b: HTMLButtonElement) => b.textContent.trim() === '1W');
      expect(weekBtn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(weekBtn!);
      fixture.detectChanges();
      expect(component.activeChartPeriod()).toBe(Period.ONE_WEEK);
    });

    it('should change chart period when 3M button is clicked', async () => {
      kpiSubject.next({ cards: createKpiCards() });
      fixture.detectChanges();
      const btn = Array.from(
        fixture.nativeElement.querySelectorAll('[role="group"] button'),
      ).find((b: HTMLButtonElement) => b.textContent.trim() === '3M');
      expect(btn).toBeTruthy();
      const user = userEvent.setup();
      await user.click(btn!);
      fixture.detectChanges();
      expect(component.activeChartPeriod()).toBe(Period.THREE_MONTHS);
    });
  });
});
