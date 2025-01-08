import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart, registerables } from 'chart.js';

import { RecurringDepositCalculatorPage } from './recurring-deposit-calculator.page';

describe('RecurringDepositCalculatorPage', () => {
  let component: RecurringDepositCalculatorPage;
  let fixture: ComponentFixture<RecurringDepositCalculatorPage>;

  beforeAll(() => {
    // Register necessary Chart.js components to avoid "not a registered controller" errors
    Chart.register(...registerables);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringDepositCalculatorPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RecurringDepositCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
