export interface MarketStatus {
  lastUpdated: number;
  status: Status;
  startTime: number;
  endTime: number;
}

export enum Status {
  OPEN,
  CLOSED,
}
