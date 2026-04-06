import { CommonModule, DecimalPipe } from '@angular/common';
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
import { ChartConfiguration, ChartData as DoughnutChartData } from 'chart.js';
import {
  AreaSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  LineType,
} from 'lightweight-charts';
import { BaseChartDirective } from 'ng2-charts';
import {
  combineLatest,
  delay,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  Observable,
  switchMap,
  tap,
} from 'rxjs';

import { ChartData, ChartType, Period } from '../../models/chart';
import { Kpi } from '../../models/kpi';
import { Direction, Status } from '../../models/market';
import { ColorScheme } from '../../models/settings';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { SettingsService } from '../../services/core/settings.service';
import { DashboardService } from '../../services/dashboard.service';
import { ChartUtils } from '../../utils/chart.utils';
import { MarketUtils } from '../../utils/market.utils';

@UntilDestroy()
@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    ValueOrPlaceholderPipe,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DecimalPipe],
})
export class DashboardPage {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly decimalPipe = inject(DecimalPipe);

  private readonly portfolioCompositionChart = viewChild(BaseChartDirective);

  private readonly portfolioPerformanceChartContainerRef =
    viewChild<ElementRef>('portfolioPerformanceChartContainer');
  private readonly portfolioPerformanceChartRef = viewChild<ElementRef>(
    'portfolioPerformanceChart',
  );

  public kpi$: Observable<Kpi>;

  public readonly activeChartPeriod = signal<Period>(Period.ONE_DAY);

  public isPortfolioPerformanceChartLoading = true;
  public isPortfolioPerformanceChartInFullscreen = false;
  public isPortfolioPerformanceChartNoData = false;

  public portfolioCompositionChartData: DoughnutChartData<
    ChartType.DOUGHNUT,
    number[],
    string | string[]
  > = {
    datasets: [
      {
        ...ChartUtils.defaultDoughnutChartDataset,
        borderWidth: 1,
        hoverOffset: 25,
      },
    ],
  };

  public portfolioCompositionChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    ChartUtils.getDoughnutChartOptions(false, 55, (context) => {
      const transformedValue = this.decimalPipe.transform(
        context.parsed,
        '1.2-2',
      );

      return transformedValue ? `${transformedValue}%` : '';
    });

  public readonly Direction = Direction;
  public readonly Period = Period;
  public readonly ChartType = ChartType;

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

          this.isPortfolioPerformanceChartLoading = true;
        }),
        switchMap((period) => dashboardService.getPortfolioChart(period)),
        delay(100), // A delay of 100ms is added to let Angular run change detection and update chart container element ref.
        untilDestroyed(this),
      )
      .subscribe((data) => {
        this.isPortfolioPerformanceChartLoading = false;
        this.isPortfolioPerformanceChartNoData = data.length === 0;

        if (data.length > 0) {
          this.isPortfolioPerformanceChartNoData = false;

          this.initPortfolioPerformanceChart(data);

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
            const chartRef = this.portfolioPerformanceChartRef();
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
          this.isPortfolioPerformanceChartNoData = true;
        }

        this.isPortfolioPerformanceChartLoading = false;
        this.cdr.markForCheck();
      });

    combineLatest([
      dashboardService.getPortfolioComposition(),
      settingsService.settings$.pipe(distinctUntilKeyChanged('colorScheme')),
    ])
      .pipe(untilDestroyed(this))
      .subscribe(([{ weight, stocks }, { colorScheme }]) => {
        const colors = ChartUtils.generateChartColors(
          stocks.length,
          colorScheme,
        );

        this.updatePortfolioCompositionChart(weight, stocks, colors);
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
      this.isPortfolioPerformanceChartInFullscreen = true;
    } else {
      this.isPortfolioPerformanceChartInFullscreen = false;
    }

    const chartRef = this.portfolioPerformanceChartRef();
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
      const chartContainerRef = this.portfolioPerformanceChartContainerRef();
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

  private initPortfolioPerformanceChart(data: ChartData[]): void {
    const chartRef = this.portfolioPerformanceChartRef();
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

  private updatePortfolioCompositionChart(
    data: number[],
    labels: string[],
    colors: string[],
  ) {
    if (data.length > 0) {
      this.portfolioCompositionChartData.datasets[0].data = data;
    }

    if (labels.length > 0) {
      this.portfolioCompositionChartData.labels = labels;
    }

    if (colors.length > 0) {
      this.portfolioCompositionChartData.datasets[0].backgroundColor = colors;
    }

    // Refresh the chart
    if (data.length > 0 || labels.length > 0) {
      const chart = this.portfolioCompositionChart();
      if (chart) {
        chart.update();
      }
    }
  }
}
