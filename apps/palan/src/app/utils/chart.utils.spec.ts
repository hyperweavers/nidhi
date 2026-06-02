import { ColorScheme } from '../models/settings';
import { ChartUtils } from './chart.utils';

describe('ChartUtils', () => {
  describe('applyChartColorScheme', () => {
    it('should apply DARK color scheme options', () => {
      const chart = { applyOptions: jest.fn() };
      ChartUtils.applyChartColorScheme(chart as any, ColorScheme.DARK);

      expect(chart.applyOptions).toHaveBeenCalledWith({
        layout: { textColor: '#fff' },
        timeScale: { visible: true, borderColor: '#374151' },
        rightPriceScale: { visible: true, borderColor: '#374151' },
        crosshair: {
          horzLine: { labelBackgroundColor: '#111827' },
          vertLine: { labelBackgroundColor: '#111827' },
        },
      });
    });

    it('should apply LIGHT color scheme options', () => {
      const chart = { applyOptions: jest.fn() };
      ChartUtils.applyChartColorScheme(chart as any, ColorScheme.LIGHT);

      expect(chart.applyOptions).toHaveBeenCalledWith({
        layout: { textColor: '#111827' },
        timeScale: { visible: true, borderColor: '#E5E7EB' },
        rightPriceScale: { visible: true, borderColor: '#E5E7EB' },
        crosshair: {
          horzLine: { labelBackgroundColor: '#f3f4f6' },
          vertLine: { labelBackgroundColor: '#f3f4f6' },
        },
      });
    });
  });

  describe('epochToUtcTimestamp', () => {
    it('should convert positive epoch milliseconds to seconds', () => {
      const result = ChartUtils.epochToUtcTimestamp(1700000123000);
      expect(result).toBe(1700000123);
    });

    it('should return -1 for epoch 0', () => {
      const result = ChartUtils.epochToUtcTimestamp(0);
      expect(result).toBe(-1);
    });

    it('should return -1 for negative epoch', () => {
      const result = ChartUtils.epochToUtcTimestamp(-5000);
      expect(result).toBe(-1);
    });

    it('should floor the timestamp using Math.trunc', () => {
      const result = ChartUtils.epochToUtcTimestamp(1700000123456);
      expect(result).toBe(1700000123);
    });
  });

  describe('getTimestampSince', () => {
    it('should subtract n days from the date as milliseconds', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = ChartUtils.getTimestampSince(date, 5);
      const expected = new Date('2024-01-10T00:00:00').getTime();
      expect(result).toBe(expected);
    });

    it('should use absolute value of n', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = ChartUtils.getTimestampSince(date, -5);
      const expected = new Date('2024-01-10T00:00:00').getTime();
      expect(result).toBe(expected);
    });

    it('should return -1 for null date', () => {
      expect(ChartUtils.getTimestampSince(null as any, 5)).toBe(-1);
    });

    it('should return -1 for undefined date', () => {
      expect(ChartUtils.getTimestampSince(undefined as any, 5)).toBe(-1);
    });

    it('should return -1 for non-Date object', () => {
      expect(ChartUtils.getTimestampSince('not a date' as any, 5)).toBe(-1);
    });

    it('should return -1 for invalid date', () => {
      expect(ChartUtils.getTimestampSince(new Date('invalid'), 5)).toBe(-1);
    });

    it('should not mutate the original date', () => {
      const date = new Date('2024-01-15T00:00:00');
      const originalTime = date.getTime();
      ChartUtils.getTimestampSince(date, 5);
      expect(date.getTime()).toBe(originalTime);
    });
  });
});
