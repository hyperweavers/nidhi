import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { GoldJewelleryPriceCalculatorPage } from './gold-jewellery-price-calculator.page';

describe('GoldJewelleryPriceCalculatorPage', () => {
  let component: GoldJewelleryPriceCalculatorPage;
  let fixture: ComponentFixture<GoldJewelleryPriceCalculatorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldJewelleryPriceCalculatorPage],
      providers: [
        provideHttpClient(),
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

    fixture = TestBed.createComponent(GoldJewelleryPriceCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
