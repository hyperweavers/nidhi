import { LoggerAdapter } from '@nidhi/shared-logger';
import { CurrencyMatrix } from '../models/currency';

export class CurrencyUtils {
  public static getConversionRate(
    currencyMatrix: CurrencyMatrix,
    from: string,
    to: string,
    logger?: LoggerAdapter,
  ): number {
    if (!currencyMatrix[from] || !currencyMatrix[from][to]) {
      logger?.captureException(
        new Error(`Conversion rate not found for ${from} to ${to}`),
      );

      return -1;
    }

    return currencyMatrix[from][to];
  }

  public static convertCurrency(value: number, conversionRate: number): number {
    return value * conversionRate;
  }
}
