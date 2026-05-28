import { IChartApi, UTCTimestamp } from 'lightweight-charts';

import { ColorScheme } from '../models/settings';

export class ChartUtils {
  public static applyChartColorScheme(
    chart: IChartApi,
    colorScheme: ColorScheme,
  ): void {
    const textColor = colorScheme === ColorScheme.DARK ? '#fff' : '#111827';
    const borderColor =
      colorScheme === ColorScheme.DARK ? '#374151' : '#E5E7EB';
    const labelBg = colorScheme === ColorScheme.DARK ? '#111827' : '#f3f4f6';

    chart.applyOptions({
      layout: { textColor },
      timeScale: { visible: true, borderColor },
      rightPriceScale: { visible: true, borderColor },
      crosshair: {
        horzLine: { labelBackgroundColor: labelBg },
        vertLine: { labelBackgroundColor: labelBg },
      },
    });
  }

  public static epochToUtcTimestamp(epoch: number): UTCTimestamp {
    return (epoch && epoch > 0 ? Math.trunc(epoch / 1000) : -1) as UTCTimestamp;
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
