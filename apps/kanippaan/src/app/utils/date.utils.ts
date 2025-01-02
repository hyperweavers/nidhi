import {
  addDays,
  differenceInDays,
  endOfDay,
  endOfQuarter,
  isEqual,
} from 'date-fns';

import { CompoundingFrequency, InterestPayoutType } from '../models/deposit';

export class DateUtils {
  static readonly YEAR_IN_DAYS = 365;

  static getNextCompoundingOrPayoutDate(
    date: Date,
    frequency: CompoundingFrequency | InterestPayoutType,
  ): Date | null {
    let nextDate: Date | null = new Date(date);

    if (
      frequency === CompoundingFrequency.Monthly ||
      frequency === InterestPayoutType.Monthly
    ) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (
      frequency === CompoundingFrequency.Quarterly ||
      frequency === InterestPayoutType.Quarterly
    ) {
      nextDate = DateUtils.getNextFinancialQuarterEndDate(nextDate);
    } else if (
      frequency === CompoundingFrequency.Yearly ||
      frequency === InterestPayoutType.Yearly
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
