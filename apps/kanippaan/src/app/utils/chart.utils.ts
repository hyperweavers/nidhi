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
  private static primaryColor = '#1A56DB';
  private static secondaryColor = '#E74694';
  private static componentsTextColor = '#9CA3AF';
  private static gridColor = 'rgba(156, 163, 175, 0.2)';
  private static verticalLineColor = 'rgba(156, 163, 175, 0.5)';
  private static fallbackColor = '#fff';

  static commonDoughnutChartDataset: ChartDataset<
    ChartType.DOUGHNUT,
    number[]
  > = {
    data: [],
    borderWidth: 0,
    hoverBorderWidth: 0,
  };

  static doughnutChartDualDatasets: ChartDataset<
    ChartType.DOUGHNUT,
    number[]
  >[] = [
    {
      ...ChartUtils.commonDoughnutChartDataset,
      borderColor: [ChartUtils.primaryColor, ChartUtils.secondaryColor],
      hoverBorderColor: [ChartUtils.primaryColor, ChartUtils.secondaryColor],
      backgroundColor: [ChartUtils.primaryColor, ChartUtils.secondaryColor],
      hoverBackgroundColor: [
        ChartUtils.primaryColor,
        ChartUtils.secondaryColor,
      ],
    },
  ];

  static commonLineChartDataset: ChartDataset<
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

  static lineChartPrimaryDataset: ChartDataset<
    ChartType.LINE,
    (number | Point | null)[]
  > = {
    ...ChartUtils.commonLineChartDataset,
    borderColor: ChartUtils.primaryColor,
    hoverBorderColor: ChartUtils.primaryColor,
    backgroundColor: ChartUtils.primaryColor,
    hoverBackgroundColor: ChartUtils.primaryColor,
  };

  static lineChartSecondaryDataset: ChartDataset<
    ChartType.LINE,
    (number | Point | null)[]
  > = {
    ...ChartUtils.commonLineChartDataset,
    borderColor: ChartUtils.secondaryColor,
    hoverBorderColor: ChartUtils.secondaryColor,
    backgroundColor: ChartUtils.secondaryColor,
    hoverBackgroundColor: ChartUtils.secondaryColor,
  };

  static commonBarChartDataset: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    barThickness: 'flex',
    maxBarThickness: 15,
    data: [],
  };

  static commonBarChartDatasetWithGap: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    barThickness: 'flex',
    maxBarThickness: 20,
    borderColor: 'transparent',
    borderWidth: 2,
    data: [],
  };

  static barChartPrimaryDataset: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    ...ChartUtils.commonBarChartDataset,
    borderColor: ChartUtils.primaryColor,
    hoverBorderColor: ChartUtils.primaryColor,
    backgroundColor: ChartUtils.primaryColor,
    hoverBackgroundColor: ChartUtils.primaryColor,
  };

  static barChartSecondaryDataset: ChartDataset<
    ChartType.BAR,
    (number | [number, number] | null)[]
  > = {
    ...ChartUtils.commonBarChartDataset,
    borderColor: ChartUtils.secondaryColor,
    hoverBorderColor: ChartUtils.secondaryColor,
    backgroundColor: ChartUtils.secondaryColor,
    hoverBackgroundColor: ChartUtils.secondaryColor,
  };

  static verticalHoverLine: Plugin<ChartType.LINE> = {
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

  static increaseLegendSpacing: Plugin<ChartType.LINE> = {
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
            color: this.componentsTextColor,
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
                : ChartUtils.fallbackColor,
              backgroundColor: context.dataset.backgroundColor
                ? (context.dataset.backgroundColor as string[])[
                    context.dataIndex
                  ]
                : ChartUtils.fallbackColor,
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
            color: ChartUtils.componentsTextColor,
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
          },
        },
      },
      scales: {
        x: {
          title: {
            display: !!xAxisScaleTitle,
            color: ChartUtils.componentsTextColor,
            text: xAxisScaleTitle || '',
          },
          grid: {
            display: false,
          },
          ticks: {
            color: ChartUtils.componentsTextColor,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: !!yAxisScaleTitle,
            color: ChartUtils.componentsTextColor,
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
            color: ChartUtils.componentsTextColor,
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
            color: ChartUtils.componentsTextColor,
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
            labelColor: (context) => ({
              borderColor: context.dataset.backgroundColor
                ? context.dataset.backgroundColor.toString()
                : ChartUtils.fallbackColor,
              backgroundColor: context.dataset.backgroundColor
                ? context.dataset.backgroundColor.toString()
                : ChartUtils.fallbackColor,
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
            color: ChartUtils.componentsTextColor,
            text: xAxisScaleTitle || '',
          },
          grid: {
            display: false,
          },
          ticks: {
            color: ChartUtils.componentsTextColor,
          },
        },
        y: {
          stacked: stacked,
          beginAtZero: true,
          title: {
            display: !!yAxisScaleTitle,
            color: ChartUtils.componentsTextColor,
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
            color: ChartUtils.componentsTextColor,
            padding: 10,
          },
        },
      },
    };
  }
}
