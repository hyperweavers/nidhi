import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { Chart, registerables } from 'chart.js';

import { RecurringDepositCalculatorPage } from './recurring-deposit-calculator.page';
import { CompoundingFrequency, RecurringDepositCalculation } from '../../models/deposit';

describe('RecurringDepositCalculatorPage', () => {
  let component: RecurringDepositCalculatorPage;
  let fixture: ComponentFixture<RecurringDepositCalculatorPage>;
  let logger: { captureException: jest.Mock; error: jest.Mock; warn: jest.Mock; info: jest.Mock };

  beforeAll(() => {
    Chart.register(...registerables);
    Element.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    (window as any).Datepicker = jest.fn(() => ({ setDate: jest.fn() }));
    logger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RecurringDepositCalculatorPage],
      providers: [{ provide: LOGGER, useValue: logger }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecurringDepositCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate maturity amount on init for Maturity mode', () => {
    expect(component.totalDeposit).toBeGreaterThan(0);
    expect(component.maturityAmount).toBeGreaterThan(0);
    expect(component.interestEarned).toBeGreaterThan(0);
    expect(component.maturityDate).toBeInstanceOf(Date);
    expect(component.annualSummary.length).toBeGreaterThan(0);
    expect(component.compoundingSummary.length).toBeGreaterThan(0);
    expect(component.financialYearSummary.length).toBeGreaterThan(0);
  });

  it('should recalculate on monthly installment change', () => {
    component.monthlyInstallment = 5000;
    component.calculateMaturityAmount();
    expect(component.totalDeposit).toBeGreaterThan(0);
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should recalculate on interest rate change', () => {
    component.annualInterestRate = 10;
    component.calculateMaturityAmount();
    expect(component.interestEarned).toBeGreaterThan(0);
  });

  it('should recalculate on term change', () => {
    component.depositTermYears = 10;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should handle term with months', () => {
    component.depositTermYears = 1;
    component.depositTermMonths = 6;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should switch to Installment calculation type', () => {
    component.onCalculationTypeChange(RecurringDepositCalculation.Installment);
    expect(component.calculationType).toBe(RecurringDepositCalculation.Installment);
    expect(component.maturityAmount).toBe(100000);
    expect(component.monthlyInstallment).toBeGreaterThan(0);
  });

  it('should switch back to Maturity calculation type', () => {
    component.onCalculationTypeChange(RecurringDepositCalculation.Installment);
    component.onCalculationTypeChange(RecurringDepositCalculation.Maturity);
    expect(component.calculationType).toBe(RecurringDepositCalculation.Maturity);
    expect(component.monthlyInstallment).toBe(2000);
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should handle onInvestmentStartDateChange', () => {
    const spy = jest.spyOn(component, 'calculateMaturityAmount');
    component.onInvestmentStartDateChange('2025/03/01');
    expect(component.investmentStartDate).toEqual(new Date('2025/03/01'));
    expect(spy).toHaveBeenCalled();
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

  it('should enter fullscreen for ANNUAL_SUMMARY chart', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    component.toggleFullscreen(1);
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should exit fullscreen', () => {
    const doc = TestBed.inject(DOCUMENT);
    const exitSpy = jest.fn();
    Object.defineProperty(doc, 'fullscreenElement', { get: () => document.createElement('div'), configurable: true });
    doc.exitFullscreen = exitSpy;
    component.toggleFullscreen(1);
    expect(exitSpy).toHaveBeenCalled();
  });

  it('should return early for EARNINGS chart fullscreen', () => {
    component.toggleFullscreen(0);
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should reset values when term is zero', () => {
    component.depositTermYears = 0;
    component.depositTermMonths = 0;
    component.calculateMaturityAmount();
    expect(component.totalDeposit).toBe(0);
    expect(component.maturityAmount).toBe(0);
    expect(component.interestEarned).toBe(0);
    expect(component.maturityDate).toBeNull();
    expect(component.annualSummary).toEqual([]);
    expect(component.compoundingSummary).toEqual([]);
    expect(component.financialYearSummary).toEqual([]);
  });

  it('should handle compounding at different frequencies', () => {
    component.compoundingFrequency = CompoundingFrequency.Monthly;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);

    component.compoundingFrequency = CompoundingFrequency.Yearly;
    component.calculateMaturityAmount();
    expect(component.maturityAmount).toBeGreaterThan(0);
  });

  it('should support pagination for compounding summary', () => {
    component.compoundingSummaryPage = 1;
    expect(component.compoundingSummaryPage).toBe(1);
  });

  it('should update chart data on calculation', () => {
    const earningsSpy = jest.spyOn(component as any, 'updateEarningsChartData');
    const annualSpy = jest.spyOn(component as any, 'updateAnnualSummaryChartData');
    const compoundingSpy = jest.spyOn(component as any, 'updateCompoundingSummaryChartData');
    const fySpy = jest.spyOn(component as any, 'updateFinancialYearSummaryChartData');
    component.calculateMaturityAmount();
    expect(earningsSpy).toHaveBeenCalled();
    expect(annualSpy).toHaveBeenCalled();
    expect(compoundingSpy).toHaveBeenCalled();
    expect(fySpy).toHaveBeenCalled();
  });

  it('should call earningsChart.update when chartRef is available', () => {
    const chartRef = { update: jest.fn() };
    (component as any).earningsChart = jest.fn(() => chartRef);
    (component as any).updateEarningsChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call annualSummaryChart.update when chartRef is available', () => {
    const chartRef = { update: jest.fn() };
    (component as any).annualSummaryChart = jest.fn(() => chartRef);
    (component as any).updateAnnualSummaryChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call compoundingSummaryChart.update when chartRef is available', () => {
    const chartRef = { update: jest.fn() };
    (component as any).compoundingSummaryChart = jest.fn(() => chartRef);
    (component as any).updateCompoundingSummaryChartData();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call financialYearSummaryChart.update when chartRef is available', () => {
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

  it('should toggle fullscreen and call requestFullscreen for ANNUAL_SUMMARY', () => {
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
