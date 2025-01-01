import {
  ChartConfiguration,
  ChartDataset,
  Plugin,
  Point,
  TooltipItem,
  TooltipModel,
} from 'chart.js';

import { ChartType } from '../models/chart';

export class ChartUtils {
  static readonly colorBlue = '#0066CC';
  static readonly colorGreen = '#63993D';
  static readonly colorYellow = '#FACA15';
  static readonly colorPurple = '#876FD4';
  static readonly colorGray = '#9CA3AF';
  static readonly defaultColor = '#707070';

  private static readonly gridColor = 'rgba(163, 163, 163, 0.2)';
  private static readonly verticalLineColor = 'rgba(163, 163, 163, 0.5)';

  static readonly defaultDoughnutChartDataset: ChartDataset<
    ChartType.DOUGHNUT,
    number[]
  > = {
    data: [],
    borderWidth: 0,
    hoverBorderWidth: 0,
  };

  static readonly defaultLineChartDataset: ChartDataset<
    ChartType.LINE,
    (number | Point | null)[]
  > = {
    data: [],
    borderWidth: 4,
    tension: 0.4,
    pointHoverRadius: 6,
    spanGaps: true,
    pointRadius: 0,
    pointHoverBorderWidth: 0,
    borderCapStyle: 'round',
  };

  static readonly defaultBarChartDataset: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    barThickness: 'flex',
    maxBarThickness: 15,
    data: [],
  };

  static readonly commonBarChartDatasetWithGap: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    ...ChartUtils.defaultBarChartDataset,
    maxBarThickness: 20,
    borderColor: 'transparent',
    borderWidth: 2,
  };

  static readonly verticalHoverLine: Plugin<ChartType.LINE> = {
    id: 'verticalHoverLine',
    beforeDatasetsDraw(chart) {
      const {
        ctx,
        chartArea: { top, bottom },
      } = chart;
      ctx.save();

      chart.getDatasetMeta(0).data.forEach((dataPoint) => {
        if (dataPoint.active === true) {
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = ChartUtils.verticalLineColor;
          ctx.moveTo(dataPoint.x, top);
          ctx.lineTo(dataPoint.x, bottom);
          ctx.stroke();
        }
      });
    },
  };

  static readonly increaseLegendSpacing: Plugin<ChartType.LINE> = {
    id: 'increaseLegendSpacing',
    beforeInit(chart) {
      const legend = chart.legend;
      if (legend && legend.fit) {
        const originalFit = legend.fit;
        legend.fit = function fit() {
          originalFit.call(this);
          this.height += 20;
        };
      }
    },
  };

  static getDoughnutChartColors(
    colors: string[],
  ): Partial<ChartDataset<ChartType.DOUGHNUT, number[]>> {
    return {
      borderColor: colors,
      hoverBorderColor: colors,
      backgroundColor: colors,
      hoverBackgroundColor: colors,
    };
  }

  static getLineChartColor(
    color: string,
  ): Partial<ChartDataset<ChartType.LINE, (number | Point | null)[]>> {
    return {
      borderColor: color,
      hoverBorderColor: color,
      backgroundColor: color,
      hoverBackgroundColor: color,
    };
  }

  static getBarChartColor(
    color: string,
  ): Partial<
    ChartDataset<ChartType.BAR, (number | [number, number] | null)[]>
  > {
    return {
      borderColor: color,
      hoverBorderColor: color,
      backgroundColor: color,
      hoverBackgroundColor: color,
    };
  }

  static getDoughnutChartOptions(
    tooltipLabelCallback?: (
      this: TooltipModel<ChartType.DOUGHNUT>,
      tooltipItem: TooltipItem<ChartType.DOUGHNUT>,
    ) => string | void | string[],
  ): ChartConfiguration<ChartType.DOUGHNUT>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
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

  static getLineChartOptions(
    xAxisScaleTitle?: string,
    yAxisScaleTitle?: string,
    showCaret?: boolean,
    tooltipLabelCallback?: (
      this: TooltipModel<ChartType.LINE>,
      tooltipItem: TooltipItem<ChartType.LINE>,
    ) => string | void | string[],
    tooltipTitleCallback?: (
      this: TooltipModel<ChartType.LINE>,
      tooltipItems: TooltipItem<ChartType.LINE>[],
    ) => string | string[] | void,
    tooltipFooterCallback?: (
      this: TooltipModel<ChartType.LINE>,
      tooltipItems: TooltipItem<ChartType.LINE>[],
    ) => string | string[] | void,
  ): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: ChartUtils.colorGray,
            usePointStyle: true,
            padding: 25,
            boxWidth: 6,
            boxHeight: 6,
          },
          onClick: () => ({}),
        },
        tooltip: {
          caretSize: showCaret ? 5 : 0,
          boxWidth: 8,
          boxHeight: 8,
          bodySpacing: 5,
          boxPadding: 5,
          callbacks: {
            title: tooltipTitleCallback ? tooltipTitleCallback : undefined,
            label: tooltipLabelCallback ? tooltipLabelCallback : undefined,
            footer: tooltipFooterCallback ? tooltipFooterCallback : undefined,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: !!xAxisScaleTitle,
            color: ChartUtils.colorGray,
            text: xAxisScaleTitle || '',
          },
          grid: {
            display: false,
          },
          ticks: {
            color: ChartUtils.colorGray,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: !!yAxisScaleTitle,
            color: ChartUtils.colorGray,
            text: yAxisScaleTitle || '',
          },
          grid: {
            drawTicks: false,
            color: ChartUtils.gridColor,
          },
          border: {
            display: false,
            dash: [5, 3],
          },
          ticks: {
            color: ChartUtils.colorGray,
            padding: 10,
          },
        },
      },
    };
  }

  static getBarChartOptions(
    xAxisScaleTitle?: string,
    yAxisScaleTitle?: string,
    stacked?: boolean,
    showCaret?: boolean,
    tooltipLabelCallback?: (
      this: TooltipModel<ChartType.BAR>,
      tooltipItem: TooltipItem<ChartType.BAR>,
    ) => string | void | string[],
    tooltipTitleCallback?: (
      this: TooltipModel<ChartType.BAR>,
      tooltipItems: TooltipItem<ChartType.BAR>[],
    ) => string | string[] | void,
    tooltipFooterCallback?: (
      this: TooltipModel<ChartType.BAR>,
      tooltipItems: TooltipItem<ChartType.BAR>[],
    ) => string | string[] | void,
  ): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: ChartUtils.colorGray,
            usePointStyle: true,
            padding: 25,
            boxWidth: 9,
            boxHeight: 9,
          },
          onClick: () => ({}),
        },
        tooltip: {
          caretSize: showCaret ? 5 : 0,
          boxWidth: 8,
          boxHeight: 8,
          bodySpacing: 5,
          boxPadding: 5,
          callbacks: {
            title: tooltipTitleCallback ? tooltipTitleCallback : undefined,
            label: tooltipLabelCallback ? tooltipLabelCallback : undefined,
            footer: tooltipFooterCallback ? tooltipFooterCallback : undefined,
            labelColor: (context) => ({
              borderColor: context.dataset.backgroundColor
                ? context.dataset.backgroundColor.toString()
                : ChartUtils.defaultColor,
              backgroundColor: context.dataset.backgroundColor
                ? context.dataset.backgroundColor.toString()
                : ChartUtils.defaultColor,
              borderWidth: 3,
            }),
          },
        },
      },
      scales: {
        x: {
          stacked: stacked,
          title: {
            display: !!xAxisScaleTitle,
            color: ChartUtils.colorGray,
            text: xAxisScaleTitle || '',
          },
          grid: {
            display: false,
          },
          ticks: {
            color: ChartUtils.colorGray,
          },
        },
        y: {
          stacked: stacked,
          beginAtZero: true,
          title: {
            display: !!yAxisScaleTitle,
            color: ChartUtils.colorGray,
            text: yAxisScaleTitle || '',
          },
          grid: {
            drawTicks: false,
            color: ChartUtils.gridColor,
          },
          border: {
            display: false,
            dash: [5, 3],
          },
          ticks: {
            color: ChartUtils.colorGray,
            padding: 10,
          },
        },
      },
    };
  }
}
