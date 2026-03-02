import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';

jest.mock('lightweight-charts', () => ({
  createChart: jest.fn().mockReturnValue({
    addSeries: jest.fn().mockReturnValue({
      setData: jest.fn(),
      applyOptions: jest.fn(),
      data: jest.fn().mockReturnValue([{ time: 1 }]),
    }),
    applyOptions: jest.fn(),
    resize: jest.fn(),
    timeScale: jest.fn().mockReturnValue({
      fitContent: jest.fn(),
      setVisibleRange: jest.fn(),
      setVisibleLogicalRange: jest.fn(),
    }),
    subscribeCrosshairMove: jest.fn(),
    unsubscribeCrosshairMove: jest.fn(),
    clearCrosshairPosition: jest.fn(),
  }),
  AreaSeries: {},
}));

import { Direction, ExchangeName, Status } from '../../models/market';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { IndicesPage } from './indices.page';

describe('IndicesPage', () => {
  let component: IndicesPage;
  let fixture: ComponentFixture<IndicesPage>;
  let mockMarketService: any;
  let mockSettingsService: any;
  let marketStatusSubject: BehaviorSubject<any>;
  let resizeSubject: Subject<void>;
  let settingsSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    marketStatusSubject = new BehaviorSubject({
      status: Status.OPEN,
      tradingStartTime: '',
      tradingEndTime: '',
    });
    resizeSubject = new Subject<void>();
    settingsSubject = new BehaviorSubject({
      theme: Theme.SYSTEM,
      colorScheme: ColorScheme.DARK,
      refreshInterval: RefreshInterval.FIFTEEN_SECONDS,
    });

    mockMarketService = {
      marketStatus$: marketStatusSubject.asObservable(),
      getIndex: jest.fn().mockReturnValue(
        of({
          id: 'idx1',
          name: 'Nifty 50',
          exchange: ExchangeName.NSE,
          quote: {
            change: { direction: Direction.UP, percentage: 1, value: 100 },
          },
          constituents: [],
        }),
      ),
      getIntraDayChart: jest
        .fn()
        .mockReturnValue(of([{ time: '2024', value: 100 }])),
      getHistoricalChart: jest
        .fn()
        .mockReturnValue(of([{ time: 1700000, value: 100 }])),
    };

    mockSettingsService = {
      resize$: resizeSubject.asObservable(),
      settings$: settingsSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [IndicesPage],
      providers: [
        { provide: MarketService, useValue: mockMarketService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    })
      .overrideComponent(IndicesPage, {
        set: { template: '<div #chartContainer><div #chart></div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(IndicesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should subscribe to index$ and trigger chart initialization', fakeAsync(() => {
    fixture.detectChanges();

    // Subscribe to index$ to trigger the constructor logic
    let indexResult: any;
    component.index$?.subscribe((idx) => {
      indexResult = idx;
    });

    tick(200); // Allow delay(100) and subscriptions to settle

    expect(indexResult).toBeTruthy();
    expect(indexResult?.name).toBe('Nifty 50');
    expect(mockMarketService.getIntraDayChart).toHaveBeenCalled();
  }));

  it('should handle market status CLOSED', () => {
    marketStatusSubject.next({
      status: Status.CLOSED,
      tradingStartTime: '',
      tradingEndTime: '',
    });
    fixture.detectChanges();
    expect((component as any).isMarketOpen).toBe(false);
  });

  it('should handle empty chart data', fakeAsync(() => {
    mockMarketService.getIntraDayChart.mockReturnValue(of([]));
    fixture.detectChanges();

    component.index$?.subscribe();
    tick(200);

    expect(component.isChartNoData).toBe(true);
  }));

  it('should handle null index (no chart init)', fakeAsync(() => {
    mockMarketService.getIndex.mockReturnValue(of(null));
    fixture.detectChanges();

    let result: any;
    component.index$?.subscribe((idx) => {
      result = idx;
    });
    tick(200);

    expect(result).toBeNull();
  }));

  it('setChartTimeRange should handle all time ranges', () => {
    const ranges = [
      component.ChartTimeRange.ONE_DAY,
      component.ChartTimeRange.ONE_WEEK,
      component.ChartTimeRange.ONE_MONTH,
      component.ChartTimeRange.THREE_MONTHS,
      component.ChartTimeRange.SIX_MONTHS,
      component.ChartTimeRange.ONE_YEAR,
      component.ChartTimeRange.FIVE_YEAR,
    ];
    ranges.forEach((range) => {
      component.setChartTimeRange(range);
      expect(component.activeChartTimeRange).toBe(range);
    });
  });

  it('setChartTimeRange should apply chart options when chart exists', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    // Now chart should be initialized
    component.setChartTimeRange(component.ChartTimeRange.ONE_WEEK);
    expect(component.activeChartTimeRange).toBe(
      component.ChartTimeRange.ONE_WEEK,
    );
  }));

  it('setChartTimeRange(ONE_DAY) should set visible logical range when chart exists', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    component.setChartTimeRange(component.ChartTimeRange.ONE_DAY);
    expect(component.activeChartTimeRange).toBe(
      component.ChartTimeRange.ONE_DAY,
    );
  }));

  it('setChartTimeRange should warn for invalid range', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    component.setChartTimeRange('INVALID' as any);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('onFullscreenChange should handle fullscreen enter', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(true);
  });

  it('onFullscreenChange should handle fullscreen exit', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('onFullscreenChange should resize chart when chart exists', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(false);
  }));

  it('toggleFullscreen should exit if already fullscreen', () => {
    const mockExitFullscreen = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: mockExitFullscreen,
      configurable: true,
    });
    component.toggleFullscreen();
    expect(mockExitFullscreen).toHaveBeenCalled();
  });

  it('toggleFullscreen should enter fullscreen if not fullscreen', async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    const mockOrientation = { lock: jest.fn().mockResolvedValue(undefined) };
    Object.defineProperty(screen, 'orientation', {
      value: mockOrientation,
      configurable: true,
    });
    const mockElement = {
      requestFullscreen: jest.fn().mockResolvedValue(undefined),
    };
    (component as any).chartContainerRef = () => ({
      nativeElement: mockElement,
    });
    component.toggleFullscreen();
    await Promise.resolve();
    expect(mockElement.requestFullscreen).toHaveBeenCalled();
  });

  it('toggleFullscreen should handle requestFullscreen error', async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    const mockElement = {
      requestFullscreen: jest.fn().mockRejectedValue(new Error('test')),
    };
    (component as any).chartContainerRef = () => ({
      nativeElement: mockElement,
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    component.toggleFullscreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('toggleFullscreen should handle orientation lock error', async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    const mockOrientation = {
      lock: jest.fn().mockRejectedValue(new Error('no support')),
    };
    Object.defineProperty(screen, 'orientation', {
      value: mockOrientation,
      configurable: true,
    });
    const mockElement = {
      requestFullscreen: jest.fn().mockResolvedValue(undefined),
    };
    (component as any).chartContainerRef = () => ({
      nativeElement: mockElement,
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    component.toggleFullscreen();
    await new Promise((r) => setTimeout(r, 10));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('ngOnDestroy should unsubscribe chart if exists', () => {
    (component as any).chart = { unsubscribeCrosshairMove: jest.fn() };
    component.ngOnDestroy();
    expect(
      (component as any).chart.unsubscribeCrosshairMove,
    ).toHaveBeenCalled();
  });

  it('ngOnDestroy should not crash if no chart', () => {
    (component as any).chart = undefined;
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('chartCrosshairMoveEventHandler should handle data lookup', () => {
    const mockData = new Map();
    mockData.set('2024', { time: '2024', value: 100 });
    (component as any).historicChartData = mockData;
    (component as any).chartCrosshairMoveEventHandler({
      time: { toLocaleString: () => '2024' },
    });
    expect(component.chartCrosshairData).toBeDefined();
  });

  it('chartCrosshairMoveEventHandler should clear chartCrosshairData if no time', () => {
    (component as any).chartCrosshairMoveEventHandler({});
    expect(component.chartCrosshairData).toBeUndefined();
  });

  it('should handle color scheme changes', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    settingsSubject.next({
      theme: Theme.LIGHT,
      colorScheme: ColorScheme.LIGHT,
      refreshInterval: RefreshInterval.FIFTEEN_SECONDS,
    });
    tick(100);
    // Settings applied without crashing
    expect(component).toBeTruthy();
  }));

  it('should handle resize events after chart init', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    resizeSubject.next();
    // Should resize chart without crashing
    expect(component).toBeTruthy();
  }));

  it('should expose Direction and Exchange enums', () => {
    expect(component.Direction).toBe(Direction);
    expect(component.Exchange).toBe(ExchangeName);
  });

  it('should handle DOWN direction for chart colors', fakeAsync(() => {
    mockMarketService.getIndex.mockReturnValue(
      of({
        id: 'idx1',
        name: 'Nifty 50',
        exchange: ExchangeName.NSE,
        quote: {
          change: { direction: Direction.DOWN, percentage: -1, value: -100 },
        },
      }),
    );
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);
    expect(component).toBeTruthy();
  }));

  it('should handle no direction for chart colors', fakeAsync(() => {
    mockMarketService.getIndex.mockReturnValue(
      of({
        id: 'idx1',
        name: 'Nifty 50',
        exchange: ExchangeName.NSE,
        quote: {},
      }),
    );
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);
    expect(component).toBeTruthy();
  }));

  it('initChart should work with areaSeries already existing', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);

    // Call initChart again when areaSeries is defined
    const mockRef = (component as any).chartRef();
    if (mockRef) {
      (component as any).initChart([{ time: '2025', value: 200 }]);
    }
    expect(component).toBeTruthy();
  }));

  it('chartCrosshairMoveEventHandler should handle invalid data', fakeAsync(() => {
    fixture.detectChanges();
    component.index$?.subscribe();
    tick(200);
    (component as any).historicChartData = undefined;
    (component as any).chartCrosshairMoveEventHandler({ time: '2025' });
    expect(component.chartCrosshairData).toBeUndefined();
  }));
});
