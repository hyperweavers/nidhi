import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { Chart, registerables } from 'chart.js';

import { FixedDepositCalculatorPage } from './fixed-deposit-calculator.page';
import { CompoundingFrequency, InterestPayoutFrequency } from '../../models/deposit';

describe('FixedDepositCalculatorPage', () => {
  let component: FixedDepositCalculatorPage;
  let fixture: ComponentFixture<FixedDepositCalculatorPage>;
  let logger: { captureException: jest.Mock; error: jest.Mock; warn: jest.Mock; info: jest.Mock };

  beforeAll(() => {
    Chart.register(...registerables);
    Element.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    (window as any).Datepicker = jest.fn(() => ({ setDate: jest.fn() }));
    logger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [FixedDepositCalculatorPage],
      providers: [{ provide: LOGGER, useValue: logger }],
    }).compileComponents();

    fixture = TestBed.createComponent(FixedDepositCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate maturity amount on init', () => {
    expect(component.maturityAmount).toBeGreaterThan(0);
    expect(component.interestEarned).toBeGreaterThan(0);
    expect(component.maturityDate).toBeInstanceOf(Date);
    expect(component.effectiveYield).toBeGreaterThan(0);
    expect(component.annualSummary.length).toBeGreaterThan(0);
    expect(component.compoundingSummary.length).toBeGreaterThan(0);
    expect(component.financialYearSummary.length).toBeGreaterThan(0);
  });

  it('should recalculate on deposit amount change', () => {
    component.depositAmount = 500000;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(component.depositAmount);
    expect(component.interestEarned).toBeGreaterThan(0);
  });

  it('should recalculate on interest rate change', () => {
    component.annualInterestRate = 12;
    component.calculateMaturityAmount();
    expect(component.interestEarned).toBeGreaterThan(0);
  });

  it('should handle term with months and days', () => {
    component.depositTermYears = 2;
    component.depositTermMonths = 3;
    component.depositTermDays = 10;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
    expect(component.maturityDate).toBeInstanceOf(Date);
  });

  it('should handle onInvestmentStartDateChange', () => {
    const spy = jest.spyOn(component, 'calculateMaturityAmount');
    component.onInvestmentStartDateChange('2025/06/01');
    expect(component.investmentStartDate).toEqual(new Date('2025/06/01'));
    expect(spy).toHaveBeenCalled();
  });

  it('should reset payout when compounding changes to incompatible frequency', () => {
    component.compoundingFrequency = CompoundingFrequency.Yearly;
    component.interestPayoutFrequency = InterestPayoutFrequency.Quarterly;
    component.onCompoundingFrequencyChange();
    expect(component.interestPayoutFrequency).toBe(InterestPayoutFrequency.Maturity);
  });

  it('should keep payout when compounding frequency is compatible', () => {
    component.compoundingFrequency = CompoundingFrequency.Quarterly;
    component.interestPayoutFrequency = InterestPayoutFrequency.Quarterly;
    component.onCompoundingFrequencyChange();
    expect(component.interestPayoutFrequency).toBe(InterestPayoutFrequency.Quarterly);
  });

  it('should handle onTabChange', () => {
    component.onTabChange(1);
    expect(component.activeTab).toBe(1);
  });

  it('should handle fullscreen change event', () => {
    expect(component.isChartInFullscreen).toBe(false);
    component.onFullscreenChange();
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should enter fullscreen mode for ANNUAL_SUMMARY chart', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    component.toggleFullscreen(2);
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should exit fullscreen mode', () => {
    const doc = TestBed.inject(DOCUMENT);
    const exitSpy = jest.fn();
    Object.defineProperty(doc, 'fullscreenElement', { get: () => document.createElement('div'), configurable: true });
    doc.exitFullscreen = exitSpy;
    component.toggleFullscreen(2);
    expect(exitSpy).toHaveBeenCalled();
  });

  it('should not toggle fullscreen for unsupported charts', () => {
    component.toggleFullscreen(0);
    component.toggleFullscreen(4);
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should get available payout frequencies limited by compounding', () => {
    component.compoundingFrequency = CompoundingFrequency.Quarterly;
    const freqs = component.getAvailableInterestPayoutFrequencies();
    expect(freqs.length).toBeGreaterThan(0);
    freqs.forEach(f => expect(f.key).toBeLessThanOrEqual(CompoundingFrequency.Quarterly));
  });

  it('should reset values when deposit term is zero', () => {
    component.depositTermYears = 0;
    component.depositTermMonths = 0;
    component.depositTermDays = 0;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBe(0);
    expect(component.interestEarned).toBe(0);
    expect(component.maturityDate).toBeNull();
    expect(component.annualSummary).toEqual([]);
    expect(component.compoundingSummary).toEqual([]);
    expect(component.payoutSchedule).toEqual([]);
    expect(component.financialYearSummary).toEqual([]);
  });

  it('should generate payout schedule for non-maturity payout', () => {
    component.interestPayoutFrequency = InterestPayoutFrequency.Yearly;
    component.calculateMaturityAmount();
    expect(component.payoutSchedule.length).toBeGreaterThan(0);
    expect(component.averagePayout).toBeGreaterThan(0);
    expect(component.maturityAmount).toBe(component.depositAmount);
    expect(component.compoundingSummary.length).toBe(0);
  });

  it('should populate summaries for payout path', () => {
    component.interestPayoutFrequency = InterestPayoutFrequency.Yearly;
    component.calculateMaturityAmount();
    expect(component.annualSummary.length).toBeGreaterThan(0);
    expect(component.financialYearSummary.length).toBeGreaterThan(0);
  });

  it('should support pagination for compounding summary', () => {
    component.compoundingSummaryPage = 1;
    expect(component.compoundingSummaryPage).toBe(1);
  });

  it('should handle compounding at quarterly frequency', () => {
    component.compoundingFrequency = CompoundingFrequency.Quarterly;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should handle compounding at yearly frequency', () => {
    component.compoundingFrequency = CompoundingFrequency.Yearly;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should handle compounding at monthly frequency', () => {
    component.compoundingFrequency = CompoundingFrequency.Monthly;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should update earnings chart data on calculation', () => {
    const spy = jest.spyOn(component as any, 'updateEarningsChartData');
    component.calculateMaturityAmount();
    expect(spy).toHaveBeenCalled();
  });

  it('should call markForCheck when updating earnings chart with chartRef', () => {
    const chartRef = { update: jest.fn() };
    (component as any).earningsChart = jest.fn(() => chartRef);
    (component as any).updateEarningsChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call markForCheck when updating annualSummaryChart with chartRef', () => {
    const chartRef = { update: jest.fn() };
    (component as any).annualSummaryChart = jest.fn(() => chartRef);
    (component as any).updateAnnualSummaryChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call chart.update when compoundingSummaryChart exists', () => {
    const chartRef = { update: jest.fn() };
    (component as any).compoundingSummaryChart = jest.fn(() => chartRef);
    (component as any).updateCompoundingSummaryChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call chart.update when financialYearSummaryChart exists', () => {
    const chartRef = { update: jest.fn() };
    (component as any).financialYearSummaryChart = jest.fn(() => chartRef);
    (component as any).updateFinancialYearSummaryChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should handle compounding frequency with None excluded from available frequencies', () => {
    const frequencies = component.availableCompoundingFrequencies;
    const noneExists = frequencies.some(f => f.key === CompoundingFrequency.None);
    expect(noneExists).toBe(false);
  });

  it('should reset values when investmentStartDate is invalid', () => {
    component.investmentStartDate = null as any;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBe(0);
    expect(component.interestEarned).toBe(0);
  });

  it('should set effectiveYield to 0 when maturityAmount is 0', () => {
    component.depositAmount = 0;
    component.annualInterestRate = 0;
    component.calculateMaturityAmount();
    expect(component.effectiveYield).toBe(0);
  });

  it('should handle getAvailableInterestPayoutFrequencies when compounding is Monthly', () => {
    component.compoundingFrequency = CompoundingFrequency.Monthly;
    const freqs = component.getAvailableInterestPayoutFrequencies();
    expect(freqs.length).toBeGreaterThan(0);
  });

  it('should toggle fullscreen and enter fullscreen for ANNUAL_SUMMARY chart', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    const requestFs = jest.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFs;
    component.toggleFullscreen(1);
    expect(requestFs).toHaveBeenCalled();
  });

  it('should toggle fullscreen for COMPOUNDING_SUMMARY when activeTab matches', () => {
    component.activeTab = 1;
    fixture.detectChanges();
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    const requestFs = jest.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFs;
    component.toggleFullscreen(2);
    expect(requestFs).toHaveBeenCalled();
  });

  it('should toggle fullscreen for FINANCIAL_YEAR_SUMMARY when activeTab matches', () => {
    component.activeTab = 2;
    fixture.detectChanges();
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    const requestFs = jest.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFs;
    component.toggleFullscreen(3);
    expect(requestFs).toHaveBeenCalled();
  });

  it('should not requestFullscreen when container is undefined', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    (component as any).annualSummaryChartContainer = jest.fn(() => undefined);
    component.toggleFullscreen(1);
  });
});
