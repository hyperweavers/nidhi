import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  OnDestroy,
  Signal,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  createChart,
} from 'lightweight-charts';
import {
  BehaviorSubject,
  Observable,
  delay,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { Constants } from '../../constants';
import { ChartData } from '../../models/chart';
import { Currency } from '../../models/currency';
import { Direction, Status } from '../../models/market';
import { Plan } from '../../models/plan';
import { ColorScheme } from '../../models/settings';
import { Stock } from '../../models/stock';
import { MarketService } from '../../services/core/market.service';
import { PlanService } from '../../services/core/plan.service';
import { SettingsService } from '../../services/core/settings.service';
import { ChartUtils } from '../../utils/chart.utils';

enum ChartTimeRange {
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  ONE_YEAR = '1Y',
  FIVE_YEAR = '5Y',
}

@UntilDestroy()
@Component({
  selector: 'app-stocks',
  imports: [CommonModule],
  templateUrl: './stocks.page.html',
  styleUrl: './stocks.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksPage implements OnDestroy {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly marketService = inject(MarketService);
  readonly settingsService = inject(SettingsService);
  readonly planService = inject(PlanService);

  private readonly chartContainerRef = viewChild<ElementRef>('chartContainer');
  private readonly chartRef = viewChild<ElementRef>('chart');

  public readonly id = input<string>('');

  public stock$: Observable<Stock | null>;

  private plan: Signal<Plan | undefined>;
  public contributionCurrency: Signal<Currency | undefined> = computed(
    () => this.plan()?.currencies.purchase,
  );

  public chartCrosshairData?: ChartData;

  public activeChartTimeRange = ChartTimeRange.ONE_DAY;

  public isChartLoading = true;
  public isChartInFullscreen = false;
  public isChartNoData = false;

  public readonly Direction = Direction;
  public readonly ChartTimeRange = ChartTimeRange;
  public readonly NO_VALUE_PLACEHOLDER = Constants.placeholders.NO_VALUE;

  private showIntraDayChart$ = new BehaviorSubject<boolean>(true);

  private isMarketOpen = false;

  private historicChartData?: Map<string | number, ChartData>;
  private chart?: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areaSeries?: ISeriesApi<any>;

  constructor() {
    const marketService = this.marketService;
    const settingsService = this.settingsService;
    const planService = this.planService;

    marketService.marketStatus$
      .pipe(untilDestroyed(this))
      .subscribe(({ status }) => {
        this.isMarketOpen = status === Status.OPEN;
      });

    this.stock$ = toObservable(this.id).pipe(
      switchMap((id) => marketService.getStock(id)),
      tap((stock) => {
        if (stock && !this.chart && stock.vendorCode.mc.primary) {
          const intraDayChart$ = marketService.getIntraDayChart(
            stock.vendorCode.mc.primary,
          );

          const historicChart$ = marketService
            .getHistoricalChart(stock.vendorCode.mc.primary)
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
            );

          this.showIntraDayChart$
            .pipe(
              distinctUntilChanged(),
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
              switchMap((val) =>
                val
                  ? intraDayChart$.pipe(untilDestroyed(this))
                  : historicChart$.pipe(take(1)),
              ),
            )
            .pipe(
              delay(100), // A delay of 100ms is added to let Angular run change detection and update chart container element ref.
            )
            .subscribe((data) => {
              if (data.length > 0) {
                this.isChartNoData = false;

                this.initChart(data);

                if (this.areaSeries) {
                  const direction = stock.quote?.change?.direction;

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

                settingsService.resize$
                  .pipe(untilDestroyed(this))
                  .subscribe(() => {
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
                  .pipe(
                    untilDestroyed(this),
                    distinctUntilKeyChanged('colorScheme'),
                  )
                  .subscribe(({ colorScheme }) => {
                    if (colorScheme && this.chart) {
                      this.chart.applyOptions({
                        layout: {
                          textColor:
                            colorScheme === ColorScheme.DARK
                              ? '#fff'
                              : '#111827',
                        },
                        timeScale: {
                          visible: true,
                          borderColor:
                            colorScheme === ColorScheme.DARK
                              ? '#374151'
                              : '#E5E7EB',
                        },
                        rightPriceScale: {
                          visible: true,
                          borderColor:
                            colorScheme === ColorScheme.DARK
                              ? '#374151'
                              : '#E5E7EB',
                        },
                        crosshair: {
                          horzLine: {
                            labelBackgroundColor:
                              colorScheme === ColorScheme.DARK
                                ? '#111827'
                                : '#f3f4f6',
                          },
                          vertLine: {
                            labelBackgroundColor:
                              colorScheme === ColorScheme.DARK
                                ? '#111827'
                                : '#f3f4f6',
                          },
                        },
                      });
                    }
                  });
              } else {
                this.isChartNoData = true;
              }

              this.isChartLoading = false;
              this.cdr.markForCheck();
            });
        }
      }),
    );

    this.plan = toSignal<Plan | undefined>(planService.plan$);
  }

  public setChartTimeRange(range: ChartTimeRange): void {
    if (range) {
      this.activeChartTimeRange = range;

      this.showIntraDayChart$.next(range === ChartTimeRange.ONE_DAY);

      if (range !== ChartTimeRange.ONE_DAY) {
        const to = new Date();
        let from!: number;

        switch (range) {
          case ChartTimeRange.ONE_WEEK:
            from = ChartUtils.getTimestampSince(to, 10); // 10 days considered as one week as it includes weekend
            break;

          case ChartTimeRange.ONE_MONTH:
            from = ChartUtils.getTimestampSince(to, 30);
            break;

          case ChartTimeRange.THREE_MONTHS:
            from = ChartUtils.getTimestampSince(to, 90);
            break;

          case ChartTimeRange.SIX_MONTHS:
            from = ChartUtils.getTimestampSince(to, 180);
            break;

          case ChartTimeRange.ONE_YEAR:
            from = ChartUtils.getTimestampSince(to, 365);
            break;

          case ChartTimeRange.FIVE_YEAR:
            from = ChartUtils.getTimestampSince(to, 5 * 356);
            break;

          default:
            console.warn(`Invalid range: ${range}`);
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
                console.error(
                  `An error occurred while trying to lock screen orientation to landscape: ${error.message} (${error.name})`,
                );
              });

            this.cdr.markForCheck();
          })
          .catch((error: Error) => {
            console.error(
              `An error occurred while trying to switch into fullscreen mode: ${error.message} (${error.name})`,
            );
          });
      }
    }
  }

  public ngOnDestroy(): void {
    if (this.chart) {
      this.chart.unsubscribeCrosshairMove(
        this.chartCrosshairMoveEventHandler.bind(this),
      );
    }
  }

  private initChart(data: ChartData[]): void {
    const chartRef = this.chartRef();
    if (chartRef?.nativeElement) {
      const intraDay = this.showIntraDayChart$.getValue();

      if (!this.chart) {
        this.chart = createChart(chartRef.nativeElement, {
          layout: {
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
            timeVisible: intraDay,
            secondsVisible: false,
          },
        });
      }

      if (!this.areaSeries) {
        this.areaSeries = this.chart.addAreaSeries({
          lineWidth: 1,
          lastPriceAnimation: this.isMarketOpen && intraDay ? 1 : 0,
        });
      }

      this.areaSeries.setData(data);

      this.setChartTimeRange(this.activeChartTimeRange);

      this.chart.subscribeCrosshairMove(
        this.chartCrosshairMoveEventHandler.bind(this),
      );
    }
  }

  private chartCrosshairMoveEventHandler({ time }: MouseEventParams): void {
    if (time && this.historicChartData && this.historicChartData.size > 0) {
      this.chartCrosshairData = this.historicChartData.get(
        time.toLocaleString(),
      );

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
