import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Constants } from '../../constants';
import {
  BsYear,
  CfYear,
  CompanyDetails,
  FinancialTab,
  IpoDetails,
  PnlYear,
  QuarterlyRow,
} from '../../models/ipo';
import { IpoService } from '../../services/ipo.service';
import { IpoDetailsPage } from './ipo-details.page';

describe('IpoDetailsPage', () => {
  let component: IpoDetailsPage;
  let fixture: ComponentFixture<IpoDetailsPage>;

  const ipoServiceMock = {
    getDetailsAndQuote: jest
      .fn()
      .mockReturnValue(of({ details: { ipoDetails: {} }, quote: null })),
    getLinks: jest.fn().mockReturnValue(of({})),
    getFinancials: jest
      .fn()
      .mockReturnValue(of({ pnl: null, quarterly: null, bs: null, cf: null })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpoDetailsPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IpoDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default financial tab as PNL', () => {
    expect(component['activeFinancialTab']()).toBe('pnl');
  });

  it('should have default financial type as standalone', () => {
    expect(component['financialType']()).toBe('standalone');
  });

  it('should return null website when quote has no url', () => {
    expect(component.companyWebsite()).toBeNull();
  });

  it('should prefix https to bare domain website', () => {
    component['stockQuote'].set({
      url: 'www.example.com',
    } as CompanyDetails);
    expect(component.companyWebsite()).toEqual({
      href: 'https://www.example.com',
      label: 'www.example.com',
    });
  });

  it('should keep existing protocol in website href', () => {
    component['stockQuote'].set({
      url: 'http://example.com',
    } as CompanyDetails);
    expect(component.companyWebsite()).toEqual({
      href: 'http://example.com',
      label: 'http://example.com',
    });
  });

  it('should calculate reservation percent from shares and total row', () => {
    const entries = [
      { investorCatg: 'QIB', shares: '1,45,93,022', percentChange: null },
      { investorCatg: 'NII', shares: '43,77,907', percentChange: null },
      {
        investorCatg: 'Total Shares Offered',
        shares: '2,91,86,045',
        percentChange: null,
      },
    ];
    expect(component.getReservationPercent(entries[0], entries)).toBe('50.00%');
    expect(component.getReservationPercent(entries[1], entries)).toBe('15.00%');
    expect(component.getReservationPercent(entries[2], entries)).toBe(
      '100.00%',
    );
  });

  it('should sum shares when no total row exists', () => {
    const entries = [
      { investorCatg: 'QIB', shares: '60', percentChange: null },
      { investorCatg: 'NII', shares: '40', percentChange: null },
    ];
    expect(component.getReservationPercent(entries[0], entries)).toBe('60.00%');
  });

  it('should use the API label short form from parentheses', () => {
    expect(
      component.getReservationShortLabel({
        investorCatg: 'Non Institutional Investors (NIIs)',
        shares: '1',
        percentChange: null,
      }),
    ).toBe('NIIs');
    expect(
      component.getReservationShortLabel({
        investorCatg: 'Retail Individual Investors (RIIs)',
        shares: '1',
        percentChange: null,
      }),
    ).toBe('RIIs');
    expect(
      component.getReservationShortLabel({
        investorCatg: 'Market Makers',
        shares: '1',
        percentChange: null,
      }),
    ).toBe('Market Makers');
    expect(
      component.getReservationShortLabel({
        investorCatg: 'Total Shares Offered',
        shares: '1',
        percentChange: null,
      }),
    ).toBe('Total');
  });

  it('should detect the total reservation row', () => {
    expect(
      component.isReservationTotalRow({
        investorCatg: 'Total Shares Offered',
        shares: '1',
        percentChange: null,
      }),
    ).toBe(true);
    expect(
      component.isReservationTotalRow({
        investorCatg: 'QIB',
        shares: '1',
        percentChange: null,
      }),
    ).toBe(false);
  });

  it('should return placeholder when shares cannot be calculated', () => {
    expect(
      component.getReservationPercent(
        { investorCatg: 'QIB', shares: '', percentChange: null },
        [],
      ),
    ).toBe('--');
    expect(
      component.getReservationPercent(
        { investorCatg: 'QIB', shares: '0', percentChange: null },
        [{ investorCatg: 'QIB', shares: '0', percentChange: null }],
      ),
    ).toBe('--');
  });

  it('should show the price range when min and max exist', () => {
    component['details'].set({
      priceRangeMin: 94,
      priceRangeMax: 99,
    } as IpoDetails);
    expect(component['getPriceBand']()).toBe('₹94 - ₹99');
  });

  it('should show the fixed issue price band when range is missing', () => {
    component['details'].set({
      priceRangeMin: null,
      priceRangeMax: null,
      issuePriceBand: '₹140',
      issuePrice: 140,
    } as IpoDetails);
    expect(component['getPriceBand']()).toBe('₹140');
  });

  it('should fall back to the issue price without a band', () => {
    component['details'].set({
      priceRangeMin: null,
      priceRangeMax: null,
      issuePriceBand: '',
      issuePrice: 140,
    } as IpoDetails);
    expect(component['getPriceBand']()).toBe('₹140');
  });

  it('should show a placeholder when no price info exists', () => {
    component['details'].set({
      priceRangeMin: null,
      priceRangeMax: null,
      issuePriceBand: '',
      issuePrice: null,
    } as IpoDetails);
    expect(component['getPriceBand']()).toBe('--');
  });

  it('should read quarterly values from flat rows', () => {
    const row = {
      year: 2026,
      resultYear: 2026,
      month: 'June',
      salesturnover: 162.454,
      operatingprofit: 24.381,
    } as QuarterlyRow;
    expect(component['getQuarterlyValue'](row, 'salesturnover')).toBe(162.454);
    expect(component['getQuarterlyValue'](row, 'eps')).toBe(0);
  });

  it('should label quarterly chart points with month and year', () => {
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    component['quarterlyData'].set([
      { year: 2026, resultYear: 2026, month: 'June' } as QuarterlyRow,
    ]);
    expect(component['getChartLabels']()).toEqual(['June 2026']);
  });

  it('should use quarterly metrics for the quarterly tab', () => {
    const metrics = component['getQuarterlyMetrics']();
    expect(metrics.map((m) => m.key)).toContain('salesturnover');
    expect(metrics.map((m) => m.key)).toContain('reportedprofitaftertax');
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    expect(component['selectedMetric']()).toBe('salesturnover');
  });

  it('should auto-select consolidated when standalone is empty', () => {
    ipoServiceMock.getFinancials
      .mockReturnValueOnce(
        of({ pnl: null, quarterly: null, bs: null, cf: null }),
      )
      .mockReturnValueOnce(
        of({
          pnl: {
            datainfo: {
              profitandlossinfo: { profitandlossdetails: [{ year: 2025 }] },
            },
          },
          quarterly: null,
          bs: null,
          cf: null,
        }),
      );
    component['loadAllFinancials']('1');
    expect(component['standaloneAvailable']()).toBe(false);
    expect(component['consolidatedAvailable']()).toBe(true);
    expect(component['financialType']()).toBe('consolidated');
    expect(component['pnlData']().length).toBe(1);
    expect(component['hasFinancials']()).toBe(true);
    expect(component['financialsLoaded']()).toBe(true);
  });

  it('should switch displayed financials locally without refetching', () => {
    const standalonePnl = {
      datainfo: {
        profitandlossinfo: { profitandlossdetails: [{ year: 2025 }] },
      },
    };
    const consolidatedPnl = {
      datainfo: {
        profitandlossinfo: { profitandlossdetails: [{ year: 2026 }] },
      },
    };
    ipoServiceMock.getFinancials
      .mockReturnValueOnce(
        of({
          pnl: standalonePnl,
          quarterly: null,
          bs: null,
          cf: null,
        }),
      )
      .mockReturnValueOnce(
        of({
          pnl: consolidatedPnl,
          quarterly: null,
          bs: null,
          cf: null,
        }),
      );
    component['loadAllFinancials']('1');
    expect(component['financialType']()).toBe('standalone');
    expect(component['pnlData']()[0].year).toBe(2025);
    const calls = ipoServiceMock.getFinancials.mock.calls.length;
    component['onFinancialTypeChange']('consolidated');
    expect(ipoServiceMock.getFinancials.mock.calls.length).toBe(calls);
    expect(component['pnlData']()[0].year).toBe(2026);
  });

  it('should keep financials hidden when neither type has data', () => {
    component['loadAllFinancials']('1');
    expect(component['standaloneAvailable']()).toBe(false);
    expect(component['consolidatedAvailable']()).toBe(false);
    expect(component['hasFinancials']()).toBe(false);
    expect(component['financialsLoaded']()).toBe(true);
  });

  it('should clear lists when financials calls fail', () => {
    ipoServiceMock.getFinancials.mockReturnValue(
      throwError(() => new Error('empty')),
    );
    component['loadAllFinancials']('1');
    expect(component['pnlData']()).toEqual([]);
    expect(component['quarterlyData']()).toEqual([]);
    expect(component['bsData']()).toEqual([]);
    expect(component['cfData']()).toEqual([]);
    expect(component['hasFinancials']()).toBe(false);
    ipoServiceMock.getFinancials.mockReturnValue(
      of({ pnl: null, quarterly: null, bs: null, cf: null }),
    );
  });

  it('should prefer top-level objectsOfIssue from the details response', () => {
    const top = [
      { description: 'Top objective', amount: 10, percentChange: 50 },
    ];
    const nested = [
      { description: 'Nested objective', amount: 5, percentChange: 25 },
    ];
    ipoServiceMock.getDetailsAndQuote.mockReturnValueOnce(
      of({
        details: {
          ipoDetails: { objectsOfIssue: nested },
          objectsOfIssue: top,
        },
        quote: null,
      }),
    );
    component['loadDetails']('1');
    expect(component['getObjectsOfIssue']()).toEqual(top);
  });

  it('should fall back to nested objectsOfIssue when top level is empty', () => {
    const nested = [
      { description: 'Nested objective', amount: 5, percentChange: 25 },
    ];
    ipoServiceMock.getDetailsAndQuote.mockReturnValueOnce(
      of({
        details: { ipoDetails: { objectsOfIssue: nested }, objectsOfIssue: [] },
        quote: null,
      }),
    );
    component['loadDetails']('1');
    expect(component['getObjectsOfIssue']()).toEqual(nested);
  });

  it('should return no objectives when the response has none', () => {
    ipoServiceMock.getDetailsAndQuote.mockReturnValueOnce(
      of({ details: { ipoDetails: {} }, quote: null }),
    );
    component['loadDetails']('1');
    expect(component['getObjectsOfIssue']()).toEqual([]);
  });

  it('should load details, quote and links into signals', () => {
    ipoServiceMock.getDetailsAndQuote.mockReturnValueOnce(
      of({
        details: {
          ipoDetails: { companyname: 'Test Co', objectsOfIssue: [] },
          timeline: [{ date: 1, status: true, message: 'Opening Date' }],
          subscription: { totalSubsTimes: 1.5 },
          reservation: [],
          objectsOfIssue: [
            { description: 'Top objective', amount: 10, percentChange: 50 },
          ],
        },
        quote: { url: 'example.com' },
      }),
    );
    ipoServiceMock.getLinks.mockReturnValueOnce(of({ rhpUrl: 'rhp' }));
    component['loadDetails']('1');
    expect(component['details']()?.companyname).toBe('Test Co');
    expect(component['timeline']()).toHaveLength(1);
    expect(component['subscription']()?.totalSubsTimes).toBe(1.5);
    expect(component['loading']()).toBe(false);
    expect(component['links']()?.rhpUrl).toBe('rhp');
    expect(component.companyWebsite()).toEqual({
      href: 'https://example.com',
      label: 'example.com',
    });
  });

  it('should stop loading when details fail', () => {
    ipoServiceMock.getDetailsAndQuote.mockReturnValueOnce(
      throwError(() => new Error('down')),
    );
    component['loadDetails']('1');
    expect(component['loading']()).toBe(false);
  });

  it('should switch financial tabs and metrics', () => {
    component['onFinancialTabChange'](FinancialTab.PNL);
    expect(component['selectedMetric']()).toBe('sales');
    component['onFinancialTabChange'](FinancialTab.BALANCE_SHEET);
    expect(component['selectedMetric']()).toBe('totalassets');
    component['onFinancialTabChange'](FinancialTab.CASH_FLOW);
    expect(component['selectedMetric']()).toBe('netcashflowoperatingActivity');
    component['selectMetric']('eps');
    expect(component['selectedMetric']()).toBe('eps');
  });

  it('should read financial cell values', () => {
    expect(
      component['getPnlValue'](
        { absolute: { sales: 12 } } as unknown as PnlYear,
        'sales',
      ),
    ).toBe(12);
    expect(
      component['getBsValue']({ totalassets: 7 } as BsYear, 'totalassets'),
    ).toBe(7);
    expect(
      component['getCfValue'](
        { netcashflowoperatingActivity: 3 } as CfYear,
        'netcashflowoperatingActivity',
      ),
    ).toBe(3);
  });

  it('should list metrics per financial tab', () => {
    expect(component['getPnlMetrics']().map((m) => m.key)).toContain('sales');
    expect(component['getBsMetrics']().map((m) => m.key)).toContain(
      'totalassets',
    );
    expect(component['getCfMetrics']().map((m) => m.key)).toContain(
      'netcashflowoperatingActivity',
    );
  });

  it('should label charts per tab', () => {
    component['pnlData'].set([
      { year: 2026, absolute: { resultmonth: 'June' } } as PnlYear,
    ]);
    component['onFinancialTabChange'](FinancialTab.PNL);
    expect(component['getChartLabels']()).toEqual(['June 2026']);
    component['bsData'].set([{ year: 2026, months: 'March' } as BsYear]);
    component['onFinancialTabChange'](FinancialTab.BALANCE_SHEET);
    expect(component['getChartLabels']()).toEqual(['March 2026']);
    component['cfData'].set([
      { resultmonth: 'March', resultyear: 2026 } as CfYear,
    ]);
    component['onFinancialTabChange'](FinancialTab.CASH_FLOW);
    expect(component['getChartLabels']()).toEqual(['March 2026']);
  });

  it('should read chart values per tab and default to empty', () => {
    component['pnlData'].set([
      { absolute: { sales: 10 } } as unknown as PnlYear,
    ]);
    component['onFinancialTabChange'](FinancialTab.PNL);
    expect(component['getChartValues']()).toEqual([10]);

    component['quarterlyData'].set([{ salesturnover: 20 } as QuarterlyRow]);
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    expect(component['getChartValues']()).toEqual([20]);

    component['bsData'].set([{ totalassets: 5 } as BsYear]);
    component['onFinancialTabChange'](FinancialTab.BALANCE_SHEET);
    expect(component['getChartValues']()).toEqual([5]);

    component['cfData'].set([{ netcashflowoperatingActivity: 3 } as CfYear]);
    component['onFinancialTabChange'](FinancialTab.CASH_FLOW);
    expect(component['getChartValues']()).toEqual([3]);

    component['activeFinancialTab'].set('unknown' as FinancialTab);
    expect(component['getChartLabels']()).toEqual([]);
    expect(component['getChartValues']()).toEqual([]);
  });

  it('should switch between standalone and consolidated lists', () => {
    ipoServiceMock.getFinancials
      .mockReturnValueOnce(
        of({
          pnl: {
            datainfo: {
              profitandlossinfo: { profitandlossdetails: [{ year: 2025 }] },
            },
          },
          quarterly: null,
          bs: null,
          cf: null,
        }),
      )
      .mockReturnValueOnce(
        of({
          pnl: {
            datainfo: {
              profitandlossinfo: { profitandlossdetails: [{ year: 2026 }] },
            },
          },
          quarterly: null,
          bs: null,
          cf: null,
        }),
      );
    component['loadAllFinancials']('1');
    component['onFinancialTypeChange']('consolidated');
    expect(component['financialType']()).toBe('consolidated');
    expect(component['pnlData']()[0].year).toBe(2026);
    component['onFinancialTypeChange']('standalone');
    expect(component['financialType']()).toBe('standalone');
    expect(component['pnlData']()[0].year).toBe(2025);
    ipoServiceMock.getFinancials.mockReturnValue(
      of({ pnl: null, quarterly: null, bs: null, cf: null }),
    );
  });

  it('should derive the IPO status and chip color', () => {
    const now = Date.now();
    component['details'].set({
      listingdate: now - 1000,
    } as IpoDetails);
    expect(component['getIpoStatus']()).toBe('Listed');
    expect(component['getIpoStatusColor']()).toContain('bg-purple-100');

    component['details'].set({
      closedate: now - 1000,
      listingdate: now + 100000,
    } as IpoDetails);
    expect(component['getIpoStatus']()).toBe('Closed');
    expect(component['getIpoStatusColor']()).toContain('bg-orange-100');

    component['details'].set({
      opendate: now - 1000,
      closedate: now + 100000,
    } as IpoDetails);
    expect(component['getIpoStatus']()).toBe('Open');
    expect(component['getIpoStatusColor']()).toContain('bg-green-100');

    component['details'].set({
      opendate: now + 100000,
      closedate: now + 200000,
    } as IpoDetails);
    expect(component['getIpoStatus']()).toBe('Upcoming');
    expect(component['getIpoStatusColor']()).toContain('bg-blue-100');

    component['details'].set(null);
    expect(component['getIpoStatus']()).toBe('');
  });

  it('should format dates, currency and lakhs', () => {
    expect(component['formatDate'](0)).toBe('--');
    expect(component['formatDate'](Date.UTC(2026, 7, 15, 12))).toBe(
      '15 Aug 2026',
    );
    expect(component['getTimelineDay'](0)).toBe('--');
    expect(component['getTimelineDay'](Date.UTC(2026, 7, 15, 12))).toBe('15');
    expect(component['getTimelineMonthYear'](0)).toBe('--');
    expect(component['getTimelineMonthYear'](Date.UTC(2026, 7, 15, 12))).toBe(
      'AUG 2026',
    );
    expect(component['formatCurrency'](null)).toBe('--');
    expect(component['formatCurrency'](14964)).toBe('₹14,964');
    expect(component['formatLakhs'](null)).toBe('--');
    expect(component['formatLakhs'](150)).toBe('₹1.50 Cr');
    expect(component['formatLakhs'](50)).toBe('₹50.00 L');
  });

  it('should compute timeline progress', () => {
    expect(component['getTimelineProgress']()).toBe(0);
    component['timeline'].set([
      { date: 1, status: true, message: 'A' },
      { date: 2, status: false, message: 'B' },
    ]);
    expect(component['getTimelineProgress']()).toBe(50);
  });

  it('should read subscription totals', () => {
    expect(component['getSubscriptionTotal']()).toBe(0);
    expect(component['getSubscriptionQib']()).toBe(0);
    expect(component['getSubscriptionRetail']()).toBe(0);
    expect(component['getSubscriptionNii']()).toBe(0);
    component['subscription'].set({
      totalSubsTimes: 2,
      qualifiedInst: 1,
      reatilIndv: 0.6,
      nonInst: 0.4,
    } as never);
    expect(component['getSubscriptionTotal']()).toBe(2);
    expect(component['getSubscriptionQib']()).toBe(1);
    expect(component['getSubscriptionRetail']()).toBe(0.6);
    expect(component['getSubscriptionNii']()).toBe(0.4);
  });

  it('should compute subscription percentages per category', () => {
    component['subscription'].set({
      qualifiedInst: 50,
      reatilIndv: 30,
      nonInst: 20,
    } as never);
    expect(component['getSubscriptionPercent']('qib', '200')).toBe('25.00%');
    expect(component['getSubscriptionPercent']('retail', '200')).toBe('15.00%');
    expect(component['getSubscriptionPercent']('nii', '200')).toBe('10.00%');
    expect(component['getSubscriptionPercent']('other', '200')).toBe('--');
    expect(component['getSubscriptionPercent']('qib', '0')).toBe('--');
    expect(component['getSubscriptionPercent']('qib', '')).toBe('--');
  });

  it('should navigate to the detail page', () => {
    const router = TestBed.inject(Router);
    const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component['navigateToDetail']('2269154');
    expect(navSpy).toHaveBeenCalledWith([Constants.routes.IPO, '2269154']);
  });

  it('should expose chart colors', () => {
    expect(component['getChartColors']().length).toBeGreaterThan(0);
  });

  it('should load details on init when route has an id', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [IpoDetailsPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
            },
          },
        },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(IpoDetailsPage);
    const c = f.componentInstance;
    f.detectChanges();
    expect(c['loading']()).toBe(false);
    expect(c['details']()).toBeDefined();
  });

  it('should label quarterly charts for every absolute combination', () => {
    component['quarterlyData'].set([
      {
        absolute: {},
        month: 'May',
        year: 2020,
        resultYear: 2021,
      } as unknown as QuarterlyRow,
      { absolute: null, year: 2020 } as unknown as QuarterlyRow,
    ]);
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    expect(component['getChartLabels']()).toEqual(['May 2021', '2020']);
  });

  it('should fall back to zero for missing chart metrics', () => {
    component['bsData'].set([{ totalassets: 5 } as BsYear]);
    component['onFinancialTabChange'](FinancialTab.BALANCE_SHEET);
    expect(component['getChartValues']()).toEqual([5]);
    component['selectMetric']('missing');
    expect(component['getChartValues']()).toEqual([0]);
    component['cfData'].set([{ netcashflowoperatingActivity: 3 } as CfYear]);
    component['onFinancialTabChange'](FinancialTab.CASH_FLOW);
    expect(component['getChartValues']()).toEqual([3]);
    component['selectMetric']('missing');
    expect(component['getChartValues']()).toEqual([0]);
  });

  it('should return placeholder price band without details', () => {
    component['details'].set(null);
    expect(component['getPriceBand']()).toBe('--');
  });

  it('should handle empty month parts from Intl', () => {
    function FakeDateTimeFormat() {
      return { formatToParts: () => [] };
    }
    const spy = jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(
        FakeDateTimeFormat as unknown as typeof Intl.DateTimeFormat,
      );
    try {
      expect(component['getTimelineMonthYear'](123)).toBe(' ');
    } finally {
      spy.mockRestore();
    }
  });

  it('should default every subscription total when fields are missing', () => {
    component['subscription'].set({} as never);
    expect(component['getSubscriptionTotal']()).toBe(0);
    expect(component['getSubscriptionQib']()).toBe(0);
    expect(component['getSubscriptionRetail']()).toBe(0);
    expect(component['getSubscriptionNii']()).toBe(0);
  });

  it('should handle null subscription and zero shares per category', () => {
    component['subscription'].set(null as never);
    expect(component['getSubscriptionPercent']('retail', '100')).toBe('--');
    expect(component['getSubscriptionPercent']('nii', '100')).toBe('--');
    component['subscription'].set({
      qualifiedInst: 50,
      reatilIndv: 0,
      nonInst: 0,
    } as never);
    expect(component['getSubscriptionPercent']('retail', '200')).toBe('--');
    expect(component['getSubscriptionPercent']('nii', '200')).toBe('--');
  });

  it('should not load details when route has no id', async () => {
    const emptyRoute = {
      snapshot: { paramMap: { get: () => null } },
    } as unknown as ActivatedRoute;
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [IpoDetailsPage],
      providers: [
        provideRouter([]),
        { provide: IpoService, useValue: ipoServiceMock },
        { provide: ActivatedRoute, useValue: emptyRoute },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(IpoDetailsPage);
    const c = f.componentInstance;
    f.detectChanges();
    expect(c['loading']()).toBe(true);
  });

  it('should read quarterly values via absolute fallback and handle missing absolute', () => {
    expect(
      component['getQuarterlyValue'](
        { absolute: { sales: 10 } } as unknown as QuarterlyRow,
        'sales',
      ),
    ).toBe(10);
    expect(
      component['getQuarterlyValue'](
        { absolute: null } as unknown as QuarterlyRow,
        'sales',
      ),
    ).toBe(0);
  });

  it('should label charts when quarterly absolute is missing', () => {
    component['quarterlyData'].set([{ year: 2026 } as unknown as QuarterlyRow]);
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    expect(component['getChartLabels']()).toEqual(['2026']);
  });

  it('should handle empty subscription and investor label fallbacks', () => {
    component['subscription'].set(null as never);
    expect(component['getSubscriptionPercent']('qib', '100')).toBe('--');
    expect(
      component['getReservationShortLabel']({
        investorCatg: '' as unknown as string,
        shares: '1',
        percentChange: null,
      }),
    ).toBe('');
    expect(component['parseShareCount'](null as unknown as string)).toBeNull();
    expect(component['parseShareCount']('not-a-number')).toBeNull();
  });

  it('should handle financial value fallbacks to zero', () => {
    expect(
      component['getPnlValue']({ absolute: {} } as unknown as PnlYear, 'eps'),
    ).toBe(0);
    expect(component['getBsValue']({} as BsYear, 'networth')).toBe(0);
    expect(
      component['getCfValue']({} as CfYear, 'netcashflowoperatingActivity'),
    ).toBe(0);
    expect(
      component['getQuarterlyValue'](
        { absolute: {} } as unknown as QuarterlyRow,
        'salesturnover',
      ),
    ).toBe(0);
  });

  it('should handle missing chart label parts', () => {
    component['quarterlyData'].set([
      { year: undefined, resultYear: undefined } as unknown as QuarterlyRow,
    ]);
    component['onFinancialTabChange'](FinancialTab.QUARTERLY);
    expect(component['getChartLabels']()[0]).toBe('');
    component['pnlData'].set([
      { year: 2026, absolute: {} } as unknown as PnlYear,
    ]);
    component['onFinancialTabChange'](FinancialTab.PNL);
    expect(component['getChartValues']()[0]).toBe(0);
  });
});
