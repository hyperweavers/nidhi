import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import { Direction } from '../../models/market';
import { Plan } from '../../models/plan';
import { ContributionSource, Portfolio, TransactionType } from '../../models/portfolio';
import { PlanService } from '../../services/core/plan.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioPage } from './portfolio.page';

describe('PortfolioPage', () => {
  let component: PortfolioPage;
  let fixture: ComponentFixture<PortfolioPage>;
  let portfolio$: Subject<Portfolio>;
  let plan$: BehaviorSubject<Plan | undefined>;
  let mockStorageService: jest.Mocked<Pick<StorageService, 'addOrUpdate'>>;

  const basePortfolio: Portfolio = {
    holdings: [
      {
        id: 'h-1',
        name: 'Test Co - EMPLOYEE',
        scripCode: { isin: 'US123' },
        vendorCode: { mc: { primary: 'TEST:US' } },
        transactions: [],
        quantity: 10,
        averagePrice: 100,
        investment: 1000,
        marketValue: 1100,
        totalProfitLoss: { direction: Direction.UP, percentage: 10, value: 100 },
        quote: {
          price: 110,
          change: { direction: Direction.UP, value: 5, percentage: 4.76 },
          open: 105,
          close: 105,
          low: 104,
          high: 111,
        },
      },
    ],
    investment: 1000,
    marketValue: 1100,
    dayProfitLoss: { direction: Direction.UP, percentage: 4.76, value: 50 },
    totalProfitLoss: { direction: Direction.UP, percentage: 10, value: 100 },
  };

  const testPlan: Plan = {
    id: 'plan-1',
    stock: {
      name: 'Test Co',
      scripCode: { isin: 'US123' },
      vendorCode: { mc: { primary: 'TEST:US' } },
    },
    lockInPeriod: 0,
    currencies: {
      purchase: { code: 'USD' },
      contribution: { code: 'USD' },
    },
  };

  beforeAll(() => {
    (global as any).Datepicker = jest.fn().mockImplementation(() => ({
      getDate: jest.fn().mockReturnValue('15/05/2026'),
      setDate: jest.fn(),
      hide: jest.fn(),
    }));
  });

  beforeEach(async () => {
    portfolio$ = new Subject<Portfolio>();
    plan$ = new BehaviorSubject<Plan | undefined>(testPlan);
    mockStorageService = { addOrUpdate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PortfolioPage, RouterTestingModule],
      providers: [
        { provide: PortfolioService, useValue: { portfolio$: portfolio$.asObservable() } },
        { provide: PlanService, useValue: { plan$: plan$.asObservable() } },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    plan$.complete();
    portfolio$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading spinner while portfolio$ has not emitted', () => {
    expect(fixture.debugElement.query(By.css('[role="status"]'))).toBeTruthy();
  });

  it('should show empty holdings message when portfolio has no holdings', () => {
    portfolio$.next({ ...basePortfolio, holdings: [] });
    fixture.detectChanges();

    const noHoldings = fixture.debugElement.query(By.css('p'));
    expect(noHoldings.nativeElement.textContent).toContain('No Holdings!');
  });

  it('should display portfolio summary and holdings table', () => {
    portfolio$.next(basePortfolio);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('table'))).toBeTruthy();
    const summaryDts = fixture.debugElement.queryAll(By.css('dt'));
    const investmentDt = summaryDts.find(d => d.nativeElement.textContent.includes('1,000.00'));
    expect(investmentDt).toBeTruthy();
  });

  it('should open buy transaction drawer', () => {
    component.openAddTransactionDrawer(TransactionType.BUY);
    expect(component.transactionType).toBe(TransactionType.BUY);
  });

  it('should open sell transaction drawer', () => {
    component.openAddTransactionDrawer(TransactionType.SELL);
    expect(component.transactionType).toBe(TransactionType.SELL);
  });

  it('should show form validation error when addTransaction fails validation', () => {
    component.addTransaction();
    expect(component.transactionFormError).toBe('One or more field(s) containing invalid value(s)!');
  });

  it('should show future date error', () => {
    portfolio$.next(basePortfolio);
    fixture.detectChanges();

    component.openAddTransactionDrawer(TransactionType.BUY);
    component.source.set(ContributionSource.EMPLOYEE);
    component.date.set('01/01/2099');
    component.price.set(100);
    component.contribution.set(500);
    component.quantity.set(5);
    component.charges.set(0);

    component.addTransaction();

    expect(component.transactionFormError).toBe('Date is in future!');
  });

  it('should add transaction successfully', async () => {
    portfolio$.next(basePortfolio);
    fixture.detectChanges();

    component.openAddTransactionDrawer(TransactionType.BUY);
    component.source.set(ContributionSource.EMPLOYEE);
    component.date.set('01/01/2024');
    component.price.set(100);
    component.contribution.set(500);
    component.quantity.set(5);
    component.charges.set(0);

    await component.addTransaction();

    expect(mockStorageService.addOrUpdate).toHaveBeenCalledTimes(1);
    expect(component.showStatusModal).toBe(true);
    expect(component.showTransactionProgress).toBe(false);
  });

  it('should clear form error after 2 seconds', fakeAsync(() => {
    component['showTransactionFormError']('Test error');
    expect(component.transactionFormError).toBe('Test error');

    tick(2000);
    expect(component.transactionFormError).toBe('');
  }));

  it('should close status modal', () => {
    component.showStatusModal = true;
    component.transactionType = TransactionType.BUY;

    component.closeStatusModal(false);
    expect(component.showStatusModal).toBe(false);
    expect(component.transactionType).toBeUndefined();
  });

  it('should close status modal and retain transaction type', () => {
    component.showStatusModal = true;
    component.transactionType = TransactionType.BUY;

    component.closeStatusModal(true);
    expect(component.showStatusModal).toBe(false);
    expect(component.transactionType).toBe(TransactionType.BUY);
  });

  it('should reset transaction form', () => {
    component.source.set(ContributionSource.EMPLOYER);
    component.date.set('01/01/2024');
    component.price.set(150);
    component.contribution.set(1000);
    component.quantity.set(10);
    component.charges.set(5);
    component.discount.set(10);
    component.fmv.set(140);

    component.resetTransactionForm();

    expect(component.source()).toBe(ContributionSource.EMPLOYEE);
    expect(component.price()).toBe(0);
    expect(component.contribution()).toBe(0);
    expect(component.quantity()).toBe(0);
    expect(component.charges()).toBe(0);
    expect(component.discount()).toBe(0);
    expect(component.fmv()).toBe(0);
  });

  it('should display investment value in summary', () => {
    portfolio$.next(basePortfolio);
    fixture.detectChanges();

    const dds = fixture.debugElement.queryAll(By.css('dd'));
    const investmentLabel = dds.find(d => d.nativeElement.textContent.trim() === 'Investment');
    expect(investmentLabel).toBeTruthy();
  });

  it('should display day profit/loss with correct direction class', () => {
    portfolio$.next(basePortfolio);
    fixture.detectChanges();

    const summaryDts = fixture.debugElement.queryAll(By.css('dt'));
    const dayPLDt = summaryDts.find(d => d.nativeElement.textContent.includes('4.76'));
    expect(dayPLDt).toBeTruthy();
    expect(dayPLDt!.nativeElement.classList).toContain('text-green-500');
  });

  it('should render buy/sell buttons', () => {
    const allButtons = fixture.debugElement.queryAll(By.css('button'));
    const buyBtn = allButtons.find(b => b.nativeElement.textContent.trim() === 'Buy');
    const sellBtn = allButtons.find(b => b.nativeElement.textContent.trim() === 'Sell');
    expect(buyBtn).toBeTruthy();
    expect(sellBtn).toBeTruthy();
  });

  it('should show loading modal during transaction progress', () => {
    component.showTransactionProgress = true;
    component.showStatusModal = true;
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
    expect(modal).toBeTruthy();
    expect(modal.nativeElement.textContent).toContain('Processing...');
  });
});
