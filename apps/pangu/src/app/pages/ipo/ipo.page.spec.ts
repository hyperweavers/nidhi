import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, throwError } from 'rxjs';

import { Constants } from '../../constants';
import type {
  IpoCalendarDay,
  IpoCalendarItem,
  ListedIpoOverviewItem,
  ListingSoonIpoItem,
  OpenIpoOverviewItem,
  UpcomingIpoOverviewItem,
} from '../../models/ipo';
import { IpoTab } from '../../models/ipo';
import { IpoService } from '../../services/ipo.service';
import { IpoPage } from './ipo.page';

describe('IpoPage', () => {
  let component: IpoPage;
  let fixture: ComponentFixture<IpoPage>;

  const ipoServiceMock = {
    getCalendar: jest.fn().mockReturnValue(of({ calendarList: [] })),
    getDetails: jest.fn().mockReturnValue(of({ ipoDetails: null })),
    getOpenOverviewAll: jest.fn().mockReturnValue(of([])),
    getUpcomingOverview: jest.fn().mockReturnValue(of([])),
    getListingSoon: jest.fn().mockReturnValue(of([])),
    getListedOverview: jest.fn().mockReturnValue(of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpoPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IpoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default active tab as OPEN', () => {
    expect(component['activeTab']()).toBe('open');
  });

  it('should navigate months', () => {
    const initialMonth = component['currentMonth']();
    component.prevMonth();
    expect(component['currentMonth']()).toBe(
      initialMonth === 0 ? 11 : initialMonth - 1,
    );
  });

  it('should load overview tables on init', () => {
    expect(ipoServiceMock.getOpenOverviewAll).toHaveBeenCalled();
    expect(ipoServiceMock.getUpcomingOverview).toHaveBeenCalled();
    expect(ipoServiceMock.getListingSoon).toHaveBeenCalled();
    expect(ipoServiceMock.getListedOverview).toHaveBeenCalled();
  });

  it('should default search query to empty and type filter to all', () => {
    expect(component['searchQuery']()).toBe('');
    expect(component['typeFilter']()).toBe('all');
  });

  it('should update search query and type filter', () => {
    component['onSearchChange']('zomato');
    expect(component['searchQuery']()).toBe('zomato');
    component['onTypeFilterChange']('sme');
    expect(component['typeFilter']()).toBe('sme');
    component['onTypeFilterChange']('all');
    expect(component['typeFilter']()).toBe('all');
  });

  it('should clear the search query on tab change', () => {
    component['onSearchChange']('zomato');
    expect(component['searchQuery']()).toBe('zomato');
    component['onTabChange'](IpoTab.UPCOMING);
    expect(component['searchQuery']()).toBe('');
  });

  describe('calendar day state', () => {
    const noonSec = (month: number, day: number): number =>
      Math.floor(Date.UTC(2026, month, day, 12) / 1000);
    const refDate = new Date(Date.UTC(2026, 7, 15, 12));

    const makeItem = (
      overrides: Partial<IpoCalendarItem> = {},
    ): IpoCalendarItem => ({
      id: '1',
      companyId: 1,
      companyName: 'Test Co',
      ipoType: 'mainboard',
      openDate: 0,
      closeDate: 0,
      listingDate: 0,
      issueSize: 0,
      dayWiseSubscriptions: [],
      objectsOfIssue: [],
      seoName: 'test-co',
      ...overrides,
    });

    it('should map a past listing date to listing', () => {
      const item = makeItem({ listingDate: noonSec(7, 14) });
      expect(component['getDayIpoState'](item, refDate)).toBe('listing');
    });

    it('should map the close date to closing', () => {
      const item = makeItem({
        openDate: noonSec(7, 10),
        closeDate: noonSec(7, 15),
        listingDate: noonSec(7, 20),
      });
      expect(component['getDayIpoState'](item, refDate)).toBe('closing');
    });

    it('should map an in-window date to opening', () => {
      const item = makeItem({
        openDate: noonSec(7, 10),
        closeDate: noonSec(7, 20),
        listingDate: noonSec(7, 25),
      });
      expect(component['getDayIpoState'](item, refDate)).toBe('opening');
    });
  });

  describe('day modal', () => {
    const noonSec = (month: number, day: number): number =>
      Math.floor(Date.UTC(2026, month, day, 12) / 1000);

    const makeItem = (
      companyId: number,
      overrides: Partial<IpoCalendarItem> = {},
    ): IpoCalendarItem => ({
      id: `${companyId}`,
      companyId,
      companyName: `Company ${companyId}`,
      ipoType: 'mainboard',
      openDate: 0,
      closeDate: 0,
      listingDate: 0,
      issueSize: 0,
      dayWiseSubscriptions: [],
      objectsOfIssue: [],
      seoName: `company-${companyId}`,
      ...overrides,
    });

    const makeDay = (
      dayNumber: number,
      items: {
        open: IpoCalendarItem[];
        close: IpoCalendarItem[];
        listed: IpoCalendarItem[];
        display: IpoCalendarItem[];
      } | null,
    ): IpoCalendarDay => ({
      date: new Date(Date.UTC(2026, 7, dayNumber, 12)),
      dayNumber,
      isCurrentMonth: true,
      ipos: items
        ? {
            date: 0,
            displayIpoList: items.display,
            remainingCount: 0,
            openIpoList: items.open,
            closeIpoList: items.close,
            listedIpoList: items.listed,
          }
        : null,
    });

    it('should group modal items Opening, Closing, Listing without duplicates', () => {
      const opening = makeItem(1);
      const closing = makeItem(2);
      const listing = makeItem(3);
      const displayOnly = makeItem(4, {
        openDate: noonSec(7, 10),
        closeDate: noonSec(7, 15),
        listingDate: noonSec(7, 20),
      });
      const day = makeDay(15, {
        open: [opening],
        close: [closing],
        listed: [listing],
        display: [opening, displayOnly],
      });

      const groups = component['modalGroups'](day);
      expect(groups.map((g) => g.key)).toEqual([
        'opening',
        'closing',
        'listing',
      ]);
      expect(groups[0].items.map((i) => i.companyId)).toEqual([1]);
      expect(groups[1].items.map((i) => i.companyId)).toEqual([2, 4]);
      expect(groups[2].items.map((i) => i.companyId)).toEqual([3]);
    });

    it('should refuse to open the modal for an empty day', () => {
      component['openDayModal'](makeDay(16, null));
      expect(component['showDayModal']()).toBe(false);
    });

    it('should step the modal selection across days and clamp at the ends', () => {
      const item = makeItem(1);
      const lists = {
        open: [item],
        close: [],
        listed: [],
        display: [item],
      };
      const days = [makeDay(14, lists), makeDay(15, lists), makeDay(16, lists)];
      component['calendarDays'].set(days);

      component['openDayModal'](days[1]);
      expect(component['showDayModal']()).toBe(true);

      component['stepModalDay'](1);
      expect(component['selectedDay']()?.dayNumber).toBe(16);
      component['stepModalDay'](1);
      expect(component['selectedDay']()?.dayNumber).toBe(16);
      component['stepModalDay'](-1);
      expect(component['selectedDay']()?.dayNumber).toBe(15);

      component['closeDayModal']();
      expect(component['showDayModal']()).toBe(false);
      expect(component['selectedDay']()).toBeNull();
    });
  });

  describe('calendar state filter', () => {
    it('should keep at least one state active', () => {
      expect(component['calStateFilter']().size).toBe(3);
      component['toggleCalStateFilter']('closing');
      expect(component['isCalStateActive']('closing')).toBe(false);
      component['toggleCalStateFilter']('opening');
      expect(component['calStateFilter']().size).toBe(1);
      component['toggleCalStateFilter']('listing');
      expect(component['calStateFilter']().size).toBe(1);
      expect(component['isCalStateActive']('listing')).toBe(true);
      component['toggleCalStateFilter']('closing');
      expect(component['calStateFilter']().size).toBe(2);
    });
  });

  describe('calendar labels', () => {
    it('should return the full month label', () => {
      component['currentMonth'].set(8);
      component['currentYear'].set(2026);
      expect(component['getMonthLabel']()).toBe('September 2026');
    });

    it('should format the modal date with the full month name', () => {
      expect(
        component['formatModalDate'](new Date(Date.UTC(2026, 8, 1, 12))),
      ).toBe('1 September 2026');
    });

    it('should return detail-page badge label and class per IPO type', () => {
      expect(component['ipoTypeLabel']('sme')).toBe('SME');
      expect(component['ipoTypeLabel']('Mainboard')).toBe('Mainboard');
      expect(component['ipoTypeBadgeClass']('sme')).toContain('bg-gray-100');
      expect(component['ipoTypeBadgeClass']('mainboard')).toContain(
        'bg-pink-100',
      );
    });
  });

  describe('global type filter', () => {
    const makeItem = (
      companyId: number,
      ipoType: 'mainboard' | 'sme',
    ): IpoCalendarItem => ({
      id: `${companyId}`,
      companyId,
      companyName: `Company ${companyId}`,
      ipoType,
      openDate: 0,
      closeDate: 0,
      listingDate: 0,
      issueSize: 0,
      dayWiseSubscriptions: [],
      objectsOfIssue: [],
      seoName: `company-${companyId}`,
    });

    it('should filter calendar entries by IPO type', () => {
      const mainboard = makeItem(1, 'mainboard');
      const sme = makeItem(2, 'sme');
      component['calendarView'].set([
        {
          day: {
            date: new Date(Date.UTC(2026, 7, 15, 12)),
            dayNumber: 15,
            isCurrentMonth: true,
            ipos: null,
          },
          entries: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
          ],
          union: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
          ],
          dots: ['bg-green-500'],
          more: 0,
        },
      ]);

      expect(component['filteredCalendarView']()[0].entries.length).toBe(2);
      component['onTypeFilterChange']('sme');
      const filtered = component['filteredCalendarView']()[0];
      expect(filtered.entries.length).toBe(1);
      expect(filtered.entries[0].item.companyId).toBe(2);
    });

    it('should filter modal groups by IPO type', () => {
      const day: IpoCalendarDay = {
        date: new Date(Date.UTC(2026, 7, 15, 12)),
        dayNumber: 15,
        isCurrentMonth: true,
        ipos: {
          date: 0,
          displayIpoList: [],
          remainingCount: 0,
          openIpoList: [makeItem(1, 'mainboard'), makeItem(2, 'sme')],
          closeIpoList: [],
          listedIpoList: [],
        },
      };

      expect(component['modalGroups'](day)[0].items.length).toBe(2);
      component['onTypeFilterChange']('sme');
      const groups = component['modalGroups'](day);
      expect(groups.length).toBe(1);
      expect(groups[0].items.map((i) => i.companyId)).toEqual([2]);
    });

    it('should count hidden union items as more', () => {
      const mainboard = makeItem(1, 'mainboard');
      const sme = makeItem(2, 'sme');
      const extra = makeItem(3, 'sme');
      component['calendarView'].set([
        {
          day: {
            date: new Date(Date.UTC(2026, 7, 15, 12)),
            dayNumber: 15,
            isCurrentMonth: true,
            ipos: null,
          },
          entries: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
          ],
          union: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
            { item: extra, state: 'opening', color: 'bg-green-500' },
          ],
          dots: ['bg-green-500'],
          more: 0,
        },
      ]);

      expect(component['filteredCalendarView']()[0].more).toBe(1);
    });

    it('should update the more count when the type filter changes', () => {
      const mainboard = makeItem(1, 'mainboard');
      const sme = makeItem(2, 'sme');
      const extra = makeItem(3, 'sme');
      component['calendarView'].set([
        {
          day: {
            date: new Date(Date.UTC(2026, 7, 15, 12)),
            dayNumber: 15,
            isCurrentMonth: true,
            ipos: null,
          },
          entries: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
          ],
          union: [
            { item: mainboard, state: 'opening', color: 'bg-green-500' },
            { item: sme, state: 'opening', color: 'bg-green-500' },
            { item: extra, state: 'opening', color: 'bg-green-500' },
          ],
          dots: ['bg-green-500'],
          more: 0,
        },
      ]);

      component['onTypeFilterChange']('sme');
      const smeView = component['filteredCalendarView']()[0];
      expect(smeView.entries.length).toBe(1);
      expect(smeView.more).toBe(1);

      component['onTypeFilterChange']('mainboard');
      const mainboardView = component['filteredCalendarView']()[0];
      expect(mainboardView.entries.length).toBe(1);
      expect(mainboardView.more).toBe(0);
    });
  });
});

describe('IpoPage tab persistence', () => {
  let component: IpoPage;
  let fixture: ComponentFixture<IpoPage>;

  const ipoServiceMock = {
    getCalendar: jest.fn().mockReturnValue(of({ calendarList: [] })),
    getDetails: jest.fn().mockReturnValue(of({ ipoDetails: null })),
    getOpenOverviewAll: jest.fn().mockReturnValue(of([])),
    getUpcomingOverview: jest.fn().mockReturnValue(of([])),
    getListingSoon: jest.fn().mockReturnValue(of([])),
    getListedOverview: jest.fn().mockReturnValue(of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpoPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ tab: 'listed' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IpoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should restore the active tab from query params', () => {
    expect(component['activeTab']()).toBe(IpoTab.LISTED);
  });

  it('should persist the tab to query params on change', () => {
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component['onTabChange'](IpoTab.CLOSED);
    expect(component['activeTab']()).toBe(IpoTab.CLOSED);
    expect(navSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ tab: 'closed' }),
      }),
    );
  });

  it('should omit the tab param for the default tab', () => {
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component['onTabChange'](IpoTab.OPEN);
    expect(navSpy).toHaveBeenCalled();
    for (const call of navSpy.mock.calls) {
      expect(call[1]?.queryParams).not.toHaveProperty('tab');
    }
  });
});

describe('IpoPage calendar and tables', () => {
  let component: IpoPage;
  let fixture: ComponentFixture<IpoPage>;

  const ipoServiceMock = {
    getCalendar: jest.fn().mockReturnValue(of({ calendarList: [] })),
    getDetails: jest.fn().mockReturnValue(of({ ipoDetails: null })),
    getOpenOverviewAll: jest.fn().mockReturnValue(of([])),
    getUpcomingOverview: jest.fn().mockReturnValue(of([])),
    getListingSoon: jest.fn().mockReturnValue(of([])),
    getListedOverview: jest.fn().mockReturnValue(of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpoPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IpoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const noonSec = (month: number, day: number): number =>
    Math.floor(Date.UTC(2026, month, day, 12) / 1000);

  const makeItem = (
    companyId: number,
    overrides: Partial<IpoCalendarItem> = {},
  ): IpoCalendarItem => ({
    id: `${companyId}`,
    companyId,
    companyName: `Company ${companyId}`,
    ipoType: 'mainboard',
    openDate: 0,
    closeDate: 0,
    listingDate: 0,
    issueSize: 0,
    dayWiseSubscriptions: [],
    objectsOfIssue: [],
    seoName: `company-${companyId}`,
    ...overrides,
  });

  it('should wrap to December of the previous year', () => {
    component['currentMonth'].set(0);
    component['currentYear'].set(2026);
    component.prevMonth();
    expect(component['currentMonth']()).toBe(11);
    expect(component['currentYear']()).toBe(2025);
  });

  it('should wrap to January of the next year', () => {
    component['currentMonth'].set(11);
    component['currentYear'].set(2026);
    component.nextMonth();
    expect(component['currentMonth']()).toBe(0);
    expect(component['currentYear']()).toBe(2027);
  });

  it('should sort open IPOs by open date descending', () => {
    ipoServiceMock.getOpenOverviewAll.mockReturnValueOnce(
      of([
        { companyName: 'A', openDate: 100 },
        { companyName: 'B', openDate: 300 },
        { companyName: 'C', openDate: 200 },
      ] as OpenIpoOverviewItem[]),
    );
    component['loadOverviewTables']();
    expect(component['openIpos']().map((i) => i.companyName)).toEqual([
      'B',
      'C',
      'A',
    ]);
    expect(component['tabRowsLoading']()).toBe(false);
  });

  it('should sort upcoming IPOs by open date ascending', () => {
    ipoServiceMock.getUpcomingOverview.mockReturnValueOnce(
      of([
        { companyName: 'A', openDate: 300 },
        { companyName: 'B', openDate: 100 },
      ] as UpcomingIpoOverviewItem[]),
    );
    component['loadOverviewTables']();
    expect(component['upcomingIpos']().map((i) => i.companyName)).toEqual([
      'B',
      'A',
    ]);
  });

  it('should sort listing-soon and listed IPOs by listing date descending', () => {
    ipoServiceMock.getListingSoon.mockReturnValueOnce(
      of([
        { companyName: 'A', listingDate: 100 },
        { companyName: 'B', listingDate: 400 },
      ] as ListingSoonIpoItem[]),
    );
    ipoServiceMock.getListedOverview.mockReturnValueOnce(
      of([
        { companyName: 'X', listingDate: 50 },
        { companyName: 'Y', listingDate: 150 },
      ] as ListedIpoOverviewItem[]),
    );
    component['loadOverviewTables']();
    expect(component['closedIpos']().map((i) => i.companyName)).toEqual([
      'B',
      'A',
    ]);
    expect(component['listedIpos']().map((i) => i.companyName)).toEqual([
      'Y',
      'X',
    ]);
  });

  it('should stop loading when overview requests fail', () => {
    ipoServiceMock.getOpenOverviewAll.mockReturnValueOnce(
      throwError(() => new Error('down')),
    );
    ipoServiceMock.getUpcomingOverview.mockReturnValueOnce(
      throwError(() => new Error('down')),
    );
    ipoServiceMock.getListingSoon.mockReturnValueOnce(
      throwError(() => new Error('down')),
    );
    ipoServiceMock.getListedOverview.mockReturnValueOnce(
      throwError(() => new Error('down')),
    );
    component['loadOverviewTables']();
    expect(component['tabRowsLoading']()).toBe(false);
    expect(component['openIpos']()).toEqual([]);
  });

  it('should filter every overview list by search text and type', () => {
    component['openIpos'].set([
      { companyName: 'Alpha', ipoType: 'mainboard' },
      { companyName: 'Beta', ipoType: 'sme' },
    ] as OpenIpoOverviewItem[]);
    component['upcomingIpos'].set([
      { companyName: 'Alpha Up', ipoType: 'sme' },
    ] as UpcomingIpoOverviewItem[]);
    component['closedIpos'].set([
      { companyName: 'Alpha Closed', ipoType: 'mainboard' },
    ] as ListingSoonIpoItem[]);
    component['listedIpos'].set([
      { companyName: 'Alpha Listed', ipoType: 'mainboard' },
    ] as ListedIpoOverviewItem[]);

    expect(component['filteredOpen']()).toHaveLength(2);
    expect(component['filteredUpcoming']()).toHaveLength(1);
    expect(component['filteredClosed']()).toHaveLength(1);
    expect(component['filteredListed']()).toHaveLength(1);

    component['onSearchChange']('alpha');
    expect(component['filteredOpen']().map((i) => i.companyName)).toEqual([
      'Alpha',
    ]);
    expect(component['filteredUpcoming']()).toHaveLength(1);
    expect(component['filteredClosed']()).toHaveLength(1);
    expect(component['filteredListed']()).toHaveLength(1);

    component['onSearchChange']('');
    component['onTypeFilterChange']('sme');
    expect(component['filteredOpen']().map((i) => i.companyName)).toEqual([
      'Beta',
    ]);
    expect(component['filteredUpcoming']()).toHaveLength(1);
    expect(component['filteredClosed']()).toHaveLength(0);
    expect(component['filteredListed']()).toHaveLength(0);
  });

  it('should persist search, type and tab to query params', () => {
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component['onSearchChange']('  beta ');
    expect(navSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ search: 'beta' }),
      }),
    );

    component['onTypeFilterChange']('sme');
    expect(navSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ type: 'sme' }),
      }),
    );

    component['onTabChange'](IpoTab.UPCOMING);
    component['onSearchChange']('x');
    expect(navSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          search: 'x',
          tab: 'upcoming',
        }),
      }),
    );
  });

  it('should navigate to the detail page', () => {
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component['navigateToDetail'](2269154);
    expect(navSpy).toHaveBeenCalledWith([Constants.routes.IPO, 2269154]);
  });

  it('should classify display-only items by date', () => {
    const displayOnly = makeItem(9);
    const day: IpoCalendarDay = {
      date: new Date(Date.UTC(2026, 7, 15, 12)),
      dayNumber: 15,
      isCurrentMonth: true,
      ipos: {
        date: 0,
        displayIpoList: [displayOnly],
        remainingCount: 0,
        openIpoList: [],
        closeIpoList: [],
        listedIpoList: [],
      },
    };
    const groups = component['modalGroups'](day);
    expect(groups.map((g) => g.key)).toEqual(['opening']);
    expect(groups[0].items.map((i) => i.companyId)).toEqual([9]);
  });

  it('should return no groups when the type filter excludes everything', () => {
    const day: IpoCalendarDay = {
      date: new Date(Date.UTC(2026, 7, 15, 12)),
      dayNumber: 15,
      isCurrentMonth: true,
      ipos: {
        date: 0,
        displayIpoList: [],
        remainingCount: 0,
        openIpoList: [makeItem(1, { ipoType: 'mainboard' })],
        closeIpoList: [],
        listedIpoList: [],
      },
    };
    component['onTypeFilterChange']('sme');
    expect(component['modalGroups'](day)).toEqual([]);
  });

  it('should parse lot counts and format lot sizes', () => {
    expect(component['parseLotCount'](null)).toBeNull();
    expect(component['parseLotCount'](1500)).toBe(1500);
    expect(component['parseLotCount']('1,500')).toBe(1500);
    expect(component['parseLotCount']('none')).toBeNull();
    expect(component['formatLotSize'](null)).toBe('--');
    expect(component['formatLotSize'](100)).toBe('100 shares');
  });

  it('should parse max prices and compute lot values', () => {
    expect(component['parseMaxPrice'](null)).toBeNull();
    expect(component['parseMaxPrice'](99)).toBe(99);
    expect(component['parseMaxPrice']('₹90 – ₹95')).toBe(95);
    expect(component['parseMaxPrice']('')).toBeNull();
    expect(component['parseMaxPrice']('abc')).toBeNull();
    expect(component['getMaxLotValue']('₹90 – ₹95', 100)).toBe('₹9,500');
    expect(component['getMaxLotValue'](null, 100)).toBe('--');
    expect(component['getMaxLotValue']('₹95', null)).toBe('--');
  });

  it('should color gains and losses', () => {
    expect(component['gainClass']('+5%')).toContain('text-green-600');
    expect(component['gainClass']('-3%')).toContain('text-red-600');
    expect(component['gainClass']('5%')).toBe('');
    expect(component['gainClass']('')).toBe('');
    expect(component['gainClass'](null)).toBe('');
  });

  it('should format dates and handle empty epochs', () => {
    expect(component['formatDate'](0)).toBe('--');
    expect(component['formatDate'](Date.UTC(2026, 7, 15, 12))).toBe(
      '15 Aug 2026',
    );
  });

  it('should handle millisecond timestamps and numeric reference dates', () => {
    const item = makeItem(1, { listingDate: Date.UTC(2026, 6, 1) });
    expect(component['getDayIpoState'](item, Date.UTC(2026, 7, 15))).toBe(
      'listing',
    );
    expect(component['getDayIpoStateColor']('listing')).toBe('bg-blue-500');
    expect(component['getDayIpoStateColor']('closing')).toBe('bg-amber-500');
    expect(component['getDayIpoStateColor']('opening')).toBe('bg-green-500');
  });

  it('should report items per tab and search text', () => {
    expect(component['hasActiveTabItems']()).toBe(false);
    component['openIpos'].set([{ companyName: 'A' }] as OpenIpoOverviewItem[]);
    expect(component['hasActiveTabItems']()).toBe(true);

    component['onTabChange'](IpoTab.LISTED);
    expect(component['hasActiveTabItems']()).toBe(false);
    component['listedIpos'].set([
      { companyName: 'L' },
    ] as ListedIpoOverviewItem[]);
    expect(component['hasActiveTabItems']()).toBe(true);

    component['onTabChange'](IpoTab.UPCOMING);
    component['upcomingIpos'].set([
      { companyName: 'U' },
    ] as UpcomingIpoOverviewItem[]);
    expect(component['hasActiveTabItems']()).toBe(true);

    component['onTabChange'](IpoTab.CLOSED);
    component['closedIpos'].set([{ companyName: 'C' }] as ListingSoonIpoItem[]);
    expect(component['hasActiveTabItems']()).toBe(true);

    component['openIpos'].set([]);
    component['upcomingIpos'].set([]);
    component['closedIpos'].set([]);
    component['listedIpos'].set([]);
    component['onSearchChange']('zzz');
    expect(component['hasActiveTabItems']()).toBe(true);
  });

  it('should stop loading when the calendar request fails', () => {
    ipoServiceMock.getCalendar.mockReturnValueOnce(
      throwError(() => new Error('net')),
    );
    component['loadCalendar']();
    expect(component['loading']()).toBe(false);
  });

  it('should build a padded month grid and match API days', () => {
    component['currentMonth'].set(7);
    component['currentYear'].set(2026);
    const apiDate = Date.UTC(2026, 7, 15, 6, 30);
    const item = makeItem(7, {
      openDate: noonSec(7, 10),
      closeDate: noonSec(7, 20),
      listingDate: noonSec(7, 25),
    });
    ipoServiceMock.getCalendar.mockReturnValueOnce(
      of({
        calendarList: [
          {
            date: apiDate,
            displayIpoList: [item],
            remainingCount: 0,
            openIpoList: [],
            closeIpoList: [],
            listedIpoList: [],
          },
        ],
      }),
    );
    component['loadCalendar']();

    const days = component['calendarDays']();
    expect(days).toHaveLength(42);
    expect(days[0].isCurrentMonth).toBe(false);
    expect(days[0].dayNumber).toBe(26);
    expect(days[5].dayNumber).toBe(31);
    expect(days[41].isCurrentMonth).toBe(false);
    expect(days[41].dayNumber).toBe(5);
    const matched = days.find((d) => d.ipos !== null);
    expect(matched?.dayNumber).toBe(15);
    expect(matched?.isCurrentMonth).toBe(true);
    expect(component['calendarView']()).toHaveLength(42);
    expect(component['loading']()).toBe(false);
  });

  it('should build calendar entries deduped and sorted with union extras', () => {
    const refDate = new Date(Date.UTC(2026, 7, 15, 12));
    const listing = makeItem(1, { listingDate: noonSec(7, 14) });
    const closing = makeItem(2, {
      openDate: noonSec(7, 10),
      closeDate: noonSec(7, 15),
      listingDate: noonSec(7, 20),
    });
    const opening = makeItem(3, {
      openDate: noonSec(7, 10),
      closeDate: noonSec(7, 20),
      listingDate: noonSec(7, 25),
    });
    const openingDupState = makeItem(5, {
      openDate: noonSec(7, 10),
      closeDate: noonSec(7, 20),
      listingDate: noonSec(7, 25),
    });
    const extraClosing = makeItem(4, {
      openDate: noonSec(7, 10),
      closeDate: noonSec(7, 15),
      listingDate: noonSec(7, 20),
    });
    const emptyDay: IpoCalendarDay = {
      date: refDate,
      dayNumber: 16,
      isCurrentMonth: true,
      ipos: null,
    };
    const day: IpoCalendarDay = {
      date: refDate,
      dayNumber: 15,
      isCurrentMonth: true,
      ipos: {
        date: 0,
        displayIpoList: [listing, closing, opening, openingDupState, listing],
        remainingCount: 0,
        openIpoList: [],
        closeIpoList: [extraClosing],
        listedIpoList: [],
      },
    };
    component['buildCalendarView']([emptyDay, day]);
    const views = component['calendarView']();
    expect(views[0].entries).toEqual([]);
    expect(views[0].dots).toEqual([]);
    expect(views[1].entries.map((e) => e.item.companyId)).toEqual([3, 5, 2, 1]);
    expect(views[1].union.map((e) => e.item.companyId)).toEqual([
      3, 5, 2, 1, 4,
    ]);
    expect(views[1].dots).toEqual([
      'bg-green-500',
      'bg-amber-500',
      'bg-blue-500',
    ]);
  });

  it('should detect today', () => {
    const now = new Date();
    const today: IpoCalendarDay = {
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
      dayNumber: 1,
      isCurrentMonth: true,
      ipos: null,
    };
    expect(component['isToday'](today)).toBe(true);
    expect(
      component['isToday']({
        ...today,
        date: new Date(2000, 0, 1),
      }),
    ).toBe(false);
  });

  it('should ignore stepping without a selection or unknown day', () => {
    component['stepModalDay'](1);
    expect(component['selectedDay']()).toBeNull();
    const known: IpoCalendarDay = {
      date: new Date(Date.UTC(2026, 7, 14, 12)),
      dayNumber: 14,
      isCurrentMonth: true,
      ipos: null,
    };
    const unknown: IpoCalendarDay = {
      date: new Date(Date.UTC(2026, 7, 20, 12)),
      dayNumber: 20,
      isCurrentMonth: true,
      ipos: null,
    };
    component['calendarDays'].set([known]);
    component['selectedDay'].set(unknown);
    component['stepModalDay'](1);
    expect(component['selectedDay']()).toBe(unknown);
  });
});

describe('IpoPage query param restoration', () => {
  let component: IpoPage;
  let fixture: ComponentFixture<IpoPage>;

  const ipoServiceMock = {
    getCalendar: jest.fn().mockReturnValue(of({ calendarList: [] })),
    getDetails: jest.fn().mockReturnValue(of({ ipoDetails: null })),
    getOpenOverviewAll: jest.fn().mockReturnValue(of([])),
    getUpcomingOverview: jest.fn().mockReturnValue(of([])),
    getListingSoon: jest.fn().mockReturnValue(of([])),
    getListedOverview: jest.fn().mockReturnValue(of([])),
  };

  const setup = async (params: Record<string, string>): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [IpoPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(params) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IpoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should restore search, type and tab from query params', async () => {
    await setup({ search: 'alpha', type: 'sme', tab: 'upcoming' });
    expect(component['searchQuery']()).toBe('alpha');
    expect(component['typeFilter']()).toBe('sme');
    expect(component['activeTab']()).toBe(IpoTab.UPCOMING);
  });

  it('should ignore invalid query param values', async () => {
    await setup({ type: 'foo', tab: 'foo' });
    expect(component['searchQuery']()).toBe('');
    expect(component['typeFilter']()).toBe('all');
    expect(component['activeTab']()).toBe(IpoTab.OPEN);
  });
});
