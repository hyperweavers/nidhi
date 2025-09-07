import { Currency } from './currency';
import { Stock } from './stock';

export interface Plan {
  id: string; // Database UUID
  stock: Stock;
  lockInPeriod: number;
  currencies: {
    purchase: Currency;
    contribution: Currency;
  };
}
