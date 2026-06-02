import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  describe('convertYearsMonthsDaysToDays', () => {
    it('should convert years, months, and days to total days', () => {
      const result = DateUtils.convertYearsMonthsDaysToDays(1, 6, 15);
      expect(result).toBeCloseTo(562.5, 1);
    });

    it('should handle zero values', () => {
      const result = DateUtils.convertYearsMonthsDaysToDays(0, 0, 0);
      expect(result).toBe(0);
    });

    it('should handle nullish values via || fallback', () => {
      const result = DateUtils.convertYearsMonthsDaysToDays(
        undefined as unknown as number,
        undefined as unknown as number,
        undefined as unknown as number,
      );
      expect(result).toBe(0);
    });
  });

  describe('convertDaysToYearsMonthsDays', () => {
    it('should convert days to years, months, and days', () => {
      const result = DateUtils.convertDaysToYearsMonthsDays(562);
      expect(result.years).toBe(1);
      expect(result.months).toBe(6);
      expect(result.days).toBe(17);
    });

    it('should handle zero days', () => {
      const result = DateUtils.convertDaysToYearsMonthsDays(0);
      expect(result.years).toBe(0);
      expect(result.months).toBe(0);
      expect(result.days).toBe(0);
    });
  });
});
