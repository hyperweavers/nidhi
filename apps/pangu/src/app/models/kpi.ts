import { AdvanceDecline } from './index';
import { Change } from './stock';

export interface Kpi {
  cards: KpiCard[];
}

export interface KpiCard {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  change?: Change;
  advance?: AdvanceDecline;
  decline?: AdvanceDecline;
  routeLink?: string;
}
