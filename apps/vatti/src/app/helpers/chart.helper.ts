import { DecimalPipe } from '@angular/common';
import { TooltipItem } from 'chart.js';

import { ChartType } from '../models/chart';

export function formatDoughnutLabel(
  context: TooltipItem<ChartType.DOUGHNUT>,
  decimalPipe: DecimalPipe,
): string {
  return decimalPipe.transform(context.parsed, '1.0-0') || '';
}

export function formatBarLabel(
  context: TooltipItem<ChartType.BAR>,
  format: string,
  decimalPipe: DecimalPipe,
): string {
  const label = context.dataset.label || '';
  const value = context.parsed?.y;
  return label && value
    ? `${label}: ${decimalPipe.transform(value, format) || ''}`
    : '';
}

export function formatBarTitle(
  tooltipItems: TooltipItem<ChartType.BAR>[],
  prefix: string,
): string {
  return tooltipItems[0]?.label ? `${prefix}: ${tooltipItems[0].label}` : '';
}

export function formatAnnualSummaryFooter(
  tooltipItems: TooltipItem<ChartType.BAR>[],
  depositAmount: number,
  decimalPipe: DecimalPipe,
): string {
  return tooltipItems.length > 0
    ? `Total Interest: ${
        decimalPipe.transform(
          tooltipItems.reduce((acc, cv) => {
            acc += cv?.parsed?.y || 0;
            return acc;
          }, 0) - depositAmount,
          '1.0-0',
        ) || ''
      }`
    : '';
}

export function formatLineLabel(
  context: TooltipItem<ChartType.LINE>,
  decimalPipe: DecimalPipe,
  format = '1.0-0',
  suffix = '',
): string {
  const label = context.dataset.label || '';
  const value = context.parsed?.y;
  return label && value
    ? `${label}: ${decimalPipe.transform(value, format) || ''}${suffix}`
    : '';
}

export function formatSchemeTitle(
  tooltipItems: TooltipItem<ChartType.BAR>[],
): string {
  return tooltipItems[0]?.label ? `Scheme: ${tooltipItems[0].label}` : '';
}

export function formatMaturityFooter(
  tooltipItems: TooltipItem<ChartType.BAR>[],
  decimalPipe: DecimalPipe,
): string {
  return tooltipItems.length > 0
    ? `Maturity: ${
        decimalPipe.transform(
          tooltipItems.reduce((acc, cv) => {
            acc += cv?.parsed?.y || 0;
            return acc;
          }, 0),
          '1.0-0',
        ) || ''
      }`
    : '';
}

export function formatClosingBalanceFooter(
  tooltipItems: TooltipItem<ChartType.BAR>[],
  decimalPipe: DecimalPipe,
): string {
  return tooltipItems.length > 0
    ? `Closing Balance: ${
        decimalPipe.transform(
          tooltipItems.reduce((acc, cv) => {
            acc += cv?.parsed?.y || 0;
            return acc;
          }, 0),
          '1.0-0',
        ) || ''
      }`
    : '';
}

export function formatEmiTitle(
  tooltipItems: TooltipItem<ChartType.LINE>[],
): string {
  return tooltipItems[0]?.label ? `EMI: ${tooltipItems[0].label}` : '';
}
