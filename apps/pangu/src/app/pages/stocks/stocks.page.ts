import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LOGGER } from '@nidhi/shared-logger';
import {
  AreaSeries,
  IChartApi,
  ISeriesApi,
  LineType,
  MouseEventParams,
  createChart,
} from 'lightweight-charts';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  delay,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { Constants } from '../../constants';
import { ChartCategory, ChartData, Period } from '../../models/chart';
import { Direction, ExchangeName, Status } from '../../models/market';
import { ColorScheme } from '../../models/settings';
import { Stock } from '../../models/stock';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { PortfolioService } from '../../services/portfolio.service';
import { ChartUtils } from '../../utils/chart.utils';

@UntilDestroy()
@Component({
  selector: 'app-stocks',
  imports: [CommonModule, RouterLink, ValueOrPlaceholderPipe],
  templateUrl: './stocks.page.html',
  styleUrl: './stocks.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksPage implements OnDestroy {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly logger = inject(LOGGER);

  private readonly chartContainerRef = viewChild<ElementRef>('chartContainer');
  private readonly chartRef = viewChild<ElementRef>('chart');

  public readonly id = input<string>('');

  public stock$: Observable<Stock | null>;
  public isInPortfolio$?: Observable<boolean>;

  public chartCrosshairData?: ChartData;

  public activeChartTimeRange = Period.ONE_DAY;
  public activeExchange = ExchangeName.NSE;

  public isChartLoading = true;
  public isChartInFullscreen = false;
  public isChartNoData = false;

  public readonly ExchangeName = ExchangeName;
  public readonly Direction = Direction;
  public readonly ChartTimeRange = Period;
  public readonly Routes = Constants.routes;

  private showIntraDayChart$ = new BehaviorSubject<boolean>(true);

  private isMarketOpen = false;

  private colorScheme = ColorScheme.DARK;

  private historicChartData?: Map<string | number, ChartData>;
  private chart?: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areaSeries?: ISeriesApi<any>;
  private readonly boundCrosshairHandler =
    this.chartCrosshairMoveEventHandler.bind(this);

  constructor() {
    const marketService = inject(MarketService);
    const settingsService = inject(SettingsService);
    const portfolioService = inject(PortfolioService);

    this.isInPortfolio$ = toObservable(this.id).pipe(
      switchMap((id) =>
        portfolioService.portfolio$.pipe(
          map(
            (portfolio) =>
              !!id &&
              portfolio.holdings.some((h) => h.vendorCode.etm.primary === id && h.quantity > 0),
          ),
        ),
      ),
    );

    marketService.marketStatus$
      .pipe(untilDestroyed(this))
      .subscribe(({ status }) => {
        this.isMarketOpen = status === Status.OPEN;

        this.cdr.markForCheck();
      });

    settingsService.resize$.pipe(untilDestroyed(this)).subscribe(() => {
      const chartRef = this.chartRef();
      if (this.chart && chartRef) {
        this.chart.resize(
          chartRef.nativeElement.offsetWidth,
          chartRef.nativeElement.offsetHeight,
        );

        this.chart.timeScale().fitContent();

        this.setChartTimeRange(this.activeChartTimeRange);
      }
    });

    settingsService.settings$
      .pipe(untilDestroyed(this), distinctUntilKeyChanged('colorScheme'))
      .subscribe(({ colorScheme }) => {
        this.colorScheme = colorScheme;

        if (colorScheme && this.chart) {
          ChartUtils.applyChartColorScheme(this.chart, colorScheme);
        }
      });

    this.stock$ = toObservable(this.id).pipe(
      switchMap((id) => marketService.getStock(id, true)),
      tap((stock) => {
        if (stock) {
          if (stock.scripCode.nse) {
            this.activeExchange = ExchangeName.NSE;
          } else {
            this.activeExchange = ExchangeName.BSE;
          }
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    combineLatest([
      this.stock$.pipe(
        filter(
          (stock): stock is Stock =>
            !!stock && !!(stock.scripCode.nse || stock.scripCode.bse),
        ),
      ),
      this.showIntraDayChart$.pipe(distinctUntilChanged()),
    ])
      .pipe(
        tap(() => {
          if (this.chart) {
            this.chart.clearCrosshairPosition();
            this.chart.applyOptions({
              timeScale: {
                visible: false,
              },
              rightPriceScale: {
                visible: false,
              },
            });
            if (this.areaSeries) {
              this.areaSeries.setData([]);
            }
          }
          this.isChartLoading = true;
        }),
        switchMap(([stock, isIntraDay]) => {
          const scripCode =
            (this.activeExchange === ExchangeName.NSE
              ? stock.scripCode.nse
              : stock.scripCode.bse) || '';

          const chartData$ = isIntraDay
            ? marketService.getIntraDayChart(scripCode, ChartCategory.STOCK)
            : marketService
                .getHistoricalChart(
                  stock.vendorCode.etm.chart || '',
                  ChartCategory.STOCK,
                )
                .pipe(
                  tap((data) => {
                    if (data.length > 0) {
                      this.historicChartData = data.reduce(
                        (map, obj): Map<string | number, ChartData> => {
                          map.set(obj.time, obj);
                          return map;
                        },
                        new Map<string | number, ChartData>(),
                      );
                    }
                  }),
                  take(1),
                );

          return chartData$.pipe(map((data) => ({ data, stock })));
        }),
        delay(100),
        untilDestroyed(this),
      )
      .subscribe(({ data, stock }) => {
        if (data.length > 0 && stock) {
          this.isChartNoData = false;

          if (!this.chart) {
            this.initChart(data);
          } else if (this.areaSeries) {
            this.areaSeries.setData(data);
          }

          const direction =
            this.activeExchange === ExchangeName.NSE
              ? stock.quote?.nse?.change?.direction
              : stock.quote?.bse?.change?.direction;

          if (this.areaSeries) {
            this.areaSeries.applyOptions({
              lineColor: direction
                ? direction === Direction.UP
                  ? '#22c55e'
                  : '#ef4444'
                : '#2962FF',
              topColor: direction
                ? direction === Direction.UP
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)'
                : 'rgba(41, 98, 255, 0.4)',
              bottomColor: direction
                ? direction === Direction.UP
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)'
                : 'rgba(41, 98, 255, 0.1)',
            });
          }

          if (this.chart) {
            ChartUtils.applyChartColorScheme(this.chart, this.colorScheme);
          }
        } else {
          this.isChartNoData = true;
        }

        this.isChartLoading = false;
        this.cdr.markForCheck();
      });
  }

  public setChartTimeRange(range: Period): void {
    if (range) {
      this.activeChartTimeRange = range;

      this.showIntraDayChart$.next(range === Period.ONE_DAY);

      if (range !== Period.ONE_DAY) {
        const to = new Date();
        let from!: number;

        switch (range) {
          case Period.ONE_WEEK:
            from = ChartUtils.getTimestampSince(to, 10); // 10 days considered as one week as it includes weekend
            break;

          case Period.ONE_MONTH:
            from = ChartUtils.getTimestampSince(to, 30);
            break;

          case Period.THREE_MONTHS:
            from = ChartUtils.getTimestampSince(to, 90);
            break;

          case Period.SIX_MONTHS:
            from = ChartUtils.getTimestampSince(to, 180);
            break;

          case Period.ONE_YEAR:
            from = ChartUtils.getTimestampSince(to, 365);
            break;

          case Period.FIVE_YEAR:
            from = ChartUtils.getTimestampSince(to, 5 * 365);
            break;

          default:
            this.logger.warn(`Invalid range: ${range}`);
        }

        if (this.chart && from > 0) {
          this.chart.applyOptions({
            timeScale: {
              timeVisible: false,
            },
          });

          if (this.areaSeries) {
            this.areaSeries.applyOptions({
              lastPriceAnimation: 0,
            });
          }

          if (this.areaSeries && this.areaSeries.data().length > 0) {
            this.chart.timeScale().setVisibleRange({
              from: ChartUtils.epochToUtcTimestamp(from),
              to: ChartUtils.epochToUtcTimestamp(to.getTime()),
            });
          }
        }

        return;
      }

      if (this.chart) {
        this.chart.applyOptions({
          timeScale: {
            timeVisible: true,
          },
        });

        if (this.areaSeries) {
          this.areaSeries.applyOptions({
            lastPriceAnimation: this.isMarketOpen ? 1 : 0,
          });
        }

        this.chart.timeScale().setVisibleLogicalRange({
          from: 0,
          to: 375, // Minutes between 9:15 AM to 3:30 PM
        });
      }
    }
  }

  public setExchange(exchange: ExchangeName): void {
    if (exchange) {
      this.activeExchange = exchange;
    }
  }

  @HostListener('window:fullscreenchange')
  public onFullscreenChange(): void {
    if (this.document.fullscreenElement) {
      this.isChartInFullscreen = true;
    } else {
      this.isChartInFullscreen = false;
    }

    const chartRef = this.chartRef();
    if (this.chart && chartRef) {
      this.chart.resize(
        chartRef.nativeElement.offsetWidth,
        chartRef.nativeElement.offsetHeight,
      );

      this.chart.timeScale().fitContent();

      this.setChartTimeRange(this.activeChartTimeRange);
    }
  }

  public toggleFullscreen(): void {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen();
    } else {
      const chartContainerRef = this.chartContainerRef();
      if (chartContainerRef) {
        chartContainerRef.nativeElement
          .requestFullscreen()
          .then(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (screen.orientation as any)
              .lock('landscape')
              .catch((error: Error) => {
                this.logger.error(
                  `An error occurred while trying to lock screen orientation to landscape: ${error.message} (${error.name})`,
                );
              });

            this.cdr.markForCheck();
          })
          .catch((error: Error) => {
            this.logger.error(
              `An error occurred while trying to switch into fullscreen mode: ${error.message} (${error.name})`,
            );
          });
      }
    }
  }

  public ngOnDestroy(): void {
    if (this.chart) {
      this.chart.unsubscribeCrosshairMove(this.boundCrosshairHandler);
    }
  }

  private initChart(data: ChartData[]): void {
    const chartRef = this.chartRef();
    if (chartRef?.nativeElement) {
      const intraDay = this.showIntraDayChart$.getValue();

      if (!this.chart) {
        this.chart = createChart(chartRef.nativeElement, {
          layout: {
            attributionLogo: false,
            background: { color: 'transparent' },
          },
          grid: {
            horzLines: {
              visible: false,
            },
            vertLines: {
              visible: false,
            },
          },
          handleScroll: false, // TODO: Fix time scale not re-rending issue before enable scrolling
          handleScale: false,
          timeScale: {
            lockVisibleTimeRangeOnResize: true,
            secondsVisible: false,
          },
        });
      }

      this.chart.applyOptions({
        timeScale: {
          timeVisible: intraDay,
        },
      });

      if (!this.areaSeries) {
        this.areaSeries = this.chart.addSeries(AreaSeries, {
          lineWidth: 1,
          lineType: LineType.Curved,
        });
      }

      this.areaSeries.applyOptions({
        lastPriceAnimation: this.isMarketOpen && intraDay ? 1 : 0,
      });

      this.areaSeries.setData(data);

      this.chart.timeScale().fitContent();

      this.setChartTimeRange(this.activeChartTimeRange);

      this.chart.subscribeCrosshairMove(this.boundCrosshairHandler);
    }
  }

  private chartCrosshairMoveEventHandler({ time }: MouseEventParams): void {
    if (time && this.historicChartData && this.historicChartData.size > 0) {
      const key =
        typeof time === 'object'
          ? `${time.year}-${time.month}-${time.day}`
          : time;

      this.chartCrosshairData = this.historicChartData.get(key);

      // FIXME: Add a debounce to avoid max call stack error. After the fix, remove setting lineColor in chart data (at service level)
      // if (this.areaSeries && this.chartCrosshairData?.change?.direction) {
      //   this.areaSeries.applyOptions({
      //     crosshairMarkerBackgroundColor: this.chartCrosshairData.change.direction === Direction.UP ? '#22c55e' : '#ef4444',
      //   });
      // }
    } else {
      this.chartCrosshairData = undefined;
    }

    this.cdr.markForCheck();
  }
}
