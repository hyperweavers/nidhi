import {
  ChartConfiguration,
  ChartDataset,
  TooltipItem,
  TooltipModel,
} from 'chart.js';
import { IChartApi, UTCTimestamp } from 'lightweight-charts';

import { ChartType } from '../models/chart';
import { ColorScheme } from '../models/settings';

export class ChartUtils {
  public static readonly colorGray = '#9CA3AF';
  public static readonly defaultColor = '#707070';

  public static readonly defaultDoughnutChartDataset: ChartDataset<
    ChartType.DOUGHNUT,
    number[]
  > = {
    data: [],
    borderWidth: 0,
    hoverBorderWidth: 0,
  };

  public static epochToUtcTimestamp(epoch: number): UTCTimestamp {
    return (epoch && epoch > 0 ? Math.trunc(epoch / 1000) : -1) as UTCTimestamp;
  }

  public static getTimestampSince(date: Date, n: number): number {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      const d = new Date(date); // Do not modify original date passed in
      d.setDate(d.getDate() - Math.abs(n));

      return d.getTime();
    } else {
      return -1;
    }
  }

  public static getDoughnutChartOptions(
    displayLegend: boolean,
    size: number,
    tooltipLabelCallback?: (
      this: TooltipModel<ChartType.DOUGHNUT>,
      tooltipItem: TooltipItem<ChartType.DOUGHNUT>,
    ) => string | void | string[],
  ): ChartConfiguration<ChartType.DOUGHNUT>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: `${size || 70}%`,
      layout: {
        padding: 22,
      },
      plugins: {
        legend: {
          display: displayLegend,
          position: 'bottom',
          labels: {
            color: this.colorGray,
            usePointStyle: true,
            padding: 25,
            boxWidth: 9,
            boxHeight: 9,
          },
          onClick: () => ({}),
        },
        tooltip: {
          boxWidth: 8,
          boxHeight: 8,
          bodySpacing: 5,
          boxPadding: 5,
          callbacks: {
            label: tooltipLabelCallback ? tooltipLabelCallback : undefined,
            labelColor: (context) => ({
              borderColor: context.dataset.backgroundColor
                ? (context.dataset.backgroundColor as string[])[
                    context.dataIndex
                  ]
                : ChartUtils.defaultColor,
              backgroundColor: context.dataset.backgroundColor
                ? (context.dataset.backgroundColor as string[])[
                    context.dataIndex
                  ]
                : ChartUtils.defaultColor,
              borderWidth: 3,
            }),
          },
        },
      },
    };
  }

  public static getMultiRingDoughnutChartOptions(
    cutout: string,
    tooltipLabelCallback: (
      this: TooltipModel<ChartType.DOUGHNUT>,
      tooltipItem: TooltipItem<ChartType.DOUGHNUT>,
    ) => string | void | string[],
  ): ChartConfiguration<ChartType.DOUGHNUT>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      layout: {
        padding: 22,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          boxWidth: 8,
          boxHeight: 8,
          bodySpacing: 5,
          boxPadding: 5,
          callbacks: {
            label: tooltipLabelCallback,
            labelColor: (context) => ({
              borderColor: context.dataset.backgroundColor
                ? (context.dataset.backgroundColor as string[])[
                    context.dataIndex
                  ]
                : ChartUtils.defaultColor,
              backgroundColor: context.dataset.backgroundColor
                ? (context.dataset.backgroundColor as string[])[
                    context.dataIndex
                  ]
                : ChartUtils.defaultColor,
              borderWidth: 3,
            }),
          },
        },
      },
    };
  }

  public static applyChartColorScheme(
    chart: IChartApi,
    colorScheme: ColorScheme,
  ): void {
    const textColor = colorScheme === ColorScheme.DARK ? '#fff' : '#111827';
    const borderColor =
      colorScheme === ColorScheme.DARK ? '#374151' : '#E5E7EB';
    const labelBg = colorScheme === ColorScheme.DARK ? '#111827' : '#f3f4f6';

    chart.applyOptions({
      layout: { textColor },
      timeScale: { visible: true, borderColor },
      rightPriceScale: { visible: true, borderColor },
      crosshair: {
        horzLine: { labelBackgroundColor: labelBg },
        vertLine: { labelBackgroundColor: labelBg },
      },
    });
  }

  public static generateChartColors(
    count: number,
    theme: ColorScheme,
  ): string[] {
    const lightness = theme === ColorScheme.LIGHT ? '50%' : '60%';
    const hues = Array.from({ length: count }, (_, i) =>
      Math.round((360 / count) * i),
    );

    for (let i = hues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [hues[i], hues[j]] = [hues[j], hues[i]];
    }

    return hues.map(
      (hue) =>
        `hsl(${hue}, ${55 + Math.floor(Math.random() * 40)}%, ${lightness})`,
    );
  }
}
