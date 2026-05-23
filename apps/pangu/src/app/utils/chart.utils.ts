import {
  ChartConfiguration,
  ChartDataset,
  TooltipItem,
  TooltipModel,
} from 'chart.js';
import { UTCTimestamp } from 'lightweight-charts';

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

  public static generateChartColors(
    count: number,
    theme: ColorScheme,
  ): string[] {
    const colors: string[] = [];
    const usedHues: number[] = [];
    const minHueGap = 30;

    // Contrast Settings:
    // For 'light' background, we use dark foreground (low lightness: 50%).
    // For 'dark' background, we use bright foreground (high lightness: 60%).
    const lightness = theme === ColorScheme.LIGHT ? '50%' : '60%';
    const saturation = '50%';

    for (let i = 0; i < count; i++) {
      let hue: number;

      do {
        hue = Math.round(Math.random() * 360);
      } while (
        usedHues.some(
          (h) =>
            Math.abs(h - hue) < minHueGap ||
            360 - Math.abs(h - hue) < minHueGap,
        )
      );

      usedHues.push(hue);

      colors.push(`hsl(${hue}, ${saturation}, ${lightness})`);
    }

    return colors;
  }
}
