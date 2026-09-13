import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { Constants } from '../../constants';
import {
  IpoCalendarDay,
  IpoCalendarItem,
  IpoCalendarState,
  IpoTab,
  IpoTypeFilter,
  ListedIpoOverviewItem,
  ListingSoonIpoItem,
  OpenIpoOverviewItem,
  UpcomingIpoOverviewItem,
} from '../../models/ipo';
import { ValueOrPlaceholderPipe } from '../../pipes/value-or-placeholder.pipe';
import { IpoService } from '../../services/ipo.service';

interface CalendarDayEntry {
  item: IpoCalendarItem;
  state: IpoCalendarState;
  color: string;
}

interface CalendarDayView {
  day: IpoCalendarDay;
  entries: CalendarDayEntry[];
  union: CalendarDayEntry[];
  dots: string[];
  more: number;
}

const CALENDAR_STATES: IpoCalendarState[] = ['opening', 'closing', 'listing'];

@UntilDestroy()
@Component({
  selector: 'app-ipo',
  standalone: true,
  imports: [NgClass, FormsModule, ValueOrPlaceholderPipe],
  templateUrl: './ipo.page.html',
  styleUrl: './ipo.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IpoPage implements OnInit {
  private readonly ipoService = inject(IpoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly IpoTab = IpoTab;

  protected readonly currentMonth = signal(new Date().getMonth());
  protected readonly currentYear = signal(new Date().getFullYear());
  protected readonly calendarDays = signal<IpoCalendarDay[]>([]);
  protected readonly calendarView = signal<CalendarDayView[]>([]);
  protected readonly calStateFilter = signal<Set<IpoCalendarState>>(
    new Set(CALENDAR_STATES),
  );
  protected readonly activeTab = signal<IpoTab>(IpoTab.OPEN);
  protected readonly loading = signal(true);

  protected readonly openIpos = signal<OpenIpoOverviewItem[]>([]);
  protected readonly upcomingIpos = signal<UpcomingIpoOverviewItem[]>([]);
  protected readonly closedIpos = signal<ListingSoonIpoItem[]>([]);
  protected readonly listedIpos = signal<ListedIpoOverviewItem[]>([]);

  protected readonly selectedDay = signal<IpoCalendarDay | null>(null);
  protected readonly showDayModal = signal(false);

  protected readonly searchQuery = signal('');
  protected readonly typeFilter = signal<IpoTypeFilter>('all');
  protected readonly tabRowsLoading = signal(false);

  protected readonly filteredCalendarView = computed(() => {
    const active = this.calStateFilter();
    const type = this.typeFilter();
    const matches = (entry: CalendarDayEntry): boolean =>
      active.has(entry.state) &&
      (type === 'all' || (entry.item.ipoType || '').toLowerCase() === type);
    return this.calendarView().map((view) => {
      const entries = view.entries.filter(matches);
      const unionIds = new Set<number>();
      for (const entry of view.union) {
        if (matches(entry)) {
          unionIds.add(entry.item.companyId);
        }
      }
      return {
        day: view.day,
        entries,
        union: view.union,
        dots: this.distinctColors(entries),
        more: Math.max(0, unionIds.size - entries.length),
      };
    });
  });

  protected readonly filteredOpen = computed(() =>
    this.filterRows(this.openIpos()),
  );
  protected readonly filteredUpcoming = computed(() =>
    this.filterRows(this.upcomingIpos()),
  );
  protected readonly filteredClosed = computed(() =>
    this.filterRows(this.closedIpos()),
  );
  protected readonly filteredListed = computed(() =>
    this.filterRows(this.listedIpos()),
  );

  ngOnInit(): void {
    this.restoreFromQueryParams();
    this.loadCalendar();
    this.loadOverviewTables();
  }

  protected prevMonth(): void {
    const d = this.currentMonth();
    const y = this.currentYear();

    if (d === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(y - 1);
    } else {
      this.currentMonth.set(d - 1);
    }

    this.loadCalendar();
  }

  protected nextMonth(): void {
    const d = this.currentMonth();
    const y = this.currentYear();

    if (d === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(y + 1);
    } else {
      this.currentMonth.set(d + 1);
    }

    this.loadCalendar();
  }

  protected onTabChange(tab: IpoTab): void {
    this.activeTab.set(tab);
    if (this.searchQuery()) {
      this.searchQuery.set('');
    }
    this.syncQueryParams();
  }

  private loadOverviewTables(): void {
    this.tabRowsLoading.set(true);
    let pending = 4;
    const done = (): void => {
      pending -= 1;
      if (pending <= 0) this.tabRowsLoading.set(false);
    };

    this.ipoService
      .getOpenOverviewAll()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (items) => {
          this.openIpos.set(
            [...items].sort((a, b) => (b.openDate || 0) - (a.openDate || 0)),
          );
          done();
        },
        error: () => done(),
      });

    this.ipoService
      .getUpcomingOverview()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (items) => {
          this.upcomingIpos.set(
            [...items].sort((a, b) => (a.openDate || 0) - (b.openDate || 0)),
          );
          done();
        },
        error: () => done(),
      });

    this.ipoService
      .getListingSoon()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (items) => {
          this.closedIpos.set(
            [...items].sort(
              (a, b) => (b.listingDate || 0) - (a.listingDate || 0),
            ),
          );
          done();
        },
        error: () => done(),
      });

    this.ipoService
      .getListedOverview()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (items) => {
          this.listedIpos.set(
            [...items].sort(
              (a, b) => (b.listingDate || 0) - (a.listingDate || 0),
            ),
          );
          done();
        },
        error: () => done(),
      });
  }

  private filterRows<T extends { companyName: string; ipoType?: string }>(
    items: T[],
  ): T[] {
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.typeFilter();
    return items.filter(
      (i) =>
        (!q || i.companyName.toLowerCase().includes(q)) &&
        (type === 'all' || (i.ipoType || '').toLowerCase() === type),
    );
  }

  protected onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.syncQueryParams();
  }

  protected onTypeFilterChange(type: IpoTypeFilter): void {
    this.typeFilter.set(type);
    this.syncQueryParams();
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const search = params.get('search');
    if (search) {
      this.searchQuery.set(search);
    }
    const type = params.get('type') as IpoTypeFilter | null;
    if (type === 'all' || type === 'mainboard' || type === 'sme') {
      this.typeFilter.set(type);
    }
    const tab = params.get('tab') as IpoTab | null;
    if (tab && Object.values(IpoTab).includes(tab)) {
      this.activeTab.set(tab);
    }
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string> = {};
    const search = this.searchQuery().trim();
    if (search) {
      queryParams['search'] = search;
    }
    if (this.typeFilter() !== 'all') {
      queryParams['type'] = this.typeFilter();
    }
    if (this.activeTab() !== IpoTab.OPEN) {
      queryParams['tab'] = this.activeTab();
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  protected navigateToDetail(companyId: number): void {
    this.router.navigate([Constants.routes.IPO, companyId]);
  }

  protected toggleCalStateFilter(state: IpoCalendarState): void {
    const next = new Set(this.calStateFilter());
    if (next.has(state)) {
      if (next.size > 1) {
        next.delete(state);
      }
    } else {
      next.add(state);
    }
    this.calStateFilter.set(next);
  }

  protected isCalStateActive(state: IpoCalendarState): boolean {
    return this.calStateFilter().has(state);
  }

  protected openDayModal(day: IpoCalendarDay): void {
    if (this.modalGroups(day).length === 0) return;
    this.selectedDay.set(day);
    this.showDayModal.set(true);
  }

  protected closeDayModal(): void {
    this.showDayModal.set(false);
    this.selectedDay.set(null);
  }

  protected stepModalDay(direction: 1 | -1): void {
    const current = this.selectedDay();
    if (!current) return;
    const days = this.calendarDays();
    const idx = days.findIndex(
      (d) => d.date.getTime() === current.date.getTime(),
    );
    if (idx === -1) return;
    const next = days[idx + direction];
    if (next) {
      this.selectedDay.set(next);
    }
  }

  protected modalGroups(
    day: IpoCalendarDay | null,
  ): { key: IpoCalendarState; label: string; items: IpoCalendarItem[] }[] {
    if (!day?.ipos) return [];
    const groups: Record<IpoCalendarState, IpoCalendarItem[]> = {
      opening: [],
      closing: [],
      listing: [],
    };
    const seen = new Set<number>();
    const push = (state: IpoCalendarState, item: IpoCalendarItem): void => {
      if (seen.has(item.companyId)) return;
      seen.add(item.companyId);
      groups[state].push(item);
    };
    const ipos = day.ipos;
    for (const item of ipos.openIpoList || []) push('opening', item);
    for (const item of ipos.closeIpoList || []) push('closing', item);
    for (const item of ipos.listedIpoList || []) push('listing', item);
    for (const item of ipos.displayIpoList || []) {
      if (!seen.has(item.companyId)) {
        push(this.getDayIpoState(item, day.date), item);
      }
    }
    const result: {
      key: IpoCalendarState;
      label: string;
      items: IpoCalendarItem[];
    }[] = [
      { key: 'opening', label: 'Opening', items: groups.opening },
      { key: 'closing', label: 'Closing', items: groups.closing },
      { key: 'listing', label: 'Listing', items: groups.listing },
    ];
    const type = this.typeFilter();
    return result
      .map((group) => ({
        ...group,
        items:
          type === 'all'
            ? group.items
            : group.items.filter(
                (item) => (item.ipoType || '').toLowerCase() === type,
              ),
      }))
      .filter((group) => group.items.length > 0);
  }

  private distinctColors(entries: CalendarDayEntry[]): string[] {
    const rank: Record<IpoCalendarState, number> = {
      opening: 0,
      closing: 1,
      listing: 2,
    };
    const seen = new Map<string, number>();
    for (const entry of entries) {
      if (!seen.has(entry.color)) {
        seen.set(entry.color, rank[entry.state]);
      }
    }
    return [...seen.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([color]) => color);
  }

  protected parseLotCount(
    lotSize: string | number | null | undefined,
  ): number | null {
    if (lotSize == null) return null;
    if (typeof lotSize === 'number') return lotSize;
    const match = lotSize.replace(/,/g, '').match(/[\d.]+/);
    if (!match) return null;
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  protected formatLotSize(lotSize: string | number | null | undefined): string {
    const count = this.parseLotCount(lotSize);
    if (count == null) return '--';
    return `${count} shares`;
  }

  protected parseMaxPrice(
    value: string | number | null | undefined,
  ): number | null {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const cleaned = value.replace(/[₹,\s]/g, '');
    if (!cleaned) return null;
    const parts = cleaned
      .split(/[–—-]/)
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n));
    if (parts.length === 0) return null;
    return parts[parts.length - 1];
  }

  protected getMaxLotValue(
    price: string | number | null | undefined,
    lotSize: string | number | null | undefined,
  ): string {
    const maxPrice = this.parseMaxPrice(price);
    const lotCount = this.parseLotCount(lotSize);
    if (maxPrice == null || lotCount == null) return '--';
    return `₹${Math.round(maxPrice * lotCount).toLocaleString('en-IN')}`;
  }

  protected gainClass(value: string | null | undefined): string {
    if (!value) return '';
    if (value.trim().startsWith('+'))
      return 'text-green-600 dark:text-green-400';
    if (value.trim().startsWith('-')) return 'text-red-600 dark:text-red-500';
    return '';
  }

  protected getCalendarKey(): string {
    const month = this.currentMonth();
    const year = this.currentYear();
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];

    return `${months[month]}_${year}`;
  }

  protected getMonthLabel(): string {
    const month = this.currentMonth();
    const year = this.currentYear();
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return `${months[month]} ${year}`;
  }

  protected ipoTypeLabel(ipoType: string | null | undefined): string {
    return (ipoType || '').toLowerCase() === 'sme' ? 'SME' : 'Mainboard';
  }

  protected ipoTypeBadgeClass(ipoType: string | null | undefined): string {
    return (ipoType || '').toLowerCase() === 'sme'
      ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
  }

  protected formatDate(epoch: number): string {
    if (!epoch) return '--';
    return this.formatDayMonthYear(new Date(epoch), 'short');
  }

  protected formatModalDate(date: Date): string {
    return this.formatDayMonthYear(date, 'long');
  }

  private formatDayMonthYear(date: Date, month: 'short' | 'long'): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month,
      year: 'numeric',
    }).formatToParts(date);
    const get = (type: string): string =>
      parts.find((p) => p.type === type)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')}`;
  }

  protected getDayIpoState(
    item: IpoCalendarItem,
    date: Date | number,
  ): IpoCalendarState {
    const toMs = (v: number): number =>
      v != null && v < 1_000_000_000_000 ? v * 1000 : v;
    const toISTDay = (ms: number): string =>
      new Date(toMs(ms)).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

    const refDay = toISTDay(date instanceof Date ? date.getTime() : date);
    const listingDay = item.listingDate ? toISTDay(item.listingDate) : null;
    const closeDay = item.closeDate ? toISTDay(item.closeDate) : null;

    if (listingDay && refDay >= listingDay) {
      return 'listing';
    }

    if (closeDay && refDay >= closeDay) {
      return 'closing';
    }

    return 'opening';
  }

  protected getDayIpoStateColor(state: IpoCalendarState): string {
    switch (state) {
      case 'listing':
        return 'bg-blue-500';
      case 'closing':
        return 'bg-amber-500';
      default:
        return 'bg-green-500';
    }
  }

  private getStateRank(item: IpoCalendarItem, date: Date | number): number {
    const state = this.getDayIpoState(item, date);
    if (state === 'opening') return 0;
    if (state === 'closing') return 1;
    return 2;
  }

  protected hasActiveTabItems(): boolean {
    const tab = this.activeTab();
    const count =
      tab === IpoTab.LISTED
        ? this.listedIpos().length
        : tab === IpoTab.UPCOMING
          ? this.upcomingIpos().length
          : tab === IpoTab.CLOSED
            ? this.closedIpos().length
            : this.openIpos().length;
    return count > 0 || this.searchQuery().trim().length > 0;
  }

  private loadCalendar(): void {
    this.loading.set(true);
    const key = this.getCalendarKey();

    this.ipoService
      .getCalendar(key)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (response) => {
          this.buildFullMonthCalendar(response.calendarList || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private buildFullMonthCalendar(
    apiDays: {
      date: number;
      displayIpoList: IpoCalendarItem[];
      remainingCount: number;
      openIpoList: IpoCalendarItem[];
      closeIpoList: IpoCalendarItem[];
      listedIpoList: IpoCalendarItem[];
    }[],
  ): void {
    const year = this.currentYear();
    const month = this.currentMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const toMs = (v: number): number =>
      v != null && v < 1_000_000_000_000 ? v * 1000 : v;
    const toISTDay = (ms: number): string =>
      new Date(toMs(ms)).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });

    const apiMap = new Map(apiDays.map((d) => [toISTDay(d.date), d]));

    const days: IpoCalendarDay[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const date = new Date(year, month - 1, dayNum);
      days.push({
        date,
        dayNumber: dayNum,
        isCurrentMonth: false,
        ipos: null,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const istDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ipos = apiMap.get(istDay) || null;
      days.push({
        date,
        dayNumber: d,
        isCurrentMonth: true,
        ipos,
      });
    }

    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      days.push({
        date,
        dayNumber: d,
        isCurrentMonth: false,
        ipos: null,
      });
    }

    this.calendarDays.set(days);
    this.buildCalendarView(days);
  }

  private buildCalendarView(days: IpoCalendarDay[]): void {
    this.calendarView.set(
      days.map((day) => {
        if (!day.ipos) {
          return { day, entries: [], union: [], dots: [], more: 0 };
        }
        const seen = new Set<number>();
        const entries: CalendarDayEntry[] = [];
        for (const item of day.ipos.displayIpoList || []) {
          if (seen.has(item.companyId)) continue;
          seen.add(item.companyId);
          const state = this.getDayIpoState(item, day.date);
          entries.push({ item, state, color: this.getDayIpoStateColor(state) });
        }
        entries.sort(
          (a, b) =>
            this.getStateRank(a.item, day.date) -
            this.getStateRank(b.item, day.date),
        );
        const union: CalendarDayEntry[] = [...entries];
        for (const item of [
          ...(day.ipos.openIpoList || []),
          ...(day.ipos.closeIpoList || []),
          ...(day.ipos.listedIpoList || []),
        ]) {
          if (seen.has(item.companyId)) continue;
          seen.add(item.companyId);
          const state = this.getDayIpoState(item, day.date);
          union.push({ item, state, color: this.getDayIpoStateColor(state) });
        }
        return {
          day,
          entries,
          union,
          dots: this.distinctColors(union),
          more: 0,
        };
      }),
    );
  }

  protected isToday(day: IpoCalendarDay): boolean {
    const today = new Date();
    return (
      day.date.getDate() === today.getDate() &&
      day.date.getMonth() === today.getMonth() &&
      day.date.getFullYear() === today.getFullYear()
    );
  }
}
