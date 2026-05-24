import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { PostOfficeSavingsSchemesPage } from './post-office-savings-schemes.page';

describe('PostOfficeSavingsSchemesPage', () => {
  let component: PostOfficeSavingsSchemesPage;
  let fixture: ComponentFixture<PostOfficeSavingsSchemesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostOfficeSavingsSchemesPage],
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

    fixture = TestBed.createComponent(PostOfficeSavingsSchemesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
