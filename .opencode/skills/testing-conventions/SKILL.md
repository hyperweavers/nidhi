---
name: testing-conventions
description: Use when writing or reviewing Jest unit tests for Angular standalone components, services, and pipes in the Nidhi monorepo. Covers jest-preset-angular setup, mocking patterns, test boilerplate, and coverage expectations.
---

# Testing Conventions

Check `@angular/core`, `jest`, and `jest-preset-angular` versions in `package.json` for the current major versions.

## Setup

Each app's `test-setup.ts`:

```typescript
import 'jest-canvas-mock';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv({ errorOnUnknownElements: true, errorOnUnknownProperties: true });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

(globalThis as any).DatePicker = jest.fn();
```

## Component Test Template

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

describe(`${FeatureComponent.name}`, () => {
  let component: FeatureComponent;
  let fixture: ComponentFixture<FeatureComponent>;
  const mockLogger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureComponent],
      providers: [
        provideHttpClient(),
        { provide: LOGGER, useValue: mockLogger },
        // Add service mocks as needed
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

## Service Test Template

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOGGER } from '@nidhi/shared-logger';

describe(`${FeatureService.name}`, () => {
  let service: FeatureService;
  let httpMock: HttpTestingController;
  const mockLogger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FeatureService, provideHttpClient(), provideHttpClientTesting(), { provide: LOGGER, useValue: mockLogger }],
    });
    service = TestBed.inject(FeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch data', () => {
    service.getData().subscribe((data) => expect(data).toEqual([]));
    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

## What to Cover

| Scenario      | Test                                                     |
| ------------- | -------------------------------------------------------- |
| Happy path    | Component renders, service returns data                  |
| Loading state | `loading` signal is `true` before data arrives           |
| Error state   | `catchError` returns fallback, logger.error called       |
| Empty state   | Empty array / null input renders empty template          |
| Edge cases    | Missing inputs, invalid IDs, negative numbers (finance!) |

## Commands

```bash
# Single project
pnpm nx test pangu
pnpm nx test vatti
pnpm nx test palan

# All affected
pnpm nx affected -t test

# With coverage
pnpm nx test pangu --codeCoverage

# Watch mode
pnpm nx test pangu --watch
```
