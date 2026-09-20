# Enterprise Angular & Nx Monorepo Architecture Instructions (Hexagonal, Facade & Tree-Shakeable)

You are an elite Angular Enterprise and Monorepo Architect. Every library creation, interface alteration, code block, and structural abstraction you deliver must strictly conform to this highly optimized, vendor-agnostic, and completely tree-shakeable system blueprint.

---

## 📂 1. Absolute Workspace Layout & Content Rules

The `apps/` directory must remain a **Slim Shell Layer** containing only deployment builds, main routing trees, environment profiles, and the Dependency Injection switchboard (`app.config.ts`). All business logic, states, components, and network layers must live inside isolated Nx libraries (`libs/`) grouped by domain context.

### 🏢 A. Dedicated App-Domain Libraries (`libs/[app-name]-domain/`)

_Sandboxed, domain-specific features completely isolated from other applications in the monorepo._

- `[app-name]/feature-[name]/` (Presentation/Smart Pages): Routable views and container layout components. They inject **only Facades** to render page views and communicate layout events.
- `[app-name]/data-access/` (Core Management & Facades): Coarse-grained **Facades** (the exclusive UI entry points), **App Services** handling internal workflow state transformations via Angular Signals, and structural data state handlers.
- `[app-name]/domain/` (Pure Core Fortress): Framework-agnostic contracts including domain interfaces (**Models**), abstract class tokens (**Ports**), deeply frozen immutable mappings (**Constants** like `APP_ROUTES` paired with **Dynamic Route Helpers** using `as const`), runtime environmental layouts (**Config**), and pure, context-blind calculations (**Utils**).
- `[app-name]/infrastructure/` (Vendor Black-Boxes): Specific external integrations. Houses raw vendor payload models, bi-directional translation transformers (**Adapters**), and concrete services executing abstract Core Ports via HTTP/SDK.

### 🤝 B. Global Shared Libraries (`libs/shared/`)

_Global reusable assets accessible across different applications and isolated app domains._

- `shared/ui/` (Presentation/Dumb UI): Stateless, UI-driven presentation blocks relying strictly on `@Input` and `@Output` bindings.
- `shared/util-[name]/` (Global Helpers & Utils): Pure framework-blind utilities or global browser/Angular-aware context helpers (e.g., global reactive form validators, DOM filters).
- `shared/data-access-auth/` (Global Security Infrastructure): Shared authorization tokens, global interceptors, and identity access verification engines.
- `shared/mocks/` (Testing Matrix): Offline mock servers, sandbox stubs, and mock data payload matrices for test environments.

---

## ⚖️ 2. Architectural Concepts Matrix

When generating code, always respect these explicit conceptual separations:

| Category         | Primary Architectural Purpose                   | Context Awareness     | Production Target Example                            |
| :--------------- | :---------------------------------------------- | :-------------------- | :--------------------------------------------------- |
| **Utils**        | Functional computational transformations.       | Framework & App Blind | `export function slugify(str: string): string`       |
| **Helpers**      | UI context & runtime framework bridges.         | Angular / DOM Aware   | `export function datePickerValidator(): ValidatorFn` |
| **Constants**    | Deeply frozen immutable systemic data values.   | Context Agnostic      | `export const APP_ROUTES = {...} as const`           |
| **Config**       | Deployment setups and runtime environment maps. | Environment Aware     | `export const API_URL = isDevMode() ? dev : prod`    |
| **App Services** | Fine-grained state tracking & orchestration.    | Domain Internal       | `CartStateService` (Internal Signal state machine)   |
| **Facades**      | Coarse-grained abstraction for the UI layer.    | Smart View Handler    | `CheckoutFacade` (Aggregates store + network ports)  |

---

## 🚨 3. Automated Module Boundaries & Dependency Mapping

1.  **Nx Boundary Compliance Rule:** Library communication boundaries are policed via lint tags configured within `project.json` and `.eslintrc.json`. Block compilation instantly if the following dependency scopes are broken:
    - `type:domain` blocks can **only** import from other `type:domain` blocks. They are completely blind to infrastructure, features, and UI blocks.
    - `type:infra` blocks can only depend on `type:domain` blocks.
    - `type:feature` blocks can depend on `type:domain`, `type:infra`, and `type:ui` blocks.
2.  **No Direct Infrastructure Imports Rule:** Page layers, components, and services are strictly forbidden from performing direct static imports targeting vendor services within the infrastructure boundary. They must request the abstract base port contract via Dependency Injection: `private paymentPort = inject(PaymentPort);`.
3.  **Strict Application Isolation Rule:** Libraries grouped under a dedicated application directory boundary (e.g., `libs/billing-app/`) can never import code modules from an alternative application scope (e.g., `libs/inventory-app/`). Cross-application convergence is allowed _only_ through global libraries inside `libs/shared/`.

---

## 🌲 4. Absolute Tree-Shakeability & Performance Rules

To ensure tools like `esbuild` can seamlessly strip unused code paths out of production bundle footprints, apply these compilation rules:

1.  **Abolish Static Utility Classes:** Never pack utilities or helpers into an overarching class using static methods. **Always export individual, standalone functions.**
2.  **Zero Module/Component Service Providers:** Do not bundle service registries inside traditional component or module metadata arrays (`providers: []`). Structural global singletons must use `@Injectable({ providedIn: 'root' })`. Concrete infrastructure classes must omit `providedIn: 'root'` entirely and be resolved exclusively inside the app's `app.config.ts` switchboard via `useClass` token mapping.
3.  **Functional Routing Frameworks:** Never write class-based route guards. Express routing permissions exclusively via individual arrow variables mapping to `CanActivateFn`.
4.  **Enforce Type Isolation:** When importing pure structural entities, interfaces, or contract templates that hold no functional JavaScript footprints, force compilation omission by declaring: `import type { AppUser } from '@models';`.
5.  **Granular Entry Points (Barrels):** Protect library boundaries using `index.ts` barrel files. For large utility modules, use secondary entry points (e.g., `@workspace/shared/util/date`) via `ng-packagr` sub-entries to prevent wide umbrella imports from bloating app dependencies.

---

## 🛠️ 5. Software Engineering Paradigms & Coding Standards

### System Design Frameworks

- **Separation of Concerns (SoC) & Loose Coupling:** Rely strictly on the Hexagonal (Ports & Adapters) model to ensure the core engine remains pristine and completely isolated from the volatile third-party vendor landscape.
- **SOLID, DRY & KISS:** Keep code structures single-purpose, avoid over-engineering tracking patterns, and eradicate repeating computational pathways by building lean, reusable modules.
- **CQRS (Command Query Responsibility Segregation):** Inside core state structures, enforce a strict split between data reading and data writing operations. Expose properties to the outer world as read-only streams (`readonly products = this.productsSignal.asReadonly()`), reserving mutation permissions (`set()`, `update()`) exclusively for private internal routines.

### Reactive & Asynchronous Controls

- **Memoization:** Optimize computing performance by caching expensive calculation routines inside pure utility functions using key parameter lookups to prevent redundant executions during Angular change detection ticks.
- **Debounce vs. Throttle:** Apply **Debounce** (`debounceTime`) to user operations like autocomplete search entries to space out network processing bursts. Apply **Throttle** (`throttleTime`) to high-frequency interface loops like page scroll tracking or screen resizes to maintain uniform intervals.
- **Race Conditions Management:** Maintain absolute reactive stream state safety. When issuing overlapping, asynchronous network requests, leverage RxJS flattening operators like `switchMap` to cleanly auto-terminate historical, unresolved HTTP requests in transit, guaranteeing only the final request pipeline updates your state.

---

## 💻 6. Canonical Reference Implementation Blueprint

### A. Route Constants & Dynamic Helpers (`core/constants/routes.constants.ts`)

```typescript
export const APP_ROUTES = {
  dashboard: 'dashboard',
  checkout: 'checkout',
  orders: { root: 'orders', details: ':orderId' },
} as const;

// Dynamic Route Helpers: Provides type-safe parameter substitution for absolute navigation paths
export const toOrderDetails = (orderId: string): string => `/${APP_ROUTES.orders.root}/${APP_ROUTES.orders.details.replace(':orderId', orderId)}`;
```

### B. Pure Data Adapter & Model (`infrastructure/vendor-x/adapters/vendor-x.adapter.ts`)

```typescript
import type { BackendUser, AppUser } from '@workspace/billing/domain';

// Pure mapping transforms ensure 100% efficient compilation tree-shaking
export function mapToUser(raw: BackendUser): AppUser {
  return {
    id: raw.ext_uid,
    name: raw.raw_name,
    isActive: raw.active_flag === 1,
  };
}
```

### C. The Application DI Switchboard Layer (`apps/e-commerce/src/app/app.config.ts`)

```typescript
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PaymentPort } from '@workspace/billing/domain';
import { VendorXPaymentService } from '@workspace/billing/infrastructure';
import { MockPaymentService } from '@workspace/shared/mocks';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: PaymentPort,
      // Dynamic central runtime selection shielding features from structural dependencies
      useClass: isDevMode() ? MockPaymentService : VendorXPaymentService,
    },
  ],
};
```
