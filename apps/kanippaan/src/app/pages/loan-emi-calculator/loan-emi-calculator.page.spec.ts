import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart, registerables } from 'chart.js';

import { LoanEmiCalculatorPage } from './loan-emi-calculator.page';

describe('LoanEmiCalculatorPage', () => {
  let component: LoanEmiCalculatorPage;
  let fixture: ComponentFixture<LoanEmiCalculatorPage>;

  beforeAll(() => {
    // Register necessary Chart.js components to avoid "not a registered controller" errors
    Chart.register(...registerables);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanEmiCalculatorPage],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanEmiCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
