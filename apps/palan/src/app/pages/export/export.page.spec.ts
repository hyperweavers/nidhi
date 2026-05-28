import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { ExportPage } from './export.page';

describe('ExportPage', () => {
  let component: ExportPage;
  let fixture: ComponentFixture<ExportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportPage],
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

    fixture = TestBed.createComponent(ExportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
