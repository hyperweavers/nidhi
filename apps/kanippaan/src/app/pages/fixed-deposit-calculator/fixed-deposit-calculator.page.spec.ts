import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FixedDepositCalculatorPage } from './fixed-deposit-calculator.page';

describe('FixedDepositCalculatorPage', () => {
  let component: FixedDepositCalculatorPage;
  let fixture: ComponentFixture<FixedDepositCalculatorPage>;

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
