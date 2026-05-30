---
name: angular-conventions
description: Use when generating or reviewing Angular code in the Nidhi monorepo. Covers standalone components, OnPush, inject() DI, @UntilDestroy, RxJS/signals, Tailwind + Flowbite, Dexie schemas, and Chart.js/lightweight-charts integration patterns.
---

# Angular Conventions

Check `@angular/core` version in `package.json` for the current major. All conventions below assume the installed Angular version — adjust if APIs differ across majors.

## Standalone Components

Every component, directive, and pipe is standalone. Import dependencies directly — no NgModule.

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, DatePipe, NgFor, NgIf, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class DashboardPage {}
```

## Dependency Injection

Use `inject()` — never constructor DI.

```typescript
import { inject } from '@angular/core';

export class DashboardPage {
  private readonly marketService = inject(MarketService);
  readonly logger = inject(LOGGER);
}
```

## Lifecycle with @UntilDestroy

```typescript
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({ ... })
export class FeatureComponent {
  private readonly destroy$ = inject(UntilDestroy); // injected reference

  ngOnInit() {
    this.marketService.prices$.pipe(untilDestroyed(this)).subscribe(prices => {
      this.prices.set(prices);
    });
  }
}
```

## RxJS + Signals Bridge

**Service exposes Observable:**

```typescript
private readonly pricesSubject = new BehaviorSubject<Price[]>([]);
readonly prices$ = this.pricesSubject.asObservable();
```

**Component consumes as signal:**

```typescript
readonly prices = toSignal(this.marketService.prices$, { initialValue: [] });
```

**Template uses signal:**

```html
<div *ngFor="let price of prices()">{{ price.value }}</div>
```

## Tailwind CSS + Flowbite

- Utility classes in templates; no CSS files for layout
- Dark mode: `<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">`
- Flowbite components via existing CDK classes
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Check `tailwindcss` version in `package.json`.

## Dexie Schema (apps with DB)

Stored in `src/app/db/`:

```typescript
import Dexie, { type EntityTable } from 'dexie';

export interface Stock {
  id?: number;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
}

export class AppDatabase extends Dexie {
  stocks!: EntityTable<Stock, 'id'>;

  constructor() {
    super('pangu');
    this.version(1).stores({
      stocks: '++id, symbol, name',
    });
  }
}
```

Wrap operations in an injectable service.

## Chart.js (ng2-charts)

```typescript
import { ChartModule } from 'ng2-charts';
// In imports: [ChartModule]
// Template: <canvas baseChart [data]="chartData" [type]="'doughnut'"></canvas>
```

## lightweight-charts

```typescript
import { createChart, ColorType } from 'lightweight-charts';

// In AfterViewInit:
const chart = createChart(this.chartContainer.nativeElement, {
  layout: { textColor: '#d1d5db', background: { type: ColorType.Solid, color: 'transparent' } },
  width: this.chartContainer.nativeElement.clientWidth,
  height: 400,
});
```

## Routing (withComponentInputBinding)

```typescript
// app.routes.ts
{ path: 'stocks/:id', loadComponent: () => import('./pages/stocks/stocks.page').then(m => m.StocksPage) }

// In component:
readonly stockId = input.required<string>(); // bound automatically from route param
```

## Sentry + Logger

```typescript
const logger = inject(LOGGER);
logger.info('Dashboard initialized');
try {
  /* risky op */
} catch (e) {
  logger.captureException(e);
}
```
