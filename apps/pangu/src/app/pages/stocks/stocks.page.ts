import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { IChartApi, createChart } from 'lightweight-charts';
import { Observable, delay, switchMap, take, tap } from 'rxjs';

import {
  BasicChartData,
  ChartType,
  TechnicalChartData,
} from '../../models/chart';
import { Direction, Exchange, Stock } from '../../models/stock';
import {
  ChartCategory,
  MarketService,
} from '../../services/core/market.service';
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

@Component({
  selector: 'app-stocks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stocks.page.html',
  styleUrl: './stocks.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StocksPage {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  public readonly id = input<string>('');

  public stock$: Observable<Stock | null>;

  public activeChartTimeRange = ChartTimeRange.FIVE_YEAR; // TODO: Set the value as 1 day when intra day chart data is implemented
  public activeExchange = Exchange.NSE;

  public isChartLoading = true;

  public readonly Exchange = Exchange;
  public readonly Direction = Direction;
  public readonly ChartTimeRange = ChartTimeRange;

  private chart!: IChartApi;

  constructor(cdr: ChangeDetectorRef, marketService: MarketService) {
    this.stock$ = toObservable(this.id).pipe(
      switchMap((id) => marketService.getStock(id, true)),
      tap((stock) => {
        if (stock && !this.chart) {
          marketService
            .getGraph(stock.scripCode.nse, ChartType.BASIC, ChartCategory.STOCK)
            .pipe(delay(100), take(1))
            .subscribe((data) => {
              if (data.length > 0) {
                this.initChart(data);

                cdr.markForCheck();
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
          from = ChartUtils.getTimestampSince(to, 10); // 10 days includes weekend
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
          console.log(`Invalid range: ${range}`);
      }

      if (this.chart && from > 0) {
        this.chart.timeScale().setVisibleRange({
          from: ChartUtils.epochToUtcTimestamp(from),
          to: ChartUtils.epochToUtcTimestamp(to.getTime()),
        });
      }
    }
  }

  public setExchange(exchange: Exchange): void {
    if (exchange) {
      this.activeExchange = exchange;
    }
  }

  private initChart(data: BasicChartData[] | TechnicalChartData[]): void {
    if (this.chartContainer?.nativeElement && data?.length > 0) {
      this.chart = createChart(this.chartContainer.nativeElement, {
        layout: {
          background: { color: 'transparent' },
          textColor: '#DDD',
        },
        grid: {
          horzLines: {
            visible: false,
          },
          vertLines: {
            visible: false,
          },
        },
        handleScroll: false,
        handleScale: false,
      });

      const areaSeries = this.chart.addAreaSeries({
        lineColor: '#2962FF',
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.1)',
      });

      areaSeries.setData(data);

      this.chart.timeScale().fitContent();

      this.isChartLoading = false;
    }
  }
}
