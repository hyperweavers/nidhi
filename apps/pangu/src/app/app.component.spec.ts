import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { LOGGER } from '@nidhi/shared-logger';

import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: false }),
      ],
      providers: [
        provideRouter([]),
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

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
