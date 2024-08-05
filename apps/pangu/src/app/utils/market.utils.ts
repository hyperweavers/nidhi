import { Direction, ExchangeName } from '../models/market';
import { ScripCode } from '../models/stock';
import { ExchangeCode } from '../models/vendor/etm';

export class MarketUtils {
  public static POSITIVE_WHOLE_NUMBER_REGEXP = new RegExp(/^\d+$/);

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

  public static extractScripCodesFromEtSearchResult(
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
      const listedInNse = !MarketUtils.POSITIVE_WHOLE_NUMBER_REGEXP.test(
        codes[1],
      );

      return {
        isin: codes[0],
        nse: listedInNse ? codes[1] : '',
        bse: listedInNse ? codes[2] : codes[1],
      };
    } else {
      return null;
    }
  }
}
