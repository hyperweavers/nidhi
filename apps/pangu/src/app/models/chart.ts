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
