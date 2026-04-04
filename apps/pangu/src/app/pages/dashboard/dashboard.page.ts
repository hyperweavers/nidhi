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
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';

import { ChartData, Period } from '../../models/chart';
import { Kpi } from '../../models/kpi';
import { Direction, Status } from '../../models/market';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { MarketService } from '../../services/core/market.service';
import { DashboardService } from '../../services/dashboard.service';

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

  public readonly activePeriod = signal<Period>(Period.ONE_DAY);

  public chartCrosshairData?: ChartData;

  public isChartLoading = true;
  public isChartInFullscreen = false;
  public isChartNoData = false;

  public readonly Direction = Direction;
  public readonly Period = Period;

  private showIntraDayChart$ = new BehaviorSubject<boolean>(true);

  private isMarketOpen = false;

  private chartData?: Map<string | number, ChartData>;
  private chart?: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areaSeries?: ISeriesApi<any>;

  constructor() {
    const marketService = inject(MarketService);
    const dashboardService = inject(DashboardService);

    marketService.marketStatus$
      .pipe(untilDestroyed(this))
      .subscribe(({ status }) => {
        this.isMarketOpen = status === Status.OPEN;
      });

    this.kpi$ = dashboardService.kpi$;

    toObservable(this.activePeriod).pipe(
      map((period) => dashboardService.getPortfolioChart(period)),
      tap(console.log),
    );
  }

  public setPeriod(period: Period): void {
    if (period) {
      this.activePeriod.set(period);

      this.showIntraDayChart$.next(period === Period.ONE_DAY);
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

      this.setPeriod(this.activePeriod());
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
}
