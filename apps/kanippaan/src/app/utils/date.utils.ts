import { CompoundingFrequency, InterestPayoutType } from '../models/deposit';

export class DateUtils {
  static getNextFinancialQuarterEndDate(date: Date): Date {
    const year = date.getFullYear();

    // End dates of financial quarters: Mar 31, Jun 30, Sep 30, Dec 31
    const quarterEndDates = [
      new Date(year, 2, 31), // March 31
      new Date(year, 5, 30), // June 30
      new Date(year, 8, 30), // September 30
      new Date(year, 11, 31), // December 31
    ];

    for (const quarterEnd of quarterEndDates) {
      if (date < quarterEnd) {
        return quarterEnd;
      }
    }

    // If the current date is after Dec 31, jump to the next year's Mar 31
    return new Date(year + 1, 2, 31);
  }

  static getNextCompoundingDate(
    date: Date,
    frequency: CompoundingFrequency,
  ): Date {
    let nextDate = new Date(date);

    if (frequency === CompoundingFrequency.Monthly) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (frequency === CompoundingFrequency.Quarterly) {
      nextDate = DateUtils.getNextFinancialQuarterEndDate(nextDate);
    } else {
      // Default to yearly, if frequency is Yearly or not specified
      let quarters = 4;
      while (quarters > 0) {
        nextDate = DateUtils.getNextFinancialQuarterEndDate(nextDate);
        quarters--;
      }
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

  static convertFrequencyToValue(
    frequency: InterestPayoutType | CompoundingFrequency,
  ): number {
    switch (frequency) {
      case InterestPayoutType.Monthly:
      case CompoundingFrequency.Monthly:
        return 12;
      case InterestPayoutType.Quarterly:
      case CompoundingFrequency.Quarterly:
        return 4;
      case CompoundingFrequency.Yearly:
      case InterestPayoutType.Yearly:
      case InterestPayoutType.Maturity:
        return 1;
      case CompoundingFrequency.None:
      default:
        return 0;
    }
  }

  static getDifferenceInDays(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // Hours * Minutes * Seconds * Milliseconds
    const diffInTime = date1.getTime() - date2.getTime();

    return Math.round(diffInTime / oneDay);
  }

  // Returns the number of full months between date1 and date2.
  // If date1 >= date2, returns 0.
  static getMonthsBetween(date1: Date, date2: Date): number {
    if (date1 >= date2) {
      return 0;
    }
    const year1 = date1.getFullYear();
    const year2 = date2.getFullYear();
    const month1 = date1.getMonth();
    const month2 = date2.getMonth();
    const totalMonths1 = year1 * 12 + month1;
    const totalMonths2 = year2 * 12 + month2;

    // If within the same month, return 0 if date2 < date1 in days
    // but as an integer measure, we just do totalMonths2 - totalMonths1
    let monthsDiff = totalMonths2 - totalMonths1;
    // In case the day of month for date2 is less than date1, reduce by 1
    if (date2.getDate() < date1.getDate()) {
      monthsDiff -= 1;
    }
    return monthsDiff > 0 ? monthsDiff : 0;
  }
}
