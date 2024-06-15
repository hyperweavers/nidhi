export interface StockEntity {
  id: string; // Primary Key (UUID)
  name: string;
  symbol: string; // NSE symbol
  vendorCode: string;
}

export interface TransactionEntity {
  id: string; // Primary Key (UUID)
  stockId: string; // Foreign Key to Stock
  type: TransactionType;
  date: number;
  quantity: number;
  price: number;
  charges: number;
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}
