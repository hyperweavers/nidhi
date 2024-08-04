export interface StockVendorCode {
  etm: string;
  mc?: string;
}

export interface IndexVendorCode {
  etm: ETMIndexVendorCode;
  mc?: string;
}

export interface ETMIndexVendorCode {
  id: string;
  symbol: string;
}
