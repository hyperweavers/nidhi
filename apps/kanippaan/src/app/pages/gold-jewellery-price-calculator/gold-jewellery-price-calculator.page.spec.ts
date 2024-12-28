import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoldJewelleryPriceCalculatorPage } from './gold-jewellery-price-calculator.page';

describe('GoldJewelleryPriceCalculatorPage', () => {
  let component: GoldJewelleryPriceCalculatorPage;
  let fixture: ComponentFixture<GoldJewelleryPriceCalculatorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoldJewelleryPriceCalculatorPage],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(GoldJewelleryPriceCalculatorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
