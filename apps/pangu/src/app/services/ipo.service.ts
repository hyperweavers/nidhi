import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import {
  BsResponse,
  CfResponse,
  CompanyDetails,
  IpoCalendarResponse,
  IpoDetailsResponse,
  IpoLinksResponse,
  ListedIpoOverviewItem,
  ListingSoonIpoItem,
  OpenIpoOverviewItem,
  PnlResponse,
  QuarterlyResponse,
  UpcomingIpoOverviewItem,
} from '../models/ipo';
import { MarketService } from './core/market.service';

@Injectable({ providedIn: 'root' })
export class IpoService {
  private readonly marketService = inject(MarketService);

  getCalendar(calendarKey: string): Observable<IpoCalendarResponse> {
    return this.marketService.getIpoCalendar(calendarKey);
  }

  getDetails(companyId: string): Observable<IpoDetailsResponse> {
    return this.marketService.getIpoDetails(companyId);
  }

  getLinks(companyId: string): Observable<IpoLinksResponse> {
    return this.marketService.getIpoDetailsOnly(companyId);
  }

  getOpenOverviewAll(): Observable<OpenIpoOverviewItem[]> {
    return this.marketService.getIpoOverviewOpen(1).pipe(
      switchMap((first) => {
        const items = first.openIpoList || [];
        const totalPages = first.openIpoPageSummary?.totalpages || 1;
        if (totalPages <= 1) {
          return of(items);
        }
        const rest = [];
        for (let pageNo = 2; pageNo <= totalPages; pageNo++) {
          rest.push(this.marketService.getIpoOverviewOpen(pageNo));
        }
        return forkJoin(rest).pipe(
          map((pages) => [
            ...items,
            ...pages.flatMap((page) => page.openIpoList || []),
          ]),
        );
      }),
    );
  }

  getUpcomingOverview(): Observable<UpcomingIpoOverviewItem[]> {
    return this.marketService
      .getIpoOverviewUpcoming()
      .pipe(map((res) => res.upcomingIpoList || []));
  }

  getListingSoon(): Observable<ListingSoonIpoItem[]> {
    return this.marketService
      .getIpoOverviewListing()
      .pipe(map((res) => res.listingSoonIpoList || []));
  }

  getListedOverview(): Observable<ListedIpoOverviewItem[]> {
    return this.marketService
      .getIpoListedOverview()
      .pipe(map((res) => res.results || []));
  }

  getStockQuote(companyId: string): Observable<CompanyDetails | null> {
    if (!companyId) {
      return of(null);
    }

    return this.marketService.getIpoStockQuote(companyId);
  }

  getDetailsAndQuote(companyId: string): Observable<{
    details: IpoDetailsResponse;
    quote: CompanyDetails | null;
  }> {
    return forkJoin({
      details: this.getDetails(companyId),
      quote: this.getStockQuote(companyId).pipe(catchError(() => of(null))),
    });
  }

  getFinancials(
    companyId: string,
    type = 'standalone',
  ): Observable<{
    pnl: PnlResponse;
    quarterly: QuarterlyResponse;
    bs: BsResponse;
    cf: CfResponse;
  }> {
    return this.marketService.getIpoFinancials(companyId, type);
  }
}
