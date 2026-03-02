import { ChartUtils } from './chart.utils';

describe('ChartUtils', () => {
  describe('epochToUtcTimestamp', () => {
    it('should convert epoch to UTCTimestamp correctly', () => {
      // 1672531200000 = 2023-01-01T00:00:00.000Z
      expect(ChartUtils.epochToUtcTimestamp(1672531200000)).toBe(1672531200);
    });

    it('should handle zero gracefully', () => {
      expect(ChartUtils.epochToUtcTimestamp(0)).toBe(-1);
    });

    it('should handle negative numbers gracefully', () => {
      expect(ChartUtils.epochToUtcTimestamp(-1000)).toBe(-1);
    });

    it('should handle null or undefined gracefully', () => {
      expect(ChartUtils.epochToUtcTimestamp(null as unknown as number)).toBe(
        -1,
      );
      expect(
        ChartUtils.epochToUtcTimestamp(undefined as unknown as number),
      ).toBe(-1);
    });
  });

  describe('getTimestampSince', () => {
    it('should return correct timestamp since n days ago', () => {
      const date = new Date('2023-01-10T00:00:00.000Z');
      const expectedDate = new Date('2023-01-05T00:00:00.000Z');
      expect(ChartUtils.getTimestampSince(date, 5)).toBe(
        expectedDate.getTime(),
      );
    });

    it('should return correct timestamp since n days ago (even if n is negative)', () => {
      const date = new Date('2023-01-10T00:00:00.000Z');
      const expectedDate = new Date('2023-01-05T00:00:00.000Z');
      expect(ChartUtils.getTimestampSince(date, -5)).toBe(
        expectedDate.getTime(),
      );
    });

    it('should not modify the original date object', () => {
      const originalDateStr = '2023-01-10T00:00:00.000Z';
      const date = new Date(originalDateStr);
      ChartUtils.getTimestampSince(date, 5);
      expect(date.toISOString()).toBe(originalDateStr);
    });

    it('should return -1 for invalid dates', () => {
      expect(ChartUtils.getTimestampSince(new Date('invalid'), 5)).toBe(-1);
    });

    it('should return -1 if date is not a Date object', () => {
      expect(ChartUtils.getTimestampSince(null as unknown as Date, 5)).toBe(-1);
    });
  });
});
