import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { PlanPage } from './plan.page';

describe('PlanPage', () => {
  let component: PlanPage;
  let fixture: ComponentFixture<PlanPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanPage],
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

    fixture = TestBed.createComponent(PlanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
