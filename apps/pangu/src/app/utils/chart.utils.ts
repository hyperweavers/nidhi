import { UTCTimestamp } from 'lightweight-charts';

export class ChartUtils {
  public static epochToUtcTimestamp(epoch: number): UTCTimestamp {
    return ((epoch && epoch > 0) ? Math.trunc(epoch / 1000) : -1) as UTCTimestamp;
  }

  public static getTimestampSince(date: Date, n: number): number {
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      const d = new Date(date); // Do not modify original date passed in
      d.setDate(d.getDate() - Math.abs(n));

      return d.getTime();
    } else {
      return -1;
    }
  }
}
