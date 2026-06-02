import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { Chart, registerables } from 'chart.js';
import { of } from 'rxjs';

import { DataService } from '../../services/core/data.service';
import { GoldJewelleryPriceCalculatorPage } from './gold-jewellery-price-calculator.page';

describe('GoldJewelleryPriceCalculatorPage', () => {
  let component: GoldJewelleryPriceCalculatorPage;
  let fixture: ComponentFixture<GoldJewelleryPriceCalculatorPage>;
  let logger: {
    captureException: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
  };

  beforeAll(() => {
    Chart.register(...registerables);
  });

  beforeEach(async () => {
    logger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GoldJewelleryPriceCalculatorPage],
      providers: [
        { provide: LOGGER, useValue: logger },
        {
          provide: DataService,
          useValue: {
            goldRate$: of(7500),
            postOfficeSavingsSchemes$: of([]),
            rbiPolicyRates$: of([]),
            banksInIndia$: of([]),
            ibjaGoldRates$: of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldJewelleryPriceCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to gold rate on construction and update price', () => {
    expect(component.goldPricePerGram).toBe(7500);
    expect(component.showPriceLoading).toBe(false);
  });

  it('should calculate total price with default values', () => {
    component.goldWeight = 10;
    component.wastagePercentage = 8;
    component.makingCharge = 500;
    component.goldPricePerGram = 6000;
    component.calculateTotalPrice();

    expect(component.goldPrice).toBe(60000);
    expect(component.wastageValue).toBe(4800);
    expect(component.tax).toBe(1959);
    expect(component.totalAmountPayable).toBe(67259);
  });

  it('should calculate total price with zero gold weight', () => {
    component.goldWeight = 0;
    component.goldPricePerGram = 6000;
    component.calculateTotalPrice();

    expect(component.goldPrice).toBe(0);
    expect(component.wastageValue).toBe(0);
    expect(component.totalAmountPayable).toBe(0);
  });

  it('should calculate total price with zero making charge and wastage', () => {
    component.goldWeight = 5;
    component.wastagePercentage = 0;
    component.makingCharge = 0;
    component.goldPricePerGram = 7000;
    component.calculateTotalPrice();

    expect(component.goldPrice).toBe(35000);
    expect(component.wastageValue).toBe(0);
    expect(component.tax).toBe(1050);
    expect(component.totalAmountPayable).toBe(36050);
  });

  it('should update chart data on calculation', () => {
    component.goldWeight = 10;
    component.goldPricePerGram = 6000;
    component.calculateTotalPrice();

    const chartData = component.priceBreakdownChartData.datasets[0].data;
    expect(chartData[0]).toBe(60000);
    expect(chartData[1]).toBe(component.wastageValue);
    expect(chartData[2]).toBe(0);
    expect(chartData[3]).toBe(component.tax);
  });

  it('should show loading state initially', () => {
    expect(component.showPriceLoading).toBe(false);
  });

  it('should format tooltip label via decimal pipe', () => {
    const options = component.priceBreakdownChartOptions as any;
    const labelCallback: (ctx: { parsed: number }) => string =
      options.plugins.tooltip.callbacks.label;
    const result = labelCallback({ parsed: 12345 });
    expect(result).toBe('12,345');
  });

  it('should return empty string in tooltip when parsed value is null or zero', () => {
    const options = component.priceBreakdownChartOptions as any;
    const labelCallback = options.plugins.tooltip.callbacks.label;
    expect(labelCallback({ parsed: undefined })).toBe('');
    expect(labelCallback({ parsed: 0 })).toBe('0');
  });

  it('should handle gold rate subscription with zero price', () => {
    TestBed.resetTestingModule();
    logger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [GoldJewelleryPriceCalculatorPage],
      providers: [
        { provide: LOGGER, useValue: logger },
        {
          provide: DataService,
          useValue: {
            goldRate$: of(0),
            postOfficeSavingsSchemes$: of([]),
            rbiPolicyRates$: of([]),
            banksInIndia$: of([]),
            ibjaGoldRates$: of([]),
          },
        },
      ],
    });

    const f = TestBed.createComponent(GoldJewelleryPriceCalculatorPage);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.goldPricePerGram).toBe(0);
    expect(c.showPriceLoading).toBe(false);
  });
});
