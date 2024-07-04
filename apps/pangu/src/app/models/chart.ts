import { UTCTimestamp } from "lightweight-charts";

export interface BasicChartData {
  time: UTCTimestamp;
  value: number;
}

export interface TechnicalChartData {
  time: UTCTimestamp;
  open: number;
  close: number;
  high: number;
  low: number;
}

export interface BasicChartData {
  time: UTCTimestamp;
  value: number;
}

export enum ChartType {
  BASIC,
  TECHNICAL,
}
