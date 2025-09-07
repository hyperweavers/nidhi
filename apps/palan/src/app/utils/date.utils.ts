export class DateUtils {
  static convertYearsMonthsDaysToDays(
    lockInPeriodYears: number,
    lockInPeriodMonths: number,
    lockInPeriodDays: number,
  ): number {
    const years = lockInPeriodYears || 0;
    const months = lockInPeriodMonths || 0;
    const days = lockInPeriodDays || 0;

    return (years + months / 12) * 365 + days;
  }

  static convertDaysToYearsMonthsDays(lockInPeriod: number) {
    const years = Math.floor(lockInPeriod / 365);
    const remainingDaysAfterYears = lockInPeriod % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;
    return { years, months, days };
  }
}
