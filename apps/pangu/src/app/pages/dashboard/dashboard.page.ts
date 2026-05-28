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
import { LOGGER } from '@nidhi/shared-logger';
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
  private readonly logger = inject(LOGGER);

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

  public isPortfolioCompositionChartLoading = true;
  public isPortfolioCompositionChartNoData = false;

  public portfolioCompositionChartData: DoughnutChartData<
    ChartType.DOUGHNUT,
    number[],
    string | string[]
  > = {
    labels: [[], [], []],
    datasets: [
      {
        ...ChartUtils.defaultDoughnutChartDataset,
        borderWidth: 1,
        weight: 3,
      },
      {
        ...ChartUtils.defaultDoughnutChartDataset,
        borderWidth: 1,
        weight: 2,
      },
      {
        ...ChartUtils.defaultDoughnutChartDataset,
        borderWidth: 1,
        weight: 1,
      },
    ],
  };

  public portfolioCompositionChartOptions: ChartConfiguration<ChartType.DOUGHNUT>['options'] =
    ChartUtils.getMultiRingDoughnutChartOptions('30%', (context) => {
      if (context.parsed === 0) return '';

      const value = this.decimalPipe.transform(context.parsed, '1.2-2');
      const label = value ? `${value}%` : '';

      if (context.datasetIndex === 0) {
        return `Stock: ${context.label} — ${label}`;
      } else if (context.datasetIndex === 1) {
        return `Sector: ${context.label} — ${label}`;
      } else {
        return `Market Cap: ${context.label} — ${label}`;
      }
    });

  public readonly Direction = Direction;
  public readonly Period = Period;
  public readonly ChartType = ChartType;

  private isMarketOpen = false;

  private colorScheme = ColorScheme.DARK;

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

        this.cdr.markForCheck();
      });

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
        this.colorScheme = colorScheme;

        if (colorScheme && this.chart) {
          ChartUtils.applyChartColorScheme(this.chart, colorScheme);
        }
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
        delay(100),
        untilDestroyed(this),
      )
      .subscribe((data) => {
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

          if (this.chart) {
            ChartUtils.applyChartColorScheme(this.chart, this.colorScheme);
          }
        } else {
          this.isPortfolioPerformanceChartNoData = true;
        }

        this.isPortfolioPerformanceChartLoading = false;
        this.cdr.markForCheck();
      });

    combineLatest([
      dashboardService.getPortfolioComposition(),
      settingsService.settings$.pipe(
        distinctUntilKeyChanged('colorScheme'),
        tap(() => (this.isPortfolioCompositionChartLoading = true)),
      ),
    ])
      .pipe(untilDestroyed(this))
      .subscribe(
        ([
          {
            weight,
            stocks,
            sectors,
            sectorWeights,
            marketCaps,
            marketCapWeights,
          },
          { colorScheme },
        ]) => {
          const stockCount = stocks.length;
          const sectorCount = sectors.length;
          const marketCapCount = marketCaps.length;

          if (stockCount > 0) {
            this.isPortfolioCompositionChartNoData = false;

            const colors = ChartUtils.generateChartColors(
              stockCount + sectorCount + marketCapCount,
              colorScheme,
            );

            const stockColors = colors.slice(0, stockCount);
            const sectorColors = colors.slice(
              stockCount,
              stockCount + sectorCount,
            );
            const marketCapColors = colors.slice(stockCount + sectorCount);

            const allLabels: string[] = [...stocks, ...sectors, ...marketCaps];

            const stockDataWithPadding: number[] = [
              ...weight,
              ...Array(sectorCount + marketCapCount).fill(0),
            ];
            const sectorDataWithPadding: number[] = [
              ...Array(stockCount).fill(0),
              ...sectorWeights,
              ...Array(marketCapCount).fill(0),
            ];
            const marketCapDataWithPadding: number[] = [
              ...Array(stockCount + sectorCount).fill(0),
              ...marketCapWeights,
            ];

            this.updatePortfolioCompositionChart(
              stockDataWithPadding,
              allLabels,
              [
                ...stockColors,
                ...Array(sectorCount + marketCapCount).fill('transparent'),
              ],
              sectorDataWithPadding,
              [
                ...Array(stockCount).fill('transparent'),
                ...sectorColors,
                ...Array(marketCapCount).fill('transparent'),
              ],
              marketCapDataWithPadding,
              [
                ...Array(stockCount + sectorCount).fill('transparent'),
                ...marketCapColors,
              ],
            );
          } else {
            this.isPortfolioCompositionChartNoData = true;
          }

          this.isPortfolioCompositionChartLoading = false;
        },
      );
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
    stockData: number[],
    labels: string[],
    stockColors: string[],
    sectorData: number[],
    sectorColors: string[],
    marketCapData: number[],
    marketCapColors: string[],
  ) {
    this.portfolioCompositionChartData.labels = labels;

    this.portfolioCompositionChartData.datasets[0].data = stockData;
    this.portfolioCompositionChartData.datasets[0].backgroundColor =
      stockColors;

    this.portfolioCompositionChartData.datasets[1].data = sectorData;
    this.portfolioCompositionChartData.datasets[1].backgroundColor =
      sectorColors;

    this.portfolioCompositionChartData.datasets[2].data = marketCapData;
    this.portfolioCompositionChartData.datasets[2].backgroundColor =
      marketCapColors;

    const chart = this.portfolioCompositionChart();
    if (chart) {
      chart.update();
    }
  }
}
