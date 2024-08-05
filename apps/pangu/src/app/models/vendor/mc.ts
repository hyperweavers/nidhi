export interface IntraDay {
  s: IntraDayStatus;
  data?: IntraDayData[];
  nextTime?: number;
}

export interface IntraDayData {
  time: number;
  value: number;
}

export enum IntraDayStatus {
  OK = 'ok',
  NO_DATA = 'no_data',
  ERROR = 'error',
}
