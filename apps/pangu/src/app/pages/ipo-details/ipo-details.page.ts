import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { catchError, forkJoin, of } from 'rxjs';

import { Constants } from '../../constants';
import {
  BsResponse,
  BsYear,
  CfResponse,
  CfYear,
  CompanyDetails,
  FinancialTab,
  FinancialType,
  IpoDetails,
  IpoLinksResponse,
  IpoObjectOfIssue,
  IpoReservation,
  IpoSubscription,
  IpoTimelineEntry,
  PnlResponse,
  PnlYear,
  QuarterlyResponse,
  QuarterlyRow,
} from '../../models/ipo';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { IpoService } from '../../services/ipo.service';

interface FinancialLists {
  pnl: PnlYear[];
  quarterly: QuarterlyRow[];
  bs: BsYear[];
  cf: CfYear[];
}

const EMPTY_FINANCIAL_LISTS: FinancialLists = {
  pnl: [],
  quarterly: [],
  bs: [],
  cf: [],
};

/** Vendor dates may arrive as seconds or milliseconds — normalize to ms. */
function toMs(v: number): number {
  return v != null && v < 1_000_000_000_000 ? v * 1000 : v;
}

/** Strips the time part so status compares calendar dates, not instants. */
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

@UntilDestroy()
@Component({
  selector: 'app-ipo-details',
  standalone: true,
  imports: [NgClass, FormsModule, DecimalPipe, ValueOrPlaceholderPipe],
  templateUrl: './ipo-details.page.html',
  styleUrl: './ipo-details.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IpoDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ipoService = inject(IpoService);

  protected readonly Constants = Constants;

  protected readonly details = signal<IpoDetails | null>(null);
  protected readonly links = signal<IpoLinksResponse | null>(null);
  protected readonly timeline = signal<IpoTimelineEntry[]>([]);
  protected readonly subscription = signal<IpoSubscription | null>(null);
  protected readonly reservation = signal<IpoReservation[]>([]);
  protected readonly objectsOfIssue = signal<IpoObjectOfIssue[]>([]);
  protected readonly stockQuote = signal<CompanyDetails | null>(null);

  protected companyWebsite(): { href: string; label: string } | null {
    const url = this.stockQuote()?.url?.trim();
    if (!url) return null;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return { href, label: url };
  }
  protected readonly loading = signal(true);
  protected readonly activeFinancialTab = signal<FinancialTab>(
    FinancialTab.PNL,
  );
  protected readonly financialType = signal<string>(FinancialType.STANDALONE);

  protected readonly pnlData = signal<PnlYear[]>([]);
  protected readonly quarterlyData = signal<QuarterlyRow[]>([]);
  protected readonly bsData = signal<BsYear[]>([]);
  protected readonly cfData = signal<CfYear[]>([]);
  protected readonly hasFinancials = signal(false);
  protected readonly standaloneAvailable = signal(false);
  protected readonly consolidatedAvailable = signal(false);
  protected readonly financialsLoaded = signal(false);

  private standaloneLists: FinancialLists = { ...EMPTY_FINANCIAL_LISTS };
  private consolidatedLists: FinancialLists = { ...EMPTY_FINANCIAL_LISTS };

  protected readonly selectedMetric = signal<string>('sales');
  protected readonly FinancialTab = FinancialTab;

  ngOnInit(): void {
    const companyId = this.route.snapshot.paramMap.get('id');

    if (companyId) {
      this.loadDetails(companyId);
    }
  }

  protected onFinancialTabChange(tab: FinancialTab): void {
    this.activeFinancialTab.set(tab);

    switch (tab) {
      case FinancialTab.PNL:
        this.selectedMetric.set('sales');
        break;
      case FinancialTab.QUARTERLY:
        this.selectedMetric.set('salesturnover');
        break;
      case FinancialTab.BALANCE_SHEET:
        this.selectedMetric.set('totalassets');
        break;
      case FinancialTab.CASH_FLOW:
        this.selectedMetric.set('netcashflowoperatingActivity');
        break;
    }
  }

  protected onFinancialTypeChange(type: string): void {
    this.financialType.set(type);
    this.applyFinancialType();
  }

  protected selectMetric(metric: string): void {
    this.selectedMetric.set(metric);
  }

  protected getPnlValue(item: PnlYear, key: string): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((item.absolute as any)[key] as number) ?? 0;
  }

  protected getQuarterlyValue(item: QuarterlyRow, key: string): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat = ((item as any)[key] as number) ?? null;
    if (flat !== null && flat !== undefined) return flat;
    if (!item.absolute) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((item.absolute as any)[key] as number) ?? 0;
  }

  protected getBsValue(item: BsYear, key: string): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((item as any)[key] as number) ?? 0;
  }

  protected getCfValue(item: CfYear, key: string): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((item as any)[key] as number) ?? 0;
  }

  protected getPnlMetrics(): { key: string; label: string }[] {
    return [
      { key: 'sales', label: 'Revenue' },
      { key: 'operatingprofit', label: 'Operating Profit' },
      { key: 'ebitda', label: 'EBITDA' },
      { key: 'netprofit', label: 'Net Profit' },
      { key: 'eps', label: 'EPS' },
      { key: 'depreciation', label: 'Depreciation' },
      { key: 'interestname', label: 'Interest' },
    ];
  }

  protected getQuarterlyMetrics(): { key: string; label: string }[] {
    return [
      { key: 'salesturnover', label: 'Revenue' },
      { key: 'operatingprofit', label: 'Operating Profit' },
      { key: 'ebitda', label: 'EBITDA' },
      { key: 'reportedprofitaftertax', label: 'Net Profit' },
      { key: 'eps', label: 'EPS' },
      { key: 'depreciation', label: 'Depreciation' },
      { key: 'interest', label: 'Interest' },
    ];
  }

  protected getBsMetrics(): { key: string; label: string }[] {
    return [
      { key: 'totalassets', label: 'Total Assets' },
      { key: 'networth', label: 'Net Worth' },
      { key: 'totalliabilities', label: 'Borrowings' },
      { key: 'reservesandsurplus', label: 'Reserves' },
      { key: 'grossblock', label: 'Gross Block' },
    ];
  }

  protected getCfMetrics(): { key: string; label: string }[] {
    return [
      {
        key: 'netcashflowoperatingActivity',
        label: 'Operating',
      },
      {
        key: 'netcashusedininvestingactivity',
        label: 'Investing',
      },
      {
        key: 'netcashusedinfinanceactivity',
        label: 'Financing',
      },
      {
        key: 'netincdecincashandequivlnt',
        label: 'Net Change',
      },
    ];
  }

  protected getChartLabels(): string[] {
    switch (this.activeFinancialTab()) {
      case FinancialTab.PNL:
        return this.pnlData().map((d) => `${d.absolute.resultmonth} ${d.year}`);
      case FinancialTab.QUARTERLY:
        return this.quarterlyData().map((d) => {
          const month = d.absolute?.resultmonth ?? d.month ?? '';
          const year = d.absolute?.resultyear ?? d.resultYear ?? d.year ?? '';
          return `${month} ${year}`.trim();
        });
      case FinancialTab.BALANCE_SHEET:
        return this.bsData().map((d) => `${d.months} ${d.year}`);
      case FinancialTab.CASH_FLOW:
        return this.cfData().map((d) => `${d.resultmonth} ${d.resultyear}`);
      default:
        return [];
    }
  }

  protected getChartValues(): number[] {
    const metric = this.selectedMetric();

    switch (this.activeFinancialTab()) {
      case FinancialTab.PNL:
        return this.pnlData().map(
          (d) => (d.absolute as unknown as Record<string, number>)[metric] || 0,
        );
      case FinancialTab.QUARTERLY:
        return this.quarterlyData().map((d) =>
          this.getQuarterlyValue(d, metric),
        );
      case FinancialTab.BALANCE_SHEET:
        return this.bsData().map(
          (d) => (d as unknown as Record<string, number>)[metric] || 0,
        );
      case FinancialTab.CASH_FLOW:
        return this.cfData().map(
          (d) => (d as unknown as Record<string, number>)[metric] || 0,
        );
      default:
        return [];
    }
  }

  private loadDetails(companyId: string): void {
    this.loading.set(true);

    this.ipoService
      .getDetailsAndQuote(companyId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: ({ details, quote }) => {
          this.details.set(details.ipoDetails);
          this.timeline.set(details.timeline || []);
          this.subscription.set(details.subscription || null);
          this.reservation.set(details.reservation || []);
          // Objectives live on the top-level response (res.objectsOfIssue);
          // fall back to the nested copy when the top level is empty.
          const objectives = details.objectsOfIssue?.length
            ? details.objectsOfIssue
            : details.ipoDetails?.objectsOfIssue || [];
          this.objectsOfIssue.set(objectives);
          this.stockQuote.set(quote);
          this.loading.set(false);

          this.loadLinks(companyId);
          this.loadAllFinancials(companyId);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private loadLinks(companyId: string): void {
    this.ipoService
      .getLinks(companyId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (links) => {
          this.links.set(links);
        },
      });
  }

  private loadAllFinancials(companyId: string): void {
    forkJoin({
      standalone: this.ipoService
        .getFinancials(companyId, FinancialType.STANDALONE)
        .pipe(catchError(() => of(null))),
      consolidated: this.ipoService
        .getFinancials(companyId, FinancialType.CONSOLIDATED)
        .pipe(catchError(() => of(null))),
    })
      .pipe(untilDestroyed(this))
      .subscribe(({ standalone, consolidated }) => {
        this.standaloneLists = this.extractFinancialLists(standalone);
        this.consolidatedLists = this.extractFinancialLists(consolidated);
        this.standaloneAvailable.set(
          this.hasAnyFinancialData(this.standaloneLists),
        );
        this.consolidatedAvailable.set(
          this.hasAnyFinancialData(this.consolidatedLists),
        );
        if (!this.standaloneAvailable() && this.consolidatedAvailable()) {
          this.financialType.set(FinancialType.CONSOLIDATED);
        } else {
          this.financialType.set(FinancialType.STANDALONE);
        }
        this.applyFinancialType();
        this.hasFinancials.set(
          this.standaloneAvailable() || this.consolidatedAvailable(),
        );
        this.financialsLoaded.set(true);
      });
  }

  private extractFinancialLists(
    resp: {
      pnl: PnlResponse;
      quarterly: QuarterlyResponse;
      bs: BsResponse;
      cf: CfResponse;
    } | null,
  ): FinancialLists {
    return {
      pnl: resp?.pnl?.datainfo?.profitandlossinfo?.profitandlossdetails || [],
      quarterly:
        resp?.quarterly?.datainfo?.quarterlyresultsinfo
          ?.companyQuarterlyResultslist || [],
      bs: resp?.bs?.datainfo?.balancesheetinfo?.companyBalanceSheetList || [],
      cf: resp?.cf?.datainfo?.cashFlowList?.companyfinancialcashflowlist || [],
    };
  }

  private hasAnyFinancialData(lists: FinancialLists): boolean {
    return (
      lists.pnl.length > 0 ||
      lists.quarterly.length > 0 ||
      lists.bs.length > 0 ||
      lists.cf.length > 0
    );
  }

  private applyFinancialType(): void {
    const lists =
      this.financialType() === FinancialType.CONSOLIDATED
        ? this.consolidatedLists
        : this.standaloneLists;
    this.pnlData.set(lists.pnl);
    this.quarterlyData.set(lists.quarterly);
    this.bsData.set(lists.bs);
    this.cfData.set(lists.cf);
  }

  protected getIpoStatus(): string {
    const d = this.details();

    if (!d) return '';

    const today = startOfDay(Date.now());
    const listing = d.listingdate ? startOfDay(toMs(d.listingdate)) : 0;
    const closed = d.closedate ? startOfDay(toMs(d.closedate)) : 0;
    const open = d.opendate ? startOfDay(toMs(d.opendate)) : 0;

    if (listing) {
      if (listing === today) {
        return 'Listing';
      }

      if (listing < today) {
        return 'Listed';
      }
    }

    if (closed && (!listing || listing > today)) {
      if (closed === today) {
        return 'Closing';
      }

      if (closed < today) {
        return 'Closed';
      }
    }

    if (open && closed > today) {
      if (open === today) {
        return 'Opening';
      }

      if (open < today) {
        return 'Open';
      }
    }

    return 'Upcoming';
  }

  protected getIpoStatusColor(): string {
    const status = this.getIpoStatus();

    switch (status) {
      case 'Open':
      case 'Opening':
      case 'Closing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Closed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Listed':
      case 'Listing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  }

  protected getPriceBand(): string {
    const d = this.details();
    if (!d) return '--';
    const min = d.priceRangeMin;
    const max = d.priceRangeMax;
    if (
      min !== null &&
      min !== undefined &&
      max !== null &&
      max !== undefined
    ) {
      return `₹${min} - ₹${max}`;
    }
    if (d.issuePriceBand) return d.issuePriceBand;
    if (d.issuePrice !== null && d.issuePrice !== undefined) {
      return `₹${d.issuePrice}`;
    }
    return '--';
  }

  protected formatDate(epoch: number): string {
    if (!epoch) return '--';
    return new Date(toMs(epoch)).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  }

  protected getTimelineDay(epoch: number): string {
    if (!epoch) return '--';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
    }).format(new Date(toMs(epoch)));
  }

  protected getTimelineMonthYear(epoch: number): string {
    if (!epoch) return '--';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      year: 'numeric',
    }).formatToParts(new Date(toMs(epoch)));
    const get = (type: string): string =>
      parts.find((p) => p.type === type)?.value || '';
    return `${get('month')} ${get('year')}`.toUpperCase();
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '--';
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  protected formatLakhs(value: number | null | undefined): string {
    if (value === null || value === undefined) return '--';
    if (value >= 100) {
      return `₹${(value / 100).toFixed(2)} Cr`;
    }
    return `₹${value.toFixed(2)} L`;
  }

  protected getTimelineProgress(): number {
    const steps = this.timeline();
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.status).length;
    return (completed / steps.length) * 100;
  }

  protected getSubscriptionTotal(): number {
    const s = this.subscription();
    if (!s) return 0;
    return s.totalSubsTimes || 0;
  }

  protected getSubscriptionQib(): number {
    const s = this.subscription();
    if (!s) return 0;
    return s.qualifiedInst || 0;
  }

  protected getSubscriptionRetail(): number {
    const s = this.subscription();
    if (!s) return 0;
    return s.reatilIndv || 0;
  }

  protected getSubscriptionNii(): number {
    const s = this.subscription();
    if (!s) return 0;
    return s.nonInst || 0;
  }

  protected isReservationTotalRow(entry: IpoReservation): boolean {
    return entry.investorCatg.toLowerCase().includes('total');
  }

  protected getReservationShortLabel(entry: IpoReservation): string {
    if (this.isReservationTotalRow(entry)) return 'Total';
    const label = entry.investorCatg || '';
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1] : label;
  }

  protected getReservationPercent(
    entry: IpoReservation,
    entries: IpoReservation[],
  ): string {
    const shares = this.parseShareCount(entry.shares);
    const total = this.getReservationTotal(entries);
    if (shares == null || !total) return '--';
    return `${((shares / total) * 100).toFixed(2)}%`;
  }

  private parseShareCount(value: string | null | undefined): number | null {
    if (!value) return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getReservationTotal(entries: IpoReservation[]): number {
    const totalRow = entries.find((entry) =>
      entry.investorCatg.toLowerCase().includes('total'),
    );
    const fromRow = totalRow ? this.parseShareCount(totalRow.shares) : null;
    if (fromRow) return fromRow;
    return entries.reduce(
      (sum, entry) => sum + (this.parseShareCount(entry.shares) || 0),
      0,
    );
  }

  protected getSubscriptionPercent(
    category: string,
    totalShares: string,
  ): string {
    const shares = parseFloat(totalShares);
    if (!shares || shares === 0) return '--';

    let catShares = 0;

    switch (category) {
      case 'qib':
        catShares = this.subscription()?.qualifiedInst || 0;
        break;
      case 'retail':
        catShares = this.subscription()?.reatilIndv || 0;
        break;
      case 'nii':
        catShares = this.subscription()?.nonInst || 0;
        break;
    }

    if (!catShares) return '--';

    const pct = (catShares / shares) * 100;

    return `${pct.toFixed(2)}%`;
  }

  protected getObjectsOfIssue(): {
    description: string;
    amount?: number;
    percentChange?: number;
  }[] {
    return this.objectsOfIssue();
  }

  protected navigateToDetail(companyId: string): void {
    this.router.navigate([Constants.routes.IPO, companyId]);
  }

  protected getChartColors(): string[] {
    return [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)',
    ];
  }
}
