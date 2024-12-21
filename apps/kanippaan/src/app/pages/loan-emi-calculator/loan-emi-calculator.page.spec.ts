import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanEmiCalculatorPage } from './loan-emi-calculator.page';

describe('LoanEmiCalculatorPage', () => {
  let component: LoanEmiCalculatorPage;
  let fixture: ComponentFixture<LoanEmiCalculatorPage>;

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
