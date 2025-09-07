import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CurrencyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
