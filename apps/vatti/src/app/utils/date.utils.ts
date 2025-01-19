import {
  addDays,
  differenceInDays,
  endOfDay,
  endOfQuarter,
  isEqual,
} from 'date-fns';

import { FinancialYear } from '../models/common';
import {
  CompoundingFrequency,
  InterestPayoutFrequency,
} from '../models/deposit';

export class DateUtils {
  static readonly YEAR_IN_DAYS = 365;
  static readonly FINANCIAL_YEAR_START_MONTH = 3; // Default to April. JavaScript months are 0-indexed.

  static getNextCompoundingOrPayoutDate(
    date: Date,
    frequency: CompoundingFrequency | InterestPayoutFrequency,
  ): Date | null {
    let nextDate: Date | null = new Date(date);

    if (
      frequency === CompoundingFrequency.Monthly ||
      frequency === InterestPayoutFrequency.Monthly
    ) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (
      frequency === CompoundingFrequency.Quarterly ||
      frequency === InterestPayoutFrequency.Quarterly
    ) {
      nextDate = DateUtils.getNextFinancialQuarterEndDate(nextDate);
    } else if (
      frequency === CompoundingFrequency.Yearly ||
      frequency === InterestPayoutFrequency.Yearly
    ) {
      for (let quarters = 4; quarters > 0; quarters--) {
        nextDate = DateUtils.getNextFinancialQuarterEndDate(nextDate);
      }
    } else {
      nextDate = null;
    }

    return nextDate;
  }

  static getDepositMaturityDate(
    depositStartDate: Date,
    depositTermYears: number,
    depositTermMonths: number,
    depositTermDays = 0,
  ): Date {
    const maturityDate = new Date(depositStartDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + depositTermYears);
    maturityDate.setMonth(maturityDate.getMonth() + depositTermMonths);
    maturityDate.setDate(maturityDate.getDate() + depositTermDays);

    return maturityDate;
  }

  static convertDepositTermToYears(
    depositTermYears: number,
    depositTermMonths: number,
    depositTermDays = 0,
  ): number {
    const years = depositTermYears || 0;
    const months = depositTermMonths || 0;
    const days = depositTermDays || 0;

    return years + months / 12 + days / 365;
  }

  static getDifferenceInDays(date1: Date, date2: Date): number {
    return differenceInDays(date1, date2);
  }

  static getFinancialYear(date: Date): FinancialYear {
    let year = date.getFullYear();
    const month = date.getMonth();

    // If the month is before April, it belongs to the previous financial year
    if (month < this.FINANCIAL_YEAR_START_MONTH) {
      year--;
    }

    const startDate = new Date(year, this.FINANCIAL_YEAR_START_MONTH, 1); // April 1st
    const endDate = endOfDay(
      new Date(year + 1, this.FINANCIAL_YEAR_START_MONTH - 1, 31),
    ); // March 31st

    return {
      start: startDate,
      end: endDate,
    };
  }

  private static getNextFinancialQuarterEndDate(date: Date): Date {
    let dayEnd = endOfDay(date);
    let quarterEnd = endOfQuarter(dayEnd);

    if (isEqual(quarterEnd, dayEnd)) {
      dayEnd = addDays(dayEnd, 1);
      quarterEnd = endOfQuarter(dayEnd);
    }

    return quarterEnd;
  }
}
