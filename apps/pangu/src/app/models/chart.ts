import { Change } from './market';

export interface ChartData {
  lineColor?: string;
  time: string | number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  value: number;
  volume?: number;
  previousDayClose?: number;
  change?: Change;
}

export interface PeerChartData {
  symbol: string;
  data: ChartData[];
}

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

export enum ChartCategory {
  STOCK = 'stock',
  INDEX = 'index',
}

export enum Period {
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  ONE_YEAR = '1Y',
  FIVE_YEAR = '5Y',
}
