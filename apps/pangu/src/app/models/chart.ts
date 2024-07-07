import { Change } from './stock';

export interface ChartData {
  lineColor: string;
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  value: number;
  volume: number;
  previousDayClose?: number;
  change?: Change;
}
