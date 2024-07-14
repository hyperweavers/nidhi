import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  ViewChild,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  createChart,
} from 'lightweight-charts';
import {
  Observable,
  combineLatest,
  delay,
  distinctUntilKeyChanged,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { Constants } from '../../constants';
import { ChartData } from '../../models/chart';
import { Index } from '../../models/index';
import { ColorScheme } from '../../models/settings';
import { Direction, ExchangeName } from '../../models/stock';
import {
  ChartCategory,
  MarketService,
} from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { ChartUtils } from '../../utils/chart.utils';

enum ChartTimeRange {
  // ONE_DAY = '1D', // TODO: Enable when intra day chart data is implemented
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  ONE_YEAR = '1Y',
  FIVE_YEAR = '5Y',
}

@UntilDestroy()
@Component({
  selector: 'app-indices',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './indices.page.html',
  styleUrl: './indices.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicesPage implements OnDestroy {
  @ViewChild('chartContainer') private chartContainerRef?: ElementRef;
  @ViewChild('chart') private chartRef?: ElementRef;

  public readonly exchange = input<string>('');
  public readonly id = input<string>('');

  public index$: Observable<Index | null>;

  public chartCrosshairData?: ChartData;

  public activeChartTimeRange = ChartTimeRange.FIVE_YEAR; // TODO: Set the value as 1 day when intra day chart data is implemented
  public activeExchange = ExchangeName.NSE;

  public isChartLoading = true;
  public isChartInFullscreen = false;

  public readonly Routes = Constants.routes;
  public readonly Exchange = ExchangeName;
  public readonly Direction = Direction;
  public readonly ChartTimeRange = ChartTimeRange;

  private chartData?: Map<string | number, ChartData>;
  private chart?: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areaSeries?: ISeriesApi<any>;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    marketService: MarketService,
    settingsService: SettingsService,
  ) {
    this.index$ = combineLatest([
      toObservable(this.exchange),
      toObservable(this.id),
    ]).pipe(
      switchMap(([exchange, id]) =>
        marketService.getIndex(id, exchange as ExchangeName, true),
      ),
      tap((index) => {
        if (index && !this.chart) {
          marketService
            .getHistoricalChart(
              index.vendorCode.etm.symbol,
              ChartCategory.INDEX,
            )
            .pipe(delay(100), take(1)) // A delay of 100ms is added to let Angular run change detection and update chart container element ref.
            .subscribe((data) => {
              if (data.length > 0) {
                this.chartData = data.reduce(
                  (map, obj): Map<string | number, ChartData> => {
                    map.set(obj.time, obj);
                    return map;
                  },
                  new Map<string | number, ChartData>(),
                );

                this.initChart(data);

                if (this.areaSeries) {
                  this.areaSeries.applyOptions({
                    lineColor: index.quote?.change?.direction
                      ? index.quote.change.direction === Direction.UP
                        ? '#22c55e'
                        : '#ef4444'
                      : '#2962FF',
                    topColor: index.quote?.change?.direction
                      ? index.quote.change.direction === Direction.UP
                        ? 'rgba(34, 197, 94, 0.4)'
                        : 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(41, 98, 255, 0.4)',
                    bottomColor: index.quote?.change?.direction
                      ? index.quote.change.direction === Direction.UP
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(41, 98, 255, 0.1)',
                  });
                }

                cdr.markForCheck();

                settingsService.resize$
                  .pipe(untilDestroyed(this))
                  .subscribe(() => {
                    if (this.chart && this.chartRef) {
                      this.chart.resize(
                        this.chartRef.nativeElement.offsetWidth,
                        this.chartRef.nativeElement.offsetHeight,
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
                          borderColor:
                            colorScheme === ColorScheme.DARK
                              ? '#374151'
                              : '#E5E7EB',
                        },
                        rightPriceScale: {
                          borderColor:
                            colorScheme === ColorScheme.DARK
                              ? '#374151'
                              : '#E5E7EB',
                        },
                        leftPriceScale: {
                          borderColor:
                            colorScheme === ColorScheme.DARK
                              ? '#374151'
                              : '#E5E7EB',
                        },
                        overlayPriceScales: {
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
              }
            });
        }
      }),
    );
  }

  public setChartTimeRange(range: ChartTimeRange): void {
    if (range) {
      this.activeChartTimeRange = range;

      const to = new Date();
      let from!: number;

      switch (range) {
        // TODO: Enable when intra day chart data is implemented
        // case ChartTimeRange.ONE_DAY:
        //   from = +to.toLocaleDateString();
        //   break;

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
        this.chart.timeScale().setVisibleRange({
          from: ChartUtils.epochToUtcTimestamp(from),
          to: ChartUtils.epochToUtcTimestamp(to.getTime()),
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

    if (this.chart && this.chartRef) {
      this.chart.resize(
        this.chartRef.nativeElement.offsetWidth,
        this.chartRef.nativeElement.offsetHeight,
      );

      this.chart.timeScale().fitContent();

      this.setChartTimeRange(this.activeChartTimeRange);
    }
  }

  public toggleFullscreen(): void {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen();
    } else {
      if (this.chartContainerRef) {
        this.chartContainerRef.nativeElement
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
    if (this.chartRef?.nativeElement && data?.length > 0) {
      this.chart = createChart(this.chartRef.nativeElement, {
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
      });

      this.areaSeries = this.chart.addAreaSeries({
        lineWidth: 1,
      });

      this.areaSeries.setData(data);

      this.chart.timeScale().fitContent();

      this.chart.subscribeCrosshairMove(
        this.chartCrosshairMoveEventHandler.bind(this),
      );

      this.isChartLoading = false;
    }
  }

  private chartCrosshairMoveEventHandler({ time }: MouseEventParams) {
    if (time && this.chartData && this.chartData.size > 0) {
      this.chartCrosshairData = this.chartData.get(time.toLocaleString());
    } else {
      this.chartCrosshairData = undefined;
    }

    this.cdr.markForCheck();
  }
}
