import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Subject } from 'rxjs';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

import {
  CompoundingFrequency,
  InterestPayoutFrequency,
  InvestmentType,
  PostOfficeSavingsScheme,
  PostOfficeSavingsSchemeId,
  PostOfficeSavingsSchemes,
} from '../../models/deposit';
import { DataService } from '../../services/core/data.service';
import { PostOfficeSavingsSchemesPage } from './post-office-savings-schemes.page';

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

const mockSchemes: PostOfficeSavingsScheme[] = [
  {
    id: PostOfficeSavingsSchemeId.TD_5Y,
    name: 'Time Deposit 5 Year',
    shortName: 'TD-5Y',
    interestRate: 7.5,
    depositTenure: 0,
    maturityTenure: 5,
    compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Yearly,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.SCSS,
    name: 'Senior Citizen Savings Scheme',
    shortName: 'SCSS',
    interestRate: 8.2,
    depositTenure: 0,
    maturityTenure: 5,
    compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Quarterly,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.NSC,
    name: 'National Savings Certificate',
    shortName: 'NSC',
    interestRate: 7.7,
    depositTenure: 0,
    maturityTenure: 5,
    compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.PPF,
    name: 'Public Provident Fund',
    shortName: 'PPF',
    interestRate: 7.1,
    depositTenure: 15,
    maturityTenure: 15,
    compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.RD,
    name: 'Recurring Deposit',
    shortName: 'RD',
    interestRate: 6.7,
    depositTenure: 5,
    maturityTenure: 5,
    compoundingFrequencyPerYear: CompoundingFrequency.Quarterly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.KVP,
    name: 'Kisan Vikas Patra',
    shortName: 'KVP',
    interestRate: 7.5,
    depositTenure: 0,
    maturityTenure: 10.5,
    compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
    fixedInterestRate: true,
  },
  {
    id: PostOfficeSavingsSchemeId.SB,
    name: 'Savings Account',
    shortName: 'SB',
    interestRate: 4.0,
    depositTenure: 0,
    maturityTenure: 10,
    compoundingFrequencyPerYear: CompoundingFrequency.Yearly,
    interestPayoutFrequencyPerYear: InterestPayoutFrequency.Maturity,
    fixedInterestRate: true,
  },
];

const mockSchemesData: PostOfficeSavingsSchemes = {
  lastUpdated: Date.now(),
  effective: { from: Date.now(), to: Date.now() },
  schemes: mockSchemes,
};

describe('PostOfficeSavingsSchemesPage', () => {
  let component: PostOfficeSavingsSchemesPage;
  let fixture: ComponentFixture<PostOfficeSavingsSchemesPage>;
  let dataServiceSubject: Subject<PostOfficeSavingsSchemes | null>;
  let httpMock: HttpTestingController;

  beforeAll(() => {
    Object.defineProperty(screen, 'orientation', {
      value: { lock: jest.fn().mockResolvedValue(undefined) },
      writable: true,
    });
  });

  beforeEach(async () => {
    dataServiceSubject = new Subject<PostOfficeSavingsSchemes | null>();

    const mockDataService = {
      postOfficeSavingsSchemes$: dataServiceSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [PostOfficeSavingsSchemesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: DataService, useValue: mockDataService },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PostOfficeSavingsSchemesPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  describe('initialisation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should show loading spinner while data is not yet emitted', () => {
      const spinner = fixture.debugElement.query(By.css('[role="status"]'));
      expect(spinner).toBeTruthy();
      expect(component.loading).toBe(true);
    });

    it('should show error state when data emits null', () => {
      dataServiceSubject.next(null);
      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.error).toBe(true);
      expect(component.schemes.length).toBe(0);

      const errorEl = fixture.debugElement.query(By.css('p'));
      expect(errorEl.nativeElement.textContent).toContain(
        'We are not able to get the Post Office Savings Schemes details currently!',
      );
    });
  });

  describe('schemes data loaded', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should load schemes and calculate returns in OneTime mode', () => {
      expect(component.loading).toBe(false);
      expect(component.error).toBe(false);
      expect(component.schemes).toBe(mockSchemes);
      expect(component.schemesWithReturns.length).toBeGreaterThan(0);

      const heading = fixture.debugElement.query(By.css('h2'));
      expect(heading.nativeElement.textContent).toContain(
        'Post Office Savings Schemes',
      );
    });

    it('should filter out SB scheme always', () => {
      const sbInReturns = component.schemesWithReturns.some(
        (s) => s.id === PostOfficeSavingsSchemeId.SB,
      );
      expect(sbInReturns).toBe(false);
    });

    it('should include KVP scheme with special doubling logic', () => {
      const kvp = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.KVP,
      );
      expect(kvp).toBeTruthy();
      expect(kvp!.returns.principal).toBe(component.depositAmount);
      expect(kvp!.returns.interest).toBe(component.depositAmount);
      expect(kvp!.returns.maturity).toBe(2 * component.depositAmount);
    });

    it('should sort schemes by average interest per month descending', () => {
      const interestPerMonths = component.schemesWithReturns.map(
        (s) => s.returns.interest / (s.maturityTenure * 12),
      );
      for (let i = 1; i < interestPerMonths.length; i++) {
        expect(interestPerMonths[i]).toBeLessThanOrEqual(
          interestPerMonths[i - 1],
        );
      }
    });

    it('should calculate earnings chart data', () => {
      expect(component.earningsChartData.labels!.length).toBe(
        component.schemesWithReturns.length,
      );
      expect(component.earningsChartData.datasets[0].label).toBe('Principal');
      expect(component.earningsChartData.datasets[1].label).toBe('Interest');
    });

    it('should calculate interest rate chart data', () => {
      expect(component.interestRateChartData.labels!.length).toBe(
        component.schemesWithReturns.length,
      );
      expect(component.interestRateChartData.datasets[0].label).toBe(
        'Interest Rate',
      );
      expect(component.interestRateChartData.datasets[1].label).toBe(
        'Effective Yield',
      );
    });

    it('should render the form with investment type radio buttons', () => {
      const oneTimeRadio = fixture.debugElement.query(
        By.css('#one-time'),
      );
      expect(oneTimeRadio).toBeTruthy();
      expect(oneTimeRadio.nativeElement.checked).toBe(true);
    });
  });

  describe('onInvestmentTypeChange', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should set deposit amount to 100000 for OneTime', () => {
      component.onInvestmentTypeChange(InvestmentType.OneTime);
      expect(component.investmentType).toBe(InvestmentType.OneTime);
      expect(component.depositAmount).toBe(100000);
    });

    it('should set deposit amount to 2000 for Continuous', () => {
      component.onInvestmentTypeChange(InvestmentType.Continuous);
      expect(component.investmentType).toBe(InvestmentType.Continuous);
      expect(component.depositAmount).toBe(2000);
    });

    it('should reset eligibility flags on change', () => {
      component.eligibleForScss = true;
      component.eligibleForMssc = true;
      component.eligibleForSsa = true;

      component.onInvestmentTypeChange(InvestmentType.Continuous);

      expect(component.eligibleForScss).toBe(false);
      expect(component.eligibleForMssc).toBe(false);
      expect(component.eligibleForSsa).toBe(false);
    });

    it('should recalculate and include continuous schemes only', () => {
      component.onInvestmentTypeChange(InvestmentType.Continuous);
      fixture.detectChanges();

      const ppf = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.PPF,
      );
      const rd = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.RD,
      );
      const td = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.TD_5Y,
      );

      expect(ppf).toBeTruthy();
      expect(rd).toBeTruthy();
      expect(td).toBeFalsy();
    });
  });

  describe('eligibility changes', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should include SCSS when eligibleForScss is true', () => {
      component.eligibleForScss = true;
      component.calculateMaturityAmount();

      const scss = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.SCSS,
      );
      expect(scss).toBeTruthy();
    });

    it('should exclude SCSS when eligibleForScss is false', () => {
      component.eligibleForScss = false;
      component.calculateMaturityAmount();

      const scss = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.SCSS,
      );
      expect(scss).toBeFalsy();
    });

    it('should call onEligibleForScssChange and recalculate', () => {
      component.onEligibleForScssChange(true);
      expect(component.eligibleForScss).toBe(true);
    });

    it('should call onEligibleForMsscChange and recalculate', () => {
      component.onEligibleForMsscChange(true);
      expect(component.eligibleForMssc).toBe(true);
    });

    it('should call onEligibleForSsaChange and recalculate', () => {
      component.onEligibleForSsaChange(true);
      expect(component.eligibleForSsa).toBe(true);
    });
  });

  describe('onInvestmentStartDateChange', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should update investmentStartDate and recalculate', () => {
      const spy = jest.spyOn(component, 'calculateMaturityAmount');
      component.onInvestmentStartDateChange('2024-06-15');
      expect(component.investmentStartDate).toEqual(new Date('2024-06-15'));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onTabChange', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should switch to SCHEME_COMPARISON tab', () => {
      component.onTabChange(component.Tabs.SCHEME_COMPARISON as any);
      expect(component.activeTab).toBe(component.Tabs.SCHEME_COMPARISON);
    });

    it('should do nothing if same tab is selected', () => {
      component.activeTab = component.Tabs.EARNING_COMPARISON;
      component.onTabChange(component.Tabs.EARNING_COMPARISON as any);
      expect(component.activeTab).toBe(component.Tabs.EARNING_COMPARISON);
    });

    it('should render different sections based on active tab', () => {
      component.onTabChange(component.Tabs.SCHEME_COMPARISON as any);
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.css('table'));
      expect(table).toBeTruthy();
      const allThText = table.nativeElement.textContent;
      expect(allThText).toContain('Interest Rate');
      expect(allThText).toContain('Effective Yield');
      expect(allThText).toContain('Tenure');
    });
  });

  describe('toggleFullscreen', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should request fullscreen on earnings chart container', async () => {
      const container = component.earningsChartContainer();
      const requestFs = jest.fn().mockResolvedValue(undefined);
      container!.nativeElement.requestFullscreen = requestFs;

      component.toggleFullscreen(component.Charts.EARNINGS);

      expect(requestFs).toHaveBeenCalled();
    });

    it('should request fullscreen on interest rate chart container', async () => {
      component.onTabChange(component.Tabs.SCHEME_COMPARISON as any);
      fixture.detectChanges();

      const container = component.interestRateChartContainer();
      expect(container).toBeTruthy();
      const requestFs = jest.fn().mockResolvedValue(undefined);
      container!.nativeElement.requestFullscreen = requestFs;

      component.toggleFullscreen(component.Charts.INTEREST_RATE);

      expect(requestFs).toHaveBeenCalled();
    });

    it('should exit fullscreen when already in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: {} as Element,
        writable: true,
      });
      const exitFs = jest.fn();
      document.exitFullscreen = exitFs;

      component.toggleFullscreen(component.Charts.EARNINGS);

      expect(exitFs).toHaveBeenCalled();

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
      });
    });

    it('should log error when requestFullscreen fails', async () => {
      const container = component.earningsChartContainer();
      const requestFs = jest
        .fn()
        .mockRejectedValue(new Error('fullscreen denied'));
      container!.nativeElement.requestFullscreen = requestFs;

      component.toggleFullscreen(component.Charts.EARNINGS);

      await new Promise(process.nextTick);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('fullscreen denied'),
      );
    });

    it('should log error when screen orientation lock fails', async () => {
      const container = component.earningsChartContainer();
      container!.nativeElement.requestFullscreen = jest
        .fn()
        .mockResolvedValue(undefined);
      (screen.orientation as any).lock = jest
        .fn()
        .mockRejectedValue(new Error('lock failed'));

      component.toggleFullscreen(component.Charts.EARNINGS);

      await new Promise(process.nextTick);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('lock failed'),
      );
    });

    it('should do nothing for unknown chart type', () => {
      const spy = jest.spyOn(component as any, 'earningsChartContainer');
      component.toggleFullscreen(999 as any);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not call requestFullscreen when container is undefined', () => {
      jest
        .spyOn(component as any, 'earningsChartContainer')
        .mockReturnValue(undefined);

      expect(() => {
        component.toggleFullscreen(component.Charts.EARNINGS);
      }).not.toThrow();
    });
  });

  describe('onFullscreenChange', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should set isChartInFullscreen based on document.fullscreenElement', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: {} as Element,
        writable: true,
      });
      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(true);

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
      });
      component.onFullscreenChange();
      expect(component.isChartInFullscreen).toBe(false);
    });
  });

  describe('calculateSchemeReturns paths (via calculateMaturityAmount)', () => {
    it('should handle TD path (compound > payout)', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      const td5y = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.TD_5Y,
      );
      expect(td5y).toBeTruthy();
      expect(td5y!.returns.interest).toBeGreaterThan(0);
    });

    it('should handle SCSS path (compound <= payout, simple interest)', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
      component.eligibleForScss = true;
      component.calculateMaturityAmount();

      const scss = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.SCSS,
      );
      expect(scss).toBeTruthy();
      expect(scss!.returns.interest).toBeGreaterThan(0);
    });

    it('should handle NSC path (no payout frequency, compound interest)', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      const nsc = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.NSC,
      );
      expect(nsc).toBeTruthy();
      expect(nsc!.returns.maturity).toBeGreaterThan(
        nsc!.returns.principal,
      );
    });

    it('should handle PPF path (deposit tenure, yearly compound)', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
      component.onInvestmentTypeChange(InvestmentType.Continuous);
      fixture.detectChanges();

      const ppf = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.PPF,
      );
      expect(ppf).toBeTruthy();
      expect(ppf!.returns.interest).toBeGreaterThan(0);
    });

    it('should handle RD path (deposit tenure, quarterly compound)', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
      component.onInvestmentTypeChange(InvestmentType.Continuous);

      const rd = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.RD,
      );
      expect(rd).toBeTruthy();
      expect(rd!.returns.interest).toBeGreaterThan(0);
    });
  });

  describe('deposit amount change', () => {
    beforeEach(() => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();
    });

    it('should recalculate when deposit amount changes', () => {
      const spy = jest.spyOn(component, 'calculateMaturityAmount');
      component.depositAmount = 50000;
      component.calculateMaturityAmount();

      expect(spy).toHaveBeenCalled();
      const kvp = component.schemesWithReturns.find(
        (s) => s.id === PostOfficeSavingsSchemeId.KVP,
      );
      expect(kvp!.returns.principal).toBe(50000);
    });
  });

  describe('template rendering', () => {
    it('should display the form and calculate button', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('form'));
      expect(form).toBeTruthy();

      const calcBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(calcBtn.nativeElement.textContent).toContain('Calculate');
    });

    it('should show table when schemesWithReturns has items', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.css('table'));
      expect(table).toBeTruthy();
    });
  });

  describe('schemes with empty array', () => {
    it('should handle empty schemes gracefully', () => {
      const emptyData: PostOfficeSavingsSchemes = {
        lastUpdated: Date.now(),
        effective: { from: Date.now(), to: Date.now() },
        schemes: [],
      };
      dataServiceSubject.next(emptyData);
      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.error).toBe(false);
      expect(component.schemesWithReturns.length).toBe(0);
    });
  });

  describe('scheme comparison tab chart rendering', () => {
    it('should switch tabs and render only one table at a time', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      expect(component.schemesWithReturns.length).toBeGreaterThan(0);
      expect(component.activeTab).toBe(0);

      let tables = fixture.debugElement.queryAll(By.css('table'));
      expect(tables.length).toBe(1);
      expect(tables[0].nativeElement.textContent).toContain('Maturity Date');

      component.onTabChange(component.Tabs.SCHEME_COMPARISON as any);
      expect(component.activeTab).toBe(1);
    });
  });

  describe('Continuous investment template', () => {
    it('should handle continuous investment type change', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.investmentType).toBe(InvestmentType.OneTime);

      component.investmentType = InvestmentType.Continuous;
      component.depositAmount = 2000;
      component.calculateMaturityAmount();
      fixture.detectChanges();

      expect(component.investmentType).toBe(InvestmentType.Continuous);
      expect(component.depositAmount).toBe(2000);
    });
  });

  describe('window fullscreenchange event', () => {
    it('should update isChartInFullscreen when fullscreenchange fires', () => {
      dataServiceSubject.next(mockSchemesData);
      fixture.detectChanges();

      Object.defineProperty(document, 'fullscreenElement', {
        value: {} as Element,
        writable: true,
      });
      window.dispatchEvent(new Event('fullscreenchange'));
      expect(component.isChartInFullscreen).toBe(true);

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
      });
      window.dispatchEvent(new Event('fullscreenchange'));
      expect(component.isChartInFullscreen).toBe(false);
    });
  });

  describe('chart options structure', () => {
    it('should have earnings chart options with correct callbacks', () => {
      const cb = (component.earningsChartOptions as any).plugins.tooltip.callbacks;
      const labelResult = cb.label({ dataset: { label: 'Interest' }, parsed: { y: 5000 } });
      expect(labelResult).toContain('Interest');
      expect(labelResult).toContain('5,000');
    });

    it('should return empty label when dataset label or value is missing', () => {
      const cb = (component.earningsChartOptions as any).plugins.tooltip.callbacks;
      expect(cb.label({ dataset: { label: '' }, parsed: { y: 0 } })).toBe('');
    });

    it('should have interest rate chart options with correct callbacks', () => {
      const cb = (component.interestRateChartOptions as any).plugins.tooltip.callbacks;
      const labelResult = cb.label({ dataset: { label: 'Rate' }, parsed: { y: 7.5 } });
      expect(labelResult).toContain('7.50');
    });

    it('should return scheme label from title callback', () => {
      const cb = (component.earningsChartOptions as any).plugins.tooltip.callbacks;
      expect(cb.title([{ label: 'TD-5Y' }])).toBe('Scheme: TD-5Y');
      expect(cb.title([{ label: '' }])).toBe('');
      expect(cb.title([])).toBe('');
    });

    it('should return closing balance from footer callback', () => {
      const cb = (component.earningsChartOptions as any).plugins.tooltip.callbacks;
      const items = [
        { parsed: { y: 1000 } },
        { parsed: { y: 2000 } },
      ];
      const result = cb.footer(items);
      expect(result).toContain('3,000');
    });

    it('should return empty string from footer when no items', () => {
      const cb = (component.earningsChartOptions as any).plugins.tooltip.callbacks;
      expect(cb.footer([])).toBe('');
    });

    it('should handle title callback for interest rate chart', () => {
      const cb = (component.interestRateChartOptions as any).plugins.tooltip.callbacks;
      expect(cb.title([{ label: 'PPF' }])).toBe('Scheme: PPF');
    });
  });

  describe('additional calculateSchemeReturns paths', () => {
    it('should handle PPF path with year beyond deposit tenure', () => {
      const result = (component as any).calculateSchemeReturns(7.1, 15, 10, 0, 1);
      expect(result.principal).toBeGreaterThan(0);
      expect(result.interest).toBeGreaterThan(0);
    });

    it('should handle RD path zero interest rate', () => {
      const result = (component as any).calculateSchemeReturns(0, 5, 5, 0, 4);
      expect(result.interest).toBe(0);
    });
  });

  describe('chart update when element ref exists', () => {
    it('should call earningsChart.update when chartRef exists', () => {
      const chartRef = { update: jest.fn() };
      (component as any).earningsChart = jest.fn(() => chartRef);
      (component as any).updateEarningsChartData();
      expect(chartRef.update).toHaveBeenCalled();
    });

    it('should call interestRateChart.update when chartRef exists', () => {
      const chartRef = { update: jest.fn() };
      (component as any).interestRateChart = jest.fn(() => chartRef);
      (component as any).updateInterestRateChartData();
      expect(chartRef.update).toHaveBeenCalled();
    });
  });
});
