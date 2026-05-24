import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { MarketService } from './market.service';

describe('MarketService', () => {
  let service: MarketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
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
    });
    service = TestBed.inject(MarketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
