import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  AreaSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  LineType,
} from 'lightweight-charts';
import {
  delay,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  Observable,
  switchMap,
  tap,
} from 'rxjs';

import { ChartData, Period } from '../../models/chart';
import { Kpi } from '../../models/kpi';
import { Direction, Status } from '../../models/market';
import { ColorScheme } from '../../models/settings';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { DashboardService } from '../../services/dashboard.service';
import { MarketUtils } from '../../utils/market.utils';

@UntilDestroy()
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, ValueOrPlaceholderPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly chartContainerRef = viewChild<ElementRef>('chartContainer');
  private readonly chartRef = viewChild<ElementRef>('chart');

  public kpi$: Observable<Kpi>;

  public readonly activeChartPeriod = signal<Period>(Period.ONE_DAY);

  public isChartLoading = true;
  public isChartInFullscreen = false;
  public isChartNoData = false;

  public readonly Direction = Direction;
  public readonly Period = Period;

  private isMarketOpen = false;

  private chart?: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areaSeries?: ISeriesApi<any>;

  constructor() {
    const marketService = inject(MarketService);
    const dashboardService = inject(DashboardService);
    const settingsService = inject(SettingsService);

    marketService.marketStatus$
      .pipe(untilDestroyed(this))
      .subscribe(({ status }) => {
        this.isMarketOpen = status === Status.OPEN;
      });

    this.kpi$ = dashboardService.kpi$;

    toObservable(this.activeChartPeriod)
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
        switchMap((period) => dashboardService.getPortfolioChart(period)),
        delay(100), // A delay of 100ms is added to let Angular run change detection and update chart container element ref.
        untilDestroyed(this),
      )
      .subscribe((data) => {
        this.isChartLoading = false;
        this.isChartNoData = data.length === 0;

        if (data.length > 0) {
          this.isChartNoData = false;

          this.initChart(data);

          if (this.areaSeries) {
            const changeDirection = MarketUtils.getDirection(
              data.length > 1
                ? data[data.length - 1].value - data[0].value
                : data[0].value,
            );

            this.areaSeries.applyOptions({
              lineColor:
                changeDirection === Direction.UP ? '#22c55e' : '#ef4444',
              topColor:
                changeDirection === Direction.UP
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)',
              bottomColor:
                changeDirection === Direction.UP
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
            });
          }

          settingsService.resize$.pipe(untilDestroyed(this)).subscribe(() => {
            const chartRef = this.chartRef();
            if (this.chart && chartRef) {
              this.chart.resize(
                chartRef.nativeElement.offsetWidth,
                chartRef.nativeElement.offsetHeight,
              );

              this.chart.timeScale().fitContent();

              this.setChartPeriod(this.activeChartPeriod());
            }
          });

          settingsService.settings$
            .pipe(untilDestroyed(this), distinctUntilKeyChanged('colorScheme'))
            .subscribe(({ colorScheme }) => {
              if (colorScheme && this.chart) {
                this.chart.applyOptions({
                  layout: {
                    textColor:
                      colorScheme === ColorScheme.DARK ? '#fff' : '#111827',
                  },
                  timeScale: {
                    visible: true,
                    borderColor:
                      colorScheme === ColorScheme.DARK ? '#374151' : '#E5E7EB',
                  },
                  rightPriceScale: {
                    visible: true,
                    borderColor:
                      colorScheme === ColorScheme.DARK ? '#374151' : '#E5E7EB',
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

  public setChartPeriod(period: Period): void {
    if (period) {
      this.activeChartPeriod.set(period);
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

      this.setChartPeriod(this.activeChartPeriod());
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

  private initChart(data: ChartData[]): void {
    const chartRef = this.chartRef();
    if (chartRef?.nativeElement) {
      const intraDay = this.activeChartPeriod() === Period.ONE_DAY;

      if (!this.chart) {
        const container = chartRef.nativeElement;
        this.chart = createChart(container, {
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
            timeVisible: intraDay,
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

      this.setChartPeriod(this.activeChartPeriod());
    }
  }
}
