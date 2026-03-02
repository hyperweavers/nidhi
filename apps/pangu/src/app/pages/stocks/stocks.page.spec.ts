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
import { StocksPage } from './stocks.page';

describe('StocksPage', () => {
  let component: StocksPage;
  let fixture: ComponentFixture<StocksPage>;
  let mockMarketService: any;
  let resizeSubject: Subject<void>;
  let settingsSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    resizeSubject = new Subject<void>();
    settingsSubject = new BehaviorSubject({
      theme: Theme.SYSTEM,
      colorScheme: ColorScheme.DARK,
      refreshInterval: RefreshInterval.FIFTEEN_SECONDS,
    });

    mockMarketService = {
      marketStatus$: new BehaviorSubject({
        status: Status.OPEN,
        tradingStartTime: '',
        tradingEndTime: '',
      }),
      getStock: jest.fn().mockReturnValue(
        of({
          name: 'Test Co',
          scripCode: { nse: 'TEST', bse: '533' },
          vendorCode: { etm: { primary: 't1', chart: 'TEST-SYM' } },
          quote: {
            nse: {
              price: 100,
              change: { direction: Direction.UP, percentage: 1, value: 1 },
            },
            bse: {
              price: 100,
              change: { direction: Direction.DOWN, percentage: -1, value: -1 },
            },
          },
        }),
      ),
      getIntraDayChart: jest
        .fn()
        .mockReturnValue(of([{ time: '2024', value: 100 }])),
      getHistoricalChart: jest
        .fn()
        .mockReturnValue(of([{ time: 1700000, value: 100 }])),
    };

    await TestBed.configureTestingModule({
      imports: [StocksPage],
      providers: [
        { provide: MarketService, useValue: mockMarketService },
        {
          provide: SettingsService,
          useValue: { resize$: resizeSubject, settings$: settingsSubject },
        },
      ],
    })
      .overrideComponent(StocksPage, {
        set: { template: '<div #chartContainer><div #chart></div></div>' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(StocksPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should subscribe to stock$ and trigger chart initialization', fakeAsync(() => {
    fixture.detectChanges();
    let stockResult: any;
    component.stock$?.subscribe((s) => {
      stockResult = s;
    });
    tick(200);
    expect(stockResult).toBeTruthy();
    expect(stockResult?.name).toBe('Test Co');
    expect(mockMarketService.getIntraDayChart).toHaveBeenCalled();
  }));

  it('should handle stock without NSE scrip and set BSE exchange', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(
      of({
        name: 'BSE Co',
        scripCode: { bse: '533' },
        vendorCode: { etm: { primary: 't1', chart: 'BSE-SYM' } },
        quote: {
          bse: {
            price: 50,
            change: { direction: Direction.DOWN, percentage: -2, value: -1 },
          },
        },
      }),
    );
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(component.activeExchange).toBe(ExchangeName.BSE);
  }));

  it('should handle empty chart data', fakeAsync(() => {
    mockMarketService.getIntraDayChart.mockReturnValue(of([]));
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(component.isChartNoData).toBe(true);
  }));

  it('should handle null stock', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(of(null));
    fixture.detectChanges();
    let result: any;
    component.stock$?.subscribe((s) => {
      result = s;
    });
    tick(200);
    expect(result).toBeNull();
  }));

  it('should handle stock without any scrip codes (no chart)', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(
      of({
        name: 'No Scrip',
        scripCode: {},
        vendorCode: { etm: { primary: 't1' } },
        quote: {},
      }),
    );
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(mockMarketService.getIntraDayChart).not.toHaveBeenCalled();
  }));

  it('setChartTimeRange should handle all ranges', () => {
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

  it('setChartTimeRange should apply options when chart exists', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    component.setChartTimeRange(component.ChartTimeRange.ONE_WEEK);
    expect(component.activeChartTimeRange).toBe(
      component.ChartTimeRange.ONE_WEEK,
    );

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

  it('setExchange should set activeExchange', () => {
    component.setExchange(ExchangeName.BSE);
    expect(component.activeExchange).toBe(ExchangeName.BSE);
  });

  it('setExchange should not change if falsy', () => {
    component.activeExchange = ExchangeName.NSE;
    component.setExchange('' as any);
    expect(component.activeExchange).toBe(ExchangeName.NSE);
  });

  it('onFullscreenChange should handle enter and exit', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(true);

    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('onFullscreenChange should resize chart when chart exists', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(false);
  }));

  it('toggleFullscreen should exit if in fullscreen', () => {
    const exitFn = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      value: exitFn,
      configurable: true,
    });
    component.toggleFullscreen();
    expect(exitFn).toHaveBeenCalled();
  });

  it('toggleFullscreen should enter if not fullscreen', async () => {
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
      requestFullscreen: jest.fn().mockRejectedValue(new Error('fail')),
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

  it('chartCrosshairMoveEventHandler should handle data and no data', () => {
    const mockData = new Map();
    mockData.set('2024', { time: '2024', value: 100 });
    (component as any).historicChartData = mockData;
    (component as any).chartCrosshairMoveEventHandler({
      time: { toLocaleString: () => '2024' },
    });
    expect(component.chartCrosshairData).toBeDefined();

    (component as any).chartCrosshairMoveEventHandler({});
    expect(component.chartCrosshairData).toBeUndefined();
  });

  it('should handle color scheme changes', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    settingsSubject.next({
      theme: Theme.LIGHT,
      colorScheme: ColorScheme.LIGHT,
      refreshInterval: RefreshInterval.FIFTEEN_SECONDS,
    });
    tick(100);
    expect(component).toBeTruthy();
  }));

  it('should handle resize events after chart init', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    resizeSubject.next();
    expect(component).toBeTruthy();
  }));

  it('should handle DOWN direction for chart colors', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(
      of({
        name: 'Test',
        scripCode: { nse: 'TEST' },
        vendorCode: { etm: { primary: 't1', chart: 'T' } },
        quote: {
          nse: {
            price: 100,
            change: { direction: Direction.DOWN, percentage: -1, value: -1 },
          },
        },
      }),
    );
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(component).toBeTruthy();
  }));

  it('should handle BSE exchange for chart colors', fakeAsync(() => {
    component.activeExchange = ExchangeName.BSE;
    mockMarketService.getStock.mockReturnValue(
      of({
        name: 'Test',
        scripCode: { bse: '533' },
        vendorCode: { etm: { primary: 't1', chart: 'T' } },
        quote: {
          bse: {
            price: 50,
            change: { direction: Direction.UP, percentage: 1, value: 1 },
          },
        },
      }),
    );
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(component).toBeTruthy();
  }));

  it('should handle no direction for chart colors', fakeAsync(() => {
    mockMarketService.getStock.mockReturnValue(
      of({
        name: 'Test',
        scripCode: { nse: 'TEST' },
        vendorCode: { etm: { primary: 't1', chart: 'T' } },
        quote: { nse: { price: 100 } },
      }),
    );
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    expect(component).toBeTruthy();
  }));

  it('should expose Direction and ExchangeName enums', () => {
    expect(component.Direction).toBe(Direction);
    expect(component.ExchangeName).toBe(ExchangeName);
  });

  it('should handle market status CLOSED', () => {
    (mockMarketService.marketStatus$ as BehaviorSubject<any>).next({
      status: Status.CLOSED,
    });
    fixture.detectChanges();
    expect((component as any).isMarketOpen).toBe(false);
  });

  it('should cover historic chart path and data mapping', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);

    // Switch to 1 week (historic)
    component.setChartTimeRange(component.ChartTimeRange.ONE_WEEK);
    tick(200); // allow switchMap and delay(100)

    expect(mockMarketService.getHistoricalChart).toHaveBeenCalled();
    expect(component.isChartLoading).toBe(false);
  }));

  it('should handle window resize with chart resize', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);

    // Mock chart and element for resize
    (component as any).chart = {
      resize: jest.fn(),
      applyOptions: jest.fn(),
      timeScale: () => ({
        fitContent: jest.fn(),
        setVisibleLogicalRange: jest.fn(),
        setVisibleRange: jest.fn(),
      }),
      subscribeCrosshairMove: jest.fn(),
      unsubscribeCrosshairMove: jest.fn(),
      clearCrosshairPosition: jest.fn(),
    };
    (component as any).chartRef = () => ({
      nativeElement: { offsetWidth: 100, offsetHeight: 100 },
    });

    resizeSubject.next();
    tick(10);
    expect((component as any).chart.resize).toHaveBeenCalled();
  }));

  it('initChart should handle open market and intra-day', fakeAsync(() => {
    (component as any).isMarketOpen = true;
    (component as any).showIntraDayChart$.next(true);
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    (component as any).initChart([{ time: '2025', value: 200 }]);
    expect(component).toBeTruthy();
  }));

  it('chartCrosshairMoveEventHandler should handle missing data', fakeAsync(() => {
    fixture.detectChanges();
    component.stock$?.subscribe();
    tick(200);
    (component as any).historicChartData = undefined;
    (component as any).chartCrosshairMoveEventHandler({ time: '2025' });
    expect(component.chartCrosshairData).toBeUndefined();
  }));
});
