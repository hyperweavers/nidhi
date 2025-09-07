import { CurrencyMatrix } from '../models/currency';

export class CurrencyUtils {
  public static getConversionRate(
    currencyMatrix: CurrencyMatrix,
    from: string,
    to: string,
  ): number {
    if (!currencyMatrix[from] || !currencyMatrix[from][to]) {
      console.error(`Conversion rate not found for ${from} to ${to}`);

      return -1;
    }

    return currencyMatrix[from][to];
  }

  public static convertCurrency(value: number, conversionRate: number): number {
    return value * conversionRate;
  }
}
