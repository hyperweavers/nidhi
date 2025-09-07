export interface Currency {
  code: string;
  country?: string;
  icon?: string;
}

export interface CurrencyMatrix {
  [key: string]: {
    [key: string]: number;
  };
}
