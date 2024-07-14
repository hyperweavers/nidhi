import { ExchangeCode } from '../models/market';
import { Direction, ExchangeName } from '../models/stock';

export class MarketUtils {
  public static getDirection(value: number): Direction {
    return value >= 0 ? Direction.UP : Direction.DOWN;
  }

  public static getExchangeNameFromVendorCode(
    code: ExchangeCode,
  ): ExchangeName {
    return code === ExchangeCode.NSE ? ExchangeName.NSE : ExchangeName.BSE;
  }

  public static getExchangeVendorCodeFromName(
    name: ExchangeName,
  ): ExchangeCode {
    return name === ExchangeName.NSE ? ExchangeCode.NSE : ExchangeCode.BSE;
  }

  public static stringToNumber(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  public static dateStringToEpoch(date: string): number {
    return new Date(date).getTime();
  }

  public static getBusinessDays(start: number, end: number) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    let count = 0;

    while (startDate <= endDate) {
      const dayOfWeek = startDate.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }

      startDate.setDate(startDate.getDate() + 1);
    }

    return count;
  }

  public static isBusinessDay(date: Date) {
    const day = date.getDay();

    if (day == 0 || day == 6) {
      return false;
    }

    return true;
  }

  public static getLastBusinessDay(date: Date) {
    while (!MarketUtils.isBusinessDay(date)) {
      date.setDate(date.getDate() - 1);
    }

    return date;
  }
}
