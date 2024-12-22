import {
  ChartConfiguration,
  ChartDataset,
  Plugin,
  Point,
  TooltipItem,
  TooltipModel,
} from 'chart.js';

const chartPrimaryColor = '#1A56DB';
const chartSecondaryColor = '#FF6384';
const chartComponentsTextColor = '#9CA3AF';
const chartGridColor = 'rgba(156, 163, 175, 0.2)';

export enum ChartType {
  BAR = 'bar',
  BUBBLE = 'bubble',
  DOUGHNUT = 'doughnut',
  LINE = 'line',
  PIE = 'pie',
  POLAR_AREA = 'polarArea',
  RADAR = 'radar',
  SCATTER = 'scatter',
}

export const commonDoughnutChartDataset: ChartDataset<
  ChartType.DOUGHNUT,
  number[]
> = {
  data: [],
  borderWidth: 0,
  hoverBorderWidth: 0,
};

export const principalInterestDoughnutChartDatasets: ChartDataset<
  ChartType.DOUGHNUT,
  number[]
>[] = [
  {
    ...commonDoughnutChartDataset,
    borderColor: [chartPrimaryColor, chartSecondaryColor],
    hoverBorderColor: [chartPrimaryColor, chartSecondaryColor],
    backgroundColor: [chartPrimaryColor, chartSecondaryColor],
    hoverBackgroundColor: [chartPrimaryColor, chartSecondaryColor],
  },
];

export const commonLineChartDataset: ChartDataset<
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

export const lineChartPrimaryDataset: ChartDataset<
  ChartType.LINE,
  (number | Point | null)[]
> = {
  ...commonLineChartDataset,
  borderColor: chartPrimaryColor,
  hoverBorderColor: chartPrimaryColor,
  backgroundColor: chartPrimaryColor,
  hoverBackgroundColor: chartPrimaryColor,
};

export const lineChartSecondaryDataset: ChartDataset<
  ChartType.LINE,
  (number | Point | null)[]
> = {
  ...commonLineChartDataset,
  borderColor: chartSecondaryColor,
  hoverBorderColor: chartSecondaryColor,
  backgroundColor: chartSecondaryColor,
  hoverBackgroundColor: chartSecondaryColor,
};

export const commonBarChartDataset: ChartDataset<
  ChartType.BAR,
  (number | [number, number] | null)[]
> = {
  barThickness: 'flex',
  maxBarThickness: 15,
  minBarLength: 2,
  data: [],
};

export const commonBarChartDatasetWithGap: ChartDataset<
  ChartType.BAR,
  (number | [number, number] | null)[]
> = {
  barThickness: 'flex',
  maxBarThickness: 20,
  borderColor: 'transparent',
  borderWidth: 2,
  minBarLength: 2,
  data: [],
};

export const barChartPrimaryDataset: ChartDataset<
  ChartType.BAR,
  (number | [number, number] | null)[]
> = {
  ...commonBarChartDataset,
  borderColor: chartPrimaryColor,
  hoverBorderColor: chartPrimaryColor,
  backgroundColor: chartPrimaryColor,
  hoverBackgroundColor: chartPrimaryColor,
};

export const barChartSecondaryDataset: ChartDataset<
  ChartType.BAR,
  (number | [number, number] | null)[]
> = {
  ...commonBarChartDataset,
  borderColor: chartSecondaryColor,
  hoverBorderColor: chartSecondaryColor,
  backgroundColor: chartSecondaryColor,
  hoverBackgroundColor: chartSecondaryColor,
};

export const verticalHoverLine: Plugin<ChartType.LINE> = {
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
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
        ctx.moveTo(dataPoint.x, top);
        ctx.lineTo(dataPoint.x, bottom);
        ctx.stroke();
      }
    });
  },
};

export const increaseLegendSpacing: Plugin<ChartType.LINE> = {
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

export const getDoughnutChartOptions = (
  tooltipLabelCallback?: (
    this: TooltipModel<ChartType.DOUGHNUT>,
    tooltipItem: TooltipItem<ChartType.DOUGHNUT>,
  ) => string | void | string[],
): ChartConfiguration<ChartType.DOUGHNUT>['options'] => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: chartComponentsTextColor,
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
            ? (context.dataset.backgroundColor as string[])[context.dataIndex]
            : '#fff',
          backgroundColor: context.dataset.backgroundColor
            ? (context.dataset.backgroundColor as string[])[context.dataIndex]
            : '#fff',
          borderWidth: 3,
        }),
      },
    },
  },
});

export const getLineChartOptions = (
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
): ChartConfiguration['options'] => {
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
          color: chartComponentsTextColor,
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
          color: chartComponentsTextColor,
          text: xAxisScaleTitle || '',
        },
        grid: {
          display: false,
        },
        ticks: {
          color: chartComponentsTextColor,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: !!yAxisScaleTitle,
          color: chartComponentsTextColor,
          text: yAxisScaleTitle || '',
        },
        grid: {
          drawTicks: false,
          color: chartGridColor,
        },
        border: {
          display: false,
          dash: [5, 3],
        },
        ticks: {
          color: chartComponentsTextColor,
          padding: 10,
        },
      },
    },
  };
};

export const getBarChartOptions = (
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
): ChartConfiguration['options'] => {
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
          color: chartComponentsTextColor,
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
              : '#fff',
            backgroundColor: context.dataset.backgroundColor
              ? context.dataset.backgroundColor.toString()
              : '#fff',
            borderWidth: 3,
          }),
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: !!xAxisScaleTitle,
          color: chartComponentsTextColor,
          text: xAxisScaleTitle || '',
        },
        grid: {
          display: false,
        },
        ticks: {
          color: chartComponentsTextColor,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: !!yAxisScaleTitle,
          color: chartComponentsTextColor,
          text: yAxisScaleTitle || '',
        },
        grid: {
          drawTicks: false,
          color: chartGridColor,
        },
        border: {
          display: false,
          dash: [5, 3],
        },
        ticks: {
          color: chartComponentsTextColor,
          padding: 10,
        },
      },
    },
  };
};
