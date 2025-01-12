import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart, registerables } from 'chart.js';

import { FixedDepositCalculatorPage } from './fixed-deposit-calculator.page';

describe('FixedDepositCalculatorPage', () => {
  let component: FixedDepositCalculatorPage;
  let fixture: ComponentFixture<FixedDepositCalculatorPage>;

  beforeAll(() => {
    // Register necessary Chart.js components to avoid "not a registered controller" errors
    Chart.register(...registerables);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FixedDepositCalculatorPage],
    }).compileComponents();

    fixture = TestBed.createComponent(FixedDepositCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
