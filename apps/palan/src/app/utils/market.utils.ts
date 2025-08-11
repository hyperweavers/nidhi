import { Direction } from '../models/market';
import { ScripCode } from '../models/stock';

export class MarketUtils {
  public static GLOBAL_SYMBOL_REGEXP = new RegExp(/^\w+:\w+$/);

  public static getDirection(value: number): Direction {
    return value >= 0 ? Direction.UP : Direction.DOWN;
  }

  public static stringToNumber(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  public static dateStringToEpoch(date: string): number {
    return new Date(date).getTime();
  }

  public static getBusinessDays(start: number, end: number): number {
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

  public static isBusinessDay(date: Date): boolean {
    const day = date.getDay();

    if (day == 0 || day == 6) {
      return false;
    }

    return true;
  }

  public static getLastBusinessDay(date: Date): Date {
    while (!MarketUtils.isBusinessDay(date)) {
      date.setDate(date.getDate() - 1);
    }

    return date;
  }

  public static extractScripCodesFromMcSearchResult(
    result: string,
  ): ScripCode | null {
    let codeString = '';

    try {
      codeString =
        new DOMParser()
          .parseFromString(result, 'text/html')
          .querySelector('span')?.textContent || '';
    } catch (error) {
      console.error(
        `An error occurred while trying to parse MC search result "${result}": ${error}`,
      );
    }

    if (codeString) {
      const codes = codeString.split('');
      const isGlobal = MarketUtils.GLOBAL_SYMBOL_REGEXP.test(codes[1]);
      const globalCodes = isGlobal ? codes[1].split(':') : ['', ''];

      return {
        isin: codes[0],
        ticker: globalCodes[0] || '',
        country: globalCodes[1] || '',
      };
    } else {
      return null;
    }
  }
}
