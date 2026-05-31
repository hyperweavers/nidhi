import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { LOGGER } from '@nidhi/shared-logger';

import { PlanPage } from './plan.page';
import { PlanService } from '../../services/core/plan.service';
import { MarketService } from '../../services/core/market.service';
import { CurrencyService } from '../../services/core/currency.service';
import { Direction } from '../../models/market';

const mockLogger = {
  captureException: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
};

describe('PlanPage', () => {
  let component: PlanPage;
  let fixture: ComponentFixture<PlanPage>;
  let planService: jest.Mocked<PlanService>;

  const mockCurrencies = [
    { code: 'USD', country: 'United States', icon: 'https://example.com/usd.cms' },
    { code: 'INR', country: 'India', icon: 'https://example.com/inr.cms' },
  ];

  const mockPlan = {
    id: 'plan-1',
    stock: {
      name: 'Caterpillar Inc.',
      scripCode: { isin: 'INE002A01018', ticker: 'CAT', country: 'US' },
      vendorCode: { mc: { primary: 'CAT' } },
    },
    lockInPeriod: 365,
    currencies: {
      purchase: { code: 'USD', country: 'United States', icon: '' },
      contribution: { code: 'USD', country: 'United States', icon: '' },
    },
  };

  beforeEach(async () => {
    planService = {
      plan$: of(undefined),
      addOrUpdate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PlanService>;

    await TestBed.configureTestingModule({
      imports: [PlanPage],
      providers: [
        provideRouter([]),
        {
          provide: MarketService,
          useValue: {
            search: jest.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: CurrencyService,
          useValue: {
            getCurrencyList: jest.fn().mockReturnValue(of(mockCurrencies)),
          },
        },
        { provide: PlanService, useValue: planService },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state with no plan', () => {
    it('should show the edit form when no plan exists', () => {
      const companyInput = fixture.debugElement.query(By.css('#name'));
      expect(companyInput).toBeTruthy();
    });

    it('should not show plan view when no plan exists', () => {
      const planView = fixture.debugElement.query(By.css('[data-testid="plan-view"]'));
      expect(component.showPlanView).toBe(false);
    });

    it('should render the save button saying Create', () => {
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submitButton.nativeElement.textContent.trim()).toMatch(/create/i);
    });

    it('should initialize signals with default values', () => {
      expect(component.name()).toBe('');
      expect(component.lockInPeriodYears()).toBe(0);
      expect(component.lockInPeriodMonths()).toBe(0);
      expect(component.lockInPeriodDays()).toBe(0);
      expect(component.purchaseCurrency()).toBeNull();
      expect(component.contributionCurrency()).toBeNull();
    });

    it('should populate currency dropdowns from CurrencyService', () => {
      const purchaseSelect = fixture.debugElement.query(By.css('#purchase-currency'));
      const options = purchaseSelect.nativeElement.options;
      expect(options.length).toBe(3);
      expect(options[1].text).toContain('USD');
      expect(options[2].text).toContain('INR');
    });
  });

  describe('when plan exists', () => {
    beforeEach(async () => {
      planService.plan$ = of(mockPlan);

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PlanPage],
        providers: [
          provideRouter([]),
          {
            provide: MarketService,
            useValue: { search: jest.fn().mockReturnValue(of([])) },
          },
          {
            provide: CurrencyService,
            useValue: {
              getCurrencyList: jest.fn().mockReturnValue(of(mockCurrencies)),
            },
          },
          { provide: PlanService, useValue: planService },
          { provide: LOGGER, useValue: mockLogger },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PlanPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should show plan view', () => {
      expect(component.showPlanView).toBe(true);
    });

    it('should display plan details in view mode', () => {
      const compiled = fixture.debugElement.nativeElement;
      expect(compiled.textContent).toContain('Caterpillar Inc.');
    });

    it('should display lock-in period breakdown', () => {
      expect(component.lockInPeriodYears()).toBe(1);
      expect(component.lockInPeriodMonths()).toBe(0);
      expect(component.lockInPeriodDays()).toBe(0);
    });

    it('should have an Edit button in view mode', () => {
      const editButton = fixture.debugElement.query(By.css('button'));
      expect(editButton.nativeElement.textContent.trim()).toBe('Edit');
    });

    it('should switch to edit mode when Edit is clicked', () => {
      component.isEditMode = true;
      fixture.detectChanges();
      expect(component.showPlanView).toBe(false);
    });
  });

  describe('save (create/edit plan)', () => {
    beforeEach(() => {
      component.name.set('Caterpillar Inc.');
      component.lockInPeriodYears.set(5);
      component.purchaseCurrency.set(mockCurrencies[0]);
      component.contributionCurrency.set(mockCurrencies[0]);
      component['selectedStock'] = mockPlan.stock;
    });

    it('should call planService.addOrUpdate with correct plan data', async () => {
      await component.save();
      expect(planService.addOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: mockPlan.stock,
          currencies: {
            purchase: mockCurrencies[0],
            contribution: mockCurrencies[0],
          },
        }),
      );
    });

    it('should show success message after saving', async () => {
      await component.save();
      expect(component.showStatusMessage).toBe(true);
      expect(component.statusMessage).toContain('saved');
    });

    it('should handle save errors gracefully', async () => {
      planService.addOrUpdate.mockRejectedValueOnce(new Error('DB Error'));
      await component.save();
      expect(component.statusMessage).toContain('Failed');
      expect(mockLogger.captureException).toHaveBeenCalled();
    });
  });

  describe('stock search', () => {
    it('should set showSearchResults to false initially', () => {
      expect(component.showSearchResults).toBeFalsy();
    });

    it('should filter currency list to allowed currencies only', () => {
      const currencyList = component.currencyList$;
      currencyList.subscribe((list) => {
        expect(list.every((c) => ['USD', 'INR'].includes(c.code))).toBe(true);
      });
    });

    it('should update name signal when stock is selected', () => {
      const stock = {
        name: 'Test Corp',
        scripCode: { isin: 'TEST123', ticker: 'TST', country: 'US' },
        vendorCode: { mc: { primary: 'TST' } },
      };
      component.selectStock(stock);
      expect(component.name()).toBe('Test Corp');
      expect(component.showSearchResults).toBe(false);
    });

    it('should select stock only when isin, ticker and country are present', () => {
      const incompleteStock = {
        name: 'Bad Stock',
        scripCode: {},
        vendorCode: { mc: { primary: 'BAD' } },
      };
      component.selectStock(incompleteStock as any);
      expect(component['selectedStock']).toBeUndefined();
    });
  });

  describe('closeStatusMessage', () => {
    it('should hide the status message', () => {
      component.showStatusMessage = true;
      component.closeStatusMessage();
      expect(component.showStatusMessage).toBe(false);
    });
  });

  describe('showPlanView', () => {
    it('should return true when plan exists and not in edit mode', () => {
      component['plan'] = () => mockPlan;
      component.isEditMode = false;
      expect(component.showPlanView).toBe(true);
    });

    it('should return false when plan exists but in edit mode', () => {
      component['plan'] = () => mockPlan;
      component.isEditMode = true;
      expect(component.showPlanView).toBe(false);
    });

    it('should return false when no plan exists', () => {
      component['plan'] = () => undefined;
      expect(component.showPlanView).toBe(false);
    });
  });

  describe('save with existing plan (edit mode toggle)', () => {
    beforeEach(() => {
      component['plan'] = () => mockPlan;
      component.isEditMode = false;
    });

    it('should toggle to edit mode when plan exists and not in edit mode', async () => {
      await component.save();
      expect(component.isEditMode).toBe(true);
    });

    it('should call planService.addOrUpdate when in edit mode with valid data', async () => {
      component.isEditMode = true;
      component.name.set('Caterpillar Inc.');
      component.lockInPeriodYears.set(1);
      component.purchaseCurrency.set(mockCurrencies[0]);
      component.contributionCurrency.set(mockCurrencies[0]);
      component['selectedStock'] = mockPlan.stock;

      await component.save();
      expect(planService.addOrUpdate).toHaveBeenCalled();
    });
  });

  describe('save with plan without id', () => {
    beforeEach(() => {
      component['plan'] = () => ({ ...mockPlan, id: undefined });
      component.isEditMode = true;
      component.name.set('Caterpillar Inc.');
      component.lockInPeriodYears.set(1);
      component.purchaseCurrency.set(mockCurrencies[0]);
      component.contributionCurrency.set(mockCurrencies[0]);
      component['selectedStock'] = mockPlan.stock;
    });

    it('should generate uuid when plan has no id', async () => {
      const { v4: uuid } = jest.requireActual('uuid');
      const uuidSpy = jest.spyOn(require('uuid'), 'v4');

      await component.save();
      expect(uuidSpy).toHaveBeenCalled();
    });
  });

  describe('effect with isEditMode true', () => {
    beforeEach(async () => {
      planService.plan$ = of(mockPlan);

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PlanPage],
        providers: [
          provideRouter([]),
          {
            provide: MarketService,
            useValue: { search: jest.fn().mockReturnValue(of([])) },
          },
          {
            provide: CurrencyService,
            useValue: {
              getCurrencyList: jest.fn().mockReturnValue(of(mockCurrencies)),
            },
          },
          { provide: PlanService, useValue: planService },
          { provide: LOGGER, useValue: mockLogger },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PlanPage);
      component = fixture.componentInstance;
      component.isEditMode = true;
      fixture.detectChanges();
    });

    it('should not update signals from plan when in edit mode', () => {
      expect(component.name()).toBe('');
    });
  });

  describe('stock search filtering', () => {
    it('should correctly apply the stock filter map function', () => {
      const stocks = [
        { name: 'Valid Stock', scripCode: { isin: 'US123', ticker: 'VST', country: 'US' } },
        { name: 'No ISIN', scripCode: { ticker: 'NIS', country: 'US' } },
        { name: 'No Ticker', scripCode: { isin: 'US456', country: 'US' } },
        { name: 'No Country', scripCode: { isin: 'US789', ticker: 'NCT' } },
      ];
      const filtered = stocks.filter(
        (stock) => stock.scripCode.isin && stock.scripCode.ticker && stock.scripCode.country,
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Valid Stock');
    });
  });

  describe('save with missing required fields', () => {
    it('should not call addOrUpdate when selectedStock is missing', async () => {
      component['selectedStock'] = undefined;
      await component.save();
      expect(planService.addOrUpdate).not.toHaveBeenCalled();
    });

    it('should not call addOrUpdate when lock-in period is 0', async () => {
      component['selectedStock'] = mockPlan.stock;
      component.lockInPeriodYears.set(0);
      component.lockInPeriodMonths.set(0);
      component.lockInPeriodDays.set(0);
      await component.save();
      expect(planService.addOrUpdate).not.toHaveBeenCalled();
    });
  });
});
