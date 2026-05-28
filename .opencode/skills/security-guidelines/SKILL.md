---
name: security-guidelines
description: Use when performing security review or implementing security-sensitive code in the Nidhi finance PWAs. Covers XSS prevention, IndexedDB data exposure, Sentry PII scrubbing, CSP, service worker safety, and dependency auditing.
---

# Security Guidelines for Finance PWAs

## XSS Prevention

### DO NOT

- `bypassSecurityTrustHtml(value)` without sanitization
- `[innerHTML]="userContent"` without `DomSanitizer.sanitize(SecurityContext.HTML, ...)`
- Direct `document.write()` or `element.innerHTML =` assignments
- `eval()` or `new Function()` in application code

### DO

```typescript
import { DomSanitizer, SecurityContext } from '@angular/core';

const sanitizer = inject(DomSanitizer);
const safe = sanitizer.sanitize(SecurityContext.HTML, userContent);
```

## IndexedDB (Dexie) Security

### Known Limitations

- **IndexedDB is not encrypted at rest**. Data stored in Dexie is readable by any JavaScript running in the same origin, and by anyone with physical access to the device's browser profile.
- Do NOT store: plaintext API keys, access tokens, passwords, or any secrets that require regulatory protection.
- Acceptable to store: stock symbols, portfolio holdings, transaction history (this is expected for a client-side finance app).

### Export Safety

- `dexie-export-import` exports unencrypted JSON blobs. The export flow should:
  - Warn users that exported data is not encrypted
  - Never auto-upload exports to external services
  - Only share via user-initiated download

## Sentry PII Protection

Config in `sentry.config.ts`:

```typescript
beforeSend(event) {
  if (event.request?.url) {
    event.request.url = event.request.url.replace(/\?.*/, ''); // strip query strings
  }
  return event;
}
```

- Verify query strings, auth headers, and request bodies are stripped
- `normalizeDepth` should stay at 2 (never exceed 5)
- Sentry integration must be gated on production builds only

## Service Worker Safety

- `ngsw-config.json` should use `installMode: 'prefetch'` only for app assets, not API responses
- `dataGroups` should use `networkFirst` or `networkOnly` for API calls — never `cacheFirst` with sensitive data
- Service worker scope must be restricted to app origin

## Content Security Policy

Recommended CSP for deployed apps:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://*.economictimes.com https://*.moneycontrol.com https://*.kalyanjewellers.net;
img-src 'self' data: https://*.moneycontrol.com;
font-src 'self';
manifest-src 'self';
```

Note: GitHub Pages does not support custom CSP headers. Document this as a limitation.

## Dependency Auditing

Run before every major release:

```bash
npm audit
npm outdated
```

Known high-risk dependencies to watch:

- `chart.js` / `lightweight-charts` — SVG/Canvas rendering CVEs
- `flowbite` — DOM manipulation library; review for XSS in newer versions
- `dexie` — ensure no prototype pollution in latest version
- `uuid` — low risk but audit for CVE-2024-...

## Secrets Management

- `.env.example` contains keys, NOT actual values
- `SENTRY_DSN_PANGU`, `SENTRY_DSN_VATTI`, `SENTRY_DSN_PALAN` are injected via GitHub Variables in CI, never hardcoded
- Generated files (`src/generated/`) are gitignored and produced by build scripts
