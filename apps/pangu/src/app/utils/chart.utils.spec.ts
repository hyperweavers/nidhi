import { IChartApi } from 'lightweight-charts';
import { ChartUtils } from './chart.utils';
import { ChartType } from '../models/chart';
import { ColorScheme } from '../models/settings';

describe('ChartUtils', () => {
  describe('epochToUtcTimestamp', () => {
    it('should return -1 for null / undefined', () => {
      expect(ChartUtils.epochToUtcTimestamp(null as unknown as number)).toBe(-1);
      expect(ChartUtils.epochToUtcTimestamp(undefined as unknown as number)).toBe(-1);
    });

    it('should return -1 for 0', () => {
      expect(ChartUtils.epochToUtcTimestamp(0)).toBe(-1);
    });

    it('should return -1 for negative values', () => {
      expect(ChartUtils.epochToUtcTimestamp(-1000)).toBe(-1);
    });

    it('should convert epoch ms to seconds', () => {
      expect(ChartUtils.epochToUtcTimestamp(1000)).toBe(1);
      expect(ChartUtils.epochToUtcTimestamp(5000)).toBe(5);
    });

    it('should truncate fractional milliseconds', () => {
      expect(ChartUtils.epochToUtcTimestamp(1999)).toBe(1);
      expect(ChartUtils.epochToUtcTimestamp(2000)).toBe(2);
    });
  });

  describe('getTimestampSince', () => {
    it('should return -1 for null', () => {
      expect(ChartUtils.getTimestampSince(null as unknown as Date, 5)).toBe(-1);
    });

    it('should return -1 for undefined', () => {
      expect(ChartUtils.getTimestampSince(undefined as unknown as Date, 5)).toBe(-1);
    });

    it('should return -1 for non-Date object', () => {
      expect(ChartUtils.getTimestampSince({} as Date, 5)).toBe(-1);
    });

    it('should return -1 for invalid date', () => {
      expect(ChartUtils.getTimestampSince(new Date('invalid'), 5)).toBe(-1);
    });

    it('should subtract n days from the date', () => {
      const date = new Date(2024, 0, 10);
      const result = ChartUtils.getTimestampSince(date, 3);
      expect(new Date(result).getDate()).toBe(7);
    });

    it('should use absolute value of n when negative', () => {
      const date = new Date(2024, 0, 10);
      const result = ChartUtils.getTimestampSince(date, -3);
      expect(new Date(result).getDate()).toBe(7);
    });

    it('should not mutate the original date', () => {
      const date = new Date(2024, 0, 10);
      const originalTime = date.getTime();
      ChartUtils.getTimestampSince(date, 5);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getDoughnutChartOptions', () => {
    it('should return options with legend displayed', () => {
      const options = ChartUtils.getDoughnutChartOptions(true, 70);
      expect(options!.plugins!.legend!.display).toBe(true);
      expect(options!.responsive).toBe(true);
      expect(options!.maintainAspectRatio).toBe(false);
    });

    it('should return options with legend hidden', () => {
      const options = ChartUtils.getDoughnutChartOptions(false, 70);
      expect(options!.plugins!.legend!.display).toBe(false);
    });

    it('should supply a no-op legend onClick handler', () => {
      const options = ChartUtils.getDoughnutChartOptions(true, 70);
      const result = options!.plugins!.legend!.onClick!({} as any);
      expect(result).toEqual({});
    });

    it('should use default cutout of 70% when size is 0', () => {
      const options = ChartUtils.getDoughnutChartOptions(false, 0);
      expect(options!.cutout).toBe('70%');
    });

    it('should use provided size for cutout', () => {
      const options = ChartUtils.getDoughnutChartOptions(false, 50);
      expect(options!.cutout).toBe('50%');
    });

    it('should include tooltip label callback when provided', () => {
      const callback = jest.fn();
      const options = ChartUtils.getDoughnutChartOptions(false, 70, callback);
      expect(options!.plugins!.tooltip!.callbacks!.label).toBe(callback);
    });

    it('should leave tooltip label callback undefined when not provided', () => {
      const options = ChartUtils.getDoughnutChartOptions(false, 70);
      expect(options!.plugins!.tooltip!.callbacks!.label).toBeUndefined();
    });

    describe('labelColor callback', () => {
      it('should return color from dataset backgroundColor array', () => {
        const options = ChartUtils.getDoughnutChartOptions(false, 70);
        const labelColor = options!.plugins!.tooltip!.callbacks!.labelColor!;
        const result = labelColor({
          dataset: { backgroundColor: ['red', 'blue', 'green'] },
          dataIndex: 1,
        } as any);
        expect(result).toEqual({
          borderColor: 'blue',
          backgroundColor: 'blue',
          borderWidth: 3,
        });
      });

      it('should use defaultColor when backgroundColor is missing', () => {
        const options = ChartUtils.getDoughnutChartOptions(false, 70);
        const labelColor = options!.plugins!.tooltip!.callbacks!.labelColor!;
        const result = labelColor({
          dataset: {},
          dataIndex: 0,
        } as any);
        expect(result).toEqual({
          borderColor: ChartUtils.defaultColor,
          backgroundColor: ChartUtils.defaultColor,
          borderWidth: 3,
        });
      });
    });
  });

  describe('getMultiRingDoughnutChartOptions', () => {
    it('should return options with legend hidden', () => {
      const callback = jest.fn();
      const options = ChartUtils.getMultiRingDoughnutChartOptions('60%', callback);
      expect(options!.plugins!.legend!.display).toBe(false);
    });

    it('should use provided cutout value', () => {
      const callback = jest.fn();
      const options = ChartUtils.getMultiRingDoughnutChartOptions('50%', callback);
      expect(options!.cutout).toBe('50%');
    });

    it('should include tooltip label callback', () => {
      const callback = jest.fn();
      const options = ChartUtils.getMultiRingDoughnutChartOptions('60%', callback);
      expect(options!.plugins!.tooltip!.callbacks!.label).toBe(callback);
    });

    describe('labelColor callback', () => {
      it('should return color from dataset backgroundColor array', () => {
        const callback = jest.fn();
        const options = ChartUtils.getMultiRingDoughnutChartOptions('60%', callback);
        const labelColor = options!.plugins!.tooltip!.callbacks!.labelColor!;
        const result = labelColor({
          dataset: { backgroundColor: ['#ff0', '#f0f', '#0ff'] },
          dataIndex: 2,
        } as any);
        expect(result).toEqual({
          borderColor: '#0ff',
          backgroundColor: '#0ff',
          borderWidth: 3,
        });
      });

      it('should use defaultColor when backgroundColor is missing', () => {
        const callback = jest.fn();
        const options = ChartUtils.getMultiRingDoughnutChartOptions('60%', callback);
        const labelColor = options!.plugins!.tooltip!.callbacks!.labelColor!;
        const result = labelColor({
          dataset: {},
          dataIndex: 0,
        } as any);
        expect(result).toEqual({
          borderColor: ChartUtils.defaultColor,
          backgroundColor: ChartUtils.defaultColor,
          borderWidth: 3,
        });
      });
    });
  });

  describe('applyChartColorScheme', () => {
    it('should apply dark theme colors', () => {
      const mockChart: IChartApi = { applyOptions: jest.fn() } as any;
      ChartUtils.applyChartColorScheme(mockChart, ColorScheme.DARK);
      expect(mockChart.applyOptions).toHaveBeenCalledTimes(1);
      expect(mockChart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: { textColor: '#fff' },
          timeScale: expect.objectContaining({ borderColor: '#374151' }),
          rightPriceScale: expect.objectContaining({ borderColor: '#374151' }),
          crosshair: {
            horzLine: { labelBackgroundColor: '#111827' },
            vertLine: { labelBackgroundColor: '#111827' },
          },
        }),
      );
    });

    it('should apply light theme colors', () => {
      const mockChart: IChartApi = { applyOptions: jest.fn() } as any;
      ChartUtils.applyChartColorScheme(mockChart, ColorScheme.LIGHT);
      expect(mockChart.applyOptions).toHaveBeenCalledTimes(1);
      expect(mockChart.applyOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: { textColor: '#111827' },
          timeScale: expect.objectContaining({ borderColor: '#E5E7EB' }),
          rightPriceScale: expect.objectContaining({ borderColor: '#E5E7EB' }),
          crosshair: {
            horzLine: { labelBackgroundColor: '#f3f4f6' },
            vertLine: { labelBackgroundColor: '#f3f4f6' },
          },
        }),
      );
    });
  });

  describe('generateChartColors', () => {
    it('should return empty array for count 0', () => {
      const colors = ChartUtils.generateChartColors(0, ColorScheme.LIGHT);
      expect(colors).toEqual([]);
    });

    it('should return correct number of colors', () => {
      const colors = ChartUtils.generateChartColors(5, ColorScheme.LIGHT);
      expect(colors).toHaveLength(5);
    });

    it('should return colors in HSL format', () => {
      const colors = ChartUtils.generateChartColors(3, ColorScheme.LIGHT);
      for (const color of colors) {
        expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
      }
    });

    it('should use 50% lightness for LIGHT theme', () => {
      const colors = ChartUtils.generateChartColors(2, ColorScheme.LIGHT);
      for (const color of colors) {
        expect(color).toMatch(/,\s*50%\)$/);
      }
    });

    it('should use 60% lightness for DARK theme', () => {
      const colors = ChartUtils.generateChartColors(2, ColorScheme.DARK);
      for (const color of colors) {
        expect(color).toMatch(/,\s*60%\)$/);
      }
    });
  });

  describe('static properties', () => {
    it('should have colorGray defined', () => {
      expect(ChartUtils.colorGray).toBe('#9CA3AF');
    });

    it('should have defaultColor defined', () => {
      expect(ChartUtils.defaultColor).toBe('#707070');
    });

    it('should have defaultDoughnutChartDataset defined', () => {
      expect(ChartUtils.defaultDoughnutChartDataset).toEqual({
        data: [],
        borderWidth: 0,
        hoverBorderWidth: 0,
      });
    });
  });
});
