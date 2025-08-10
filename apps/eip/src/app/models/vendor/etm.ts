export interface CurrencyListResponse {
  searchresult: CurrencyData[];
}

export interface CurrencyData {
  country: string;
  countryIconMsid: string;
  countryName: string;
  currencyCode: string;
}
