import { VendorCode } from '../adapters/market.adapter';
import { ScripCode } from './stock';

export interface WatchList {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt?: number;
}

export interface WatchListStock {
  id?: number;
  watchListId: string;
  scripCode: ScripCode;
  vendorCode: VendorCode;
  addedAt?: number;
}
