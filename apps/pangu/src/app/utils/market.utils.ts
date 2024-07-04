import { Exchange } from '../models/index';
import { ExchangeCodes } from '../models/market';
import { Direction } from '../models/stock';

export class MarketUtils {
  public static getDirection(value: number): Direction {
    return value > 0 ? Direction.UP : Direction.DOWN;
  }

  public static getExchange(code: string): Exchange {
    return code === ExchangeCodes.NSE ? Exchange.NSE : Exchange.BSE;
  }

  public static stringToNumber(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  public static dateStringToEpoch(date: string): number {
    return new Date(date).getTime();
  }

  public static getWeekDays(start: number, end: number) {
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
}
