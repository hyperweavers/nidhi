export interface IntraDay {
  s: IntraDayStatus;
  data?: IntraDayData[];
  nextTime?: number;
}

export interface IntraDayData {
  time: number;
  value: number;
}

export interface SearchResultSecondary {
  refresh_details: RefreshDetails;
  result: Result[];
  tabs: Tab[];
}

export interface RefreshDetails {
  flag: string;
}

export interface Result {
  id: string;
  name: string;
  shortname: string;
  category: string;
  category_id: string;
  topic_id: string;
  bseid: string;
  nseid: string;
  isinid: string;
  fund_family: string;
  fund_class: string;
  expiry_date: string;
  expiry_date_d: string;
  instrument: string;
  ex: string;
  track_id: string;
  symbol: string;
  msg_type: string;
  weight: string;
  did: string;
  fullnm: string;
  sector: string | null;
  sector_id: string;
  market: string;
  www_url: string;
}

export interface Tab {
  name: string;
  url: string;
  uniqueId: string;
}

export interface VendorCode {
  primary: string;
}

export enum IntraDayStatus {
  OK = 'ok',
  NO_DATA = 'no_data',
  ERROR = 'error',
}
