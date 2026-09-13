export type {
  BsResponse,
  BsYear,
  CfResponse,
  CfYear,
  CompanyDetails,
  IpoCalendarDate,
  IpoCalendarItem,
  IpoCalendarResponse,
  IpoDayWiseSub,
  IpoDetails,
  IpoDetailsResponse,
  IpoLeadManager,
  IpoLinksResponse,
  IpoObjectOfIssue,
  IpoOverviewPageSummary,
  IpoReservation,
  IpoSubscription,
  IpoTimelineEntry,
  ListedIpoOverviewItem,
  ListedIposOverviewResponse,
  ListingSoonIpoItem,
  ListingSoonIpoResponse,
  OpenIpoOverviewItem,
  OpenIpoOverviewResponse,
  PnlResponse,
  PnlYear,
  QuarterlyResponse,
  QuarterlyRow,
  UpcomingIpoOverviewItem,
  UpcomingIpoOverviewResponse,
} from './vendor/etm';

import type { IpoCalendarDate } from './vendor/etm';

// === App-level types ===
export interface IpoCalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  ipos: IpoCalendarDate | null;
}

// === App-level types ===
export type IpoTypeFilter = 'all' | 'mainboard' | 'sme';

export type IpoCalendarState = 'opening' | 'closing' | 'listing';

// === App-level enums ===
export enum IpoTab {
  OPEN = 'open',
  UPCOMING = 'upcoming',
  CLOSED = 'closed',
  LISTED = 'listed',
}

export enum FinancialTab {
  PNL = 'pnl',
  QUARTERLY = 'quarterly',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
}

export enum FinancialType {
  STANDALONE = 'standalone',
  CONSOLIDATED = 'consolidated',
}
