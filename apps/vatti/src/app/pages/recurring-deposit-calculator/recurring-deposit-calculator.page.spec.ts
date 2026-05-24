import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';
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
      providers: [
        {
          provide: LOGGER,
          useValue: {
            captureException: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecurringDepositCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
