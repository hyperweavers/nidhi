import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
import { Chart, registerables } from 'chart.js';

import { LoanEmiCalculatorPage } from './loan-emi-calculator.page';
import { InterestRateType, RevisionAdjustmentType } from '../../models/loan';

describe('LoanEmiCalculatorPage', () => {
  let component: LoanEmiCalculatorPage;
  let fixture: ComponentFixture<LoanEmiCalculatorPage>;
  let logger: { captureException: jest.Mock; error: jest.Mock; warn: jest.Mock; info: jest.Mock };

  beforeAll(() => {
    Chart.register(...registerables);
    Element.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    (window as any).Datepicker = jest.fn(() => ({ setDate: jest.fn() }));
    logger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoanEmiCalculatorPage],
      providers: [{ provide: LOGGER, useValue: logger }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanEmiCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate amortization on init', () => {
    expect(component.monthlyPayment).toBeGreaterThan(0);
    expect(component.amortizationSchedule.length).toBeGreaterThan(0);
    expect(component.totalPayments).toBeGreaterThan(0);
    expect(component.financialYearSummaries.length).toBeGreaterThan(0);
  });

  it('should recalculate on principal amount change', () => {
    component.principalAmount = 5000000;
    component.calculateAmortization();
    expect(component.totalPrincipalPaid).toBeGreaterThan(2500000);
  });

  it('should recalculate on interest rate change', () => {
    component.annualInterestRate = 12;
    component.calculateAmortization();
    expect(component.monthlyPayment).toBeGreaterThan(0);
  });

  it('should recalculate on loan term change', () => {
    component.loanTermYears = 15;
    component.calculateAmortization();
    expect(component.monthlyPayment).toBeGreaterThan(0);
    expect(component.amortizationSchedule.length).toBeGreaterThan(0);
  });

  it('should handle fixed interest rate type', () => {
    component.interestRateType = InterestRateType.FIXED;
    component.calculateAmortization();
    expect(component.monthlyPayment).toBeGreaterThan(0);
    expect(component.amortizationSchedule.length).toBeGreaterThan(0);
  });

  it('should add rate change with EMI adjustment', () => {
    component.rateChangeMonth = 60;
    component.rateChangeNewRate = 10;
    component.rateChangeAdjustmentType = RevisionAdjustmentType.EMI;
    component.addRateChange();

    expect(component.rateChanges.length).toBe(1);
    expect(component.rateChanges[0].month).toBe(60);
    expect(component.rateChanges[0].newRate).toBe(10);
    expect(component.rateChanges[0].adjustmentType).toBe(RevisionAdjustmentType.EMI);
  });

  it('should add rate change with TENURE adjustment', () => {
    component.rateChangeMonth = 120;
    component.rateChangeNewRate = 8;
    component.rateChangeAdjustmentType = RevisionAdjustmentType.TENURE;
    component.addRateChange();

    expect(component.rateChanges.length).toBe(1);
    expect(component.rateChanges[0].adjustmentType).toBe(RevisionAdjustmentType.TENURE);
  });

  it('should remove rate change and recalculate', () => {
    component.rateChangeMonth = 60;
    component.rateChangeNewRate = 10;
    component.addRateChange();
    expect(component.rateChanges.length).toBe(1);

    component.removeRateChange(0);
    expect(component.rateChanges.length).toBe(0);
  });

  it('should add prepayment with EMI adjustment', () => {
    component.prepaymentMonth = 12;
    component.prepaymentAmount = 50000;
    component.prepaymentAdjustmentType = RevisionAdjustmentType.EMI;
    component.addPrepayment();

    expect(component.prepayments.length).toBe(1);
    expect(component.prepayments[0].month).toBe(12);
    expect(component.prepayments[0].amount).toBe(50000);
    expect(component.prepayments[0].adjustmentType).toBe(RevisionAdjustmentType.EMI);
  });

  it('should add prepayment with TENURE adjustment', () => {
    component.prepaymentMonth = 24;
    component.prepaymentAmount = 100000;
    component.prepaymentAdjustmentType = RevisionAdjustmentType.TENURE;
    component.addPrepayment();

    expect(component.prepayments.length).toBe(1);
    expect(component.prepayments[0].adjustmentType).toBe(RevisionAdjustmentType.TENURE);
  });

  it('should remove prepayment and recalculate', () => {
    component.prepaymentMonth = 12;
    component.prepaymentAmount = 50000;
    component.addPrepayment();
    expect(component.prepayments.length).toBe(1);

    component.removePrepayment(0);
    expect(component.prepayments.length).toBe(0);
  });

  it('should handle onLoanStartDateChange', () => {
    const spy = jest.spyOn(component, 'calculateAmortization');
    component.onLoanStartDateChange('2024/03/15');
    expect(component.loanStartDate).toEqual(new Date('2024/03/15'));
    expect(spy).toHaveBeenCalled();
  });

  it('should handle onRateChangeAdjustmentTypeChange', () => {
    component.onRateChangeAdjustmentTypeChange(RevisionAdjustmentType.EMI);
    expect(component.rateChangeAdjustmentType).toBe(RevisionAdjustmentType.EMI);
  });

  it('should handle onPrepaymentAdjustmentTypeChange', () => {
    component.onPrepaymentAdjustmentTypeChange(RevisionAdjustmentType.EMI);
    expect(component.prepaymentAdjustmentType).toBe(RevisionAdjustmentType.EMI);
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

  it('should enter fullscreen for EMI chart', () => {
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

  it('should return early for PAYMENTS chart fullscreen', () => {
    component.toggleFullscreen(0);
    expect(component.isChartInFullscreen).toBe(false);
  });

  it('should handle pre-EMI interest when start date is before first EMI', () => {
    component.loanStartDate = new Date(2024, 0, 1);
    component.emiDebitDay = 5;
    component.calculateAmortization();

    const preEmiEntries = component.amortizationSchedule.filter(e => e.month === 0);
    expect(preEmiEntries.length).toBe(1);
    expect(preEmiEntries[0].interest).toBeGreaterThan(0);
  });

  it('should handle floating rate with multiple revisions', () => {
    component.interestRateType = InterestRateType.FLOATING;
    component.rateChangeMonth = 60;
    component.rateChangeNewRate = 10;
    component.rateChangeAdjustmentType = RevisionAdjustmentType.EMI;
    component.addRateChange();

    component.rateChangeMonth = 120;
    component.rateChangeNewRate = 8;
    component.rateChangeAdjustmentType = RevisionAdjustmentType.TENURE;
    component.addRateChange();

    expect(component.rateChanges.length).toBe(2);
    expect(component.monthlyPayment).toBeGreaterThan(0);
  });

  it('should handle floating rate with prepayment', () => {
    component.interestRateType = InterestRateType.FLOATING;
    component.rateChangeMonth = 36;
    component.rateChangeNewRate = 10;
    component.rateChangeAdjustmentType = RevisionAdjustmentType.EMI;
    component.addRateChange();

    component.prepaymentMonth = 36;
    component.prepaymentAmount = 100000;
    component.prepaymentAdjustmentType = RevisionAdjustmentType.TENURE;
    component.addPrepayment();

    expect(component.rateChanges.length).toBe(1);
    expect(component.prepayments.length).toBe(1);
  });

  it('should handle pagination for amortization schedule', () => {
    component.amortizationSchedulePage = 1;
    expect(component.amortizationSchedulePage).toBe(1);
  });

  it('should handle pagination for financial year summary', () => {
    component.financialYearSummaryPage = 0;
    expect(component.financialYearSummaryPage).toBe(0);
  });

  it('should update charts on amortization calculation', () => {
    const paymentsSpy = jest.spyOn(component as any, 'updatePaymentsChart');
    const emiSpy = jest.spyOn(component as any, 'updateEmiChart');
    const revisionsSpy = jest.spyOn(component as any, 'updateRevisionChart');
    component.calculateAmortization();
    expect(paymentsSpy).toHaveBeenCalled();
    expect(emiSpy).toHaveBeenCalled();
    expect(revisionsSpy).toHaveBeenCalled();
  });

  it('should call paymentsChart.update when chartRef exists', () => {
    const chartRef = { update: jest.fn() };
    (component as any).paymentsChart = jest.fn(() => chartRef);
    (component as any).updatePaymentsChart();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call emiChart.update when chartRef exists', () => {
    const chartRef = { update: jest.fn() };
    (component as any).emiChart = jest.fn(() => chartRef);
    (component as any).updateEmiChart();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should call revisionChart.update when chartRef exists', () => {
    const chartRef = { update: jest.fn() };
    (component as any).revisionChart = jest.fn(() => chartRef);
    (component as any).updateRevisionChart();
    expect(chartRef.update).toHaveBeenCalled();
  });

  it('should toggle fullscreen and call requestFullscreen for EMI chart', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    const requestFs = jest.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFs;
    component.toggleFullscreen(1);
    expect(requestFs).toHaveBeenCalled();
  });

  it('should toggle fullscreen for REVISIONS chart', () => {
    component.rateChangeMonth = 60;
    component.rateChangeNewRate = 10;
    component.addRateChange();
    component.activeTab = 2;
    fixture.detectChanges();
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    const requestFs = jest.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFs;
    component.toggleFullscreen(2);
    expect(requestFs).toHaveBeenCalled();
  });

  it('should not requestFullscreen when container is undefined', () => {
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'fullscreenElement', { get: () => null, configurable: true });
    (component as any).emiChartContainer = jest.fn(() => undefined);
    component.toggleFullscreen(1);
  });
});
