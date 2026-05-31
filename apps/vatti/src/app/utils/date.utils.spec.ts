import {
  CompoundingFrequency,
  InterestPayoutFrequency,
} from '../models/deposit';
import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  describe('constants', () => {
    it('should have YEAR_IN_DAYS = 365', () => {
      expect(DateUtils.YEAR_IN_DAYS).toBe(365);
    });

    it('should have FINANCIAL_YEAR_START_MONTH = 3 (April)', () => {
      expect(DateUtils.FINANCIAL_YEAR_START_MONTH).toBe(3);
    });
  });

  describe('getNextCompoundingOrPayoutDate', () => {
    it('should add 1 month for CompoundingFrequency.Monthly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        CompoundingFrequency.Monthly,
      );
      expect(result!.getMonth()).toBe(1);
      expect(result!.getDate()).toBe(15);
    });

    it('should add 1 month for InterestPayoutFrequency.Monthly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        InterestPayoutFrequency.Monthly,
      );
      expect(result!.getMonth()).toBe(1);
    });

    it('should return next quarter end for CompoundingFrequency.Quarterly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        CompoundingFrequency.Quarterly,
      );
      expect(result!.getMonth()).toBe(2);
      expect(result!.getDate()).toBe(31);
    });

    it('should return next quarter end for InterestPayoutFrequency.Quarterly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        InterestPayoutFrequency.Quarterly,
      );
      expect(result!.getMonth()).toBe(2);
      expect(result!.getDate()).toBe(31);
    });

    it('should advance 4 quarters for CompoundingFrequency.Yearly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        CompoundingFrequency.Yearly,
      );
      expect(result!.getMonth()).toBe(11);
      expect(result!.getDate()).toBe(31);
    });

    it('should advance 4 quarters for InterestPayoutFrequency.Yearly', () => {
      const date = new Date(2024, 0, 15);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        InterestPayoutFrequency.Yearly,
      );
      expect(result!.getMonth()).toBe(11);
      expect(result!.getDate()).toBe(31);
    });

    it('should handle date exactly on a quarter end (Mar 31)', () => {
      const date = new Date(2024, 2, 31);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        CompoundingFrequency.Quarterly,
      );
      expect(result!.getMonth()).toBe(5);
      expect(result!.getDate()).toBe(30);
    });

    it('should return null for unknown frequency (CompoundingFrequency.None)', () => {
      const date = new Date(2024, 0, 1);
      const result = DateUtils.getNextCompoundingOrPayoutDate(
        date,
        CompoundingFrequency.None,
      );
      expect(result).toBeNull();
    });
  });

  describe('getDepositMaturityDate', () => {
    it('should add years, months, and days to start date', () => {
      const start = new Date(2024, 0, 1);
      const result = DateUtils.getDepositMaturityDate(start, 5, 3, 10);
      expect(result.getFullYear()).toBe(2029);
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(11);
    });

    it('should handle default depositTermDays of 0', () => {
      const start = new Date(2024, 0, 1);
      const result = DateUtils.getDepositMaturityDate(start, 1, 0);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it('should handle zero years and months with positive days', () => {
      const start = new Date(2024, 6, 1);
      const result = DateUtils.getDepositMaturityDate(start, 0, 0, 15);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(6);
      expect(result.getDate()).toBe(16);
    });
  });

  describe('convertDepositTermToYears', () => {
    it('should convert years, months, and days to decimal years', () => {
      const result = DateUtils.convertDepositTermToYears(5, 6, 15);
      expect(result).toBeCloseTo(5.541, 2);
    });

    it('should return 0 when all terms are 0', () => {
      const result = DateUtils.convertDepositTermToYears(0, 0, 0);
      expect(result).toBe(0);
    });

    it('should work with only months', () => {
      const result = DateUtils.convertDepositTermToYears(0, 12, 0);
      expect(result).toBe(1);
    });

    it('should work with default depositTermDays', () => {
      const result = DateUtils.convertDepositTermToYears(2, 6);
      expect(result).toBeCloseTo(2.5, 1);
    });

    it('should handle undefined/y falsy values with defaults', () => {
      const result = DateUtils.convertDepositTermToYears(
        undefined as any,
        undefined as any,
      );
      expect(result).toBe(0);
    });
  });

  describe('getDifferenceInDays', () => {
    it('should return positive difference when date1 > date2', () => {
      const result = DateUtils.getDifferenceInDays(
        new Date(2024, 0, 10),
        new Date(2024, 0, 1),
      );
      expect(result).toBe(9);
    });

    it('should return negative difference when date1 < date2', () => {
      const result = DateUtils.getDifferenceInDays(
        new Date(2024, 0, 1),
        new Date(2024, 0, 10),
      );
      expect(result).toBe(-9);
    });

    it('should return 0 for same dates', () => {
      const date = new Date(2024, 5, 15);
      const result = DateUtils.getDifferenceInDays(date, date);
      expect(result).toBe(0);
    });
  });

  describe('getFinancialYear', () => {
    it('should return FY starting April of same year for dates after March', () => {
      const date = new Date(2024, 5, 15);
      const fy = DateUtils.getFinancialYear(date);
      expect(fy.start.getFullYear()).toBe(2024);
      expect(fy.start.getMonth()).toBe(3);
      expect(fy.start.getDate()).toBe(1);
      expect(fy.end.getFullYear()).toBe(2025);
      expect(fy.end.getMonth()).toBe(2);
      expect(fy.end.getDate()).toBe(31);
    });

    it('should return FY starting April of previous year for dates before April', () => {
      const date = new Date(2024, 0, 15);
      const fy = DateUtils.getFinancialYear(date);
      expect(fy.start.getFullYear()).toBe(2023);
      expect(fy.start.getMonth()).toBe(3);
      expect(fy.start.getDate()).toBe(1);
      expect(fy.end.getFullYear()).toBe(2024);
      expect(fy.end.getMonth()).toBe(2);
      expect(fy.end.getDate()).toBe(31);
    });

    it('should treat April 1 as start of new financial year', () => {
      const date = new Date(2024, 3, 1);
      const fy = DateUtils.getFinancialYear(date);
      expect(fy.start.getFullYear()).toBe(2024);
      expect(fy.start.getMonth()).toBe(3);
      expect(fy.start.getDate()).toBe(1);
    });

    it('should treat March 31 as belonging to previous financial year', () => {
      const date = new Date(2024, 2, 31);
      const fy = DateUtils.getFinancialYear(date);
      expect(fy.start.getFullYear()).toBe(2023);
      expect(fy.end.getFullYear()).toBe(2024);
    });
  });
});
