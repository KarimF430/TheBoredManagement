# P2-09: Test Coverage — Integration + E2E

## Current Problem
Only 1 test file exists: `src/lib/brand-analyzer.test.ts`. Zero tests for API routes, query layer, workers, or frontend. Any refactor (P1, P0) is blind — you won't know what you broke until someone clicks it in production.

## Implementation

### Phase 1 — API Integration Tests (Vitest + MSW)
```typescript
// src/__tests__/api/dashboard.test.ts
import { describe, it, expect, beforeAll } from 'vitest'

describe('GET /api/dashboard', () => {
  it('returns 400 when campaign_id is missing', async () => {
    const res = await fetch('http://localhost:3000/api/dashboard')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'campaign_id required' })
  })

  it('returns 401 when not authenticated', async () => {
    const res = await fetch('http://localhost:3000/api/dashboard?campaign_id=abc')
    expect(res.status).toBe(401)
  })

  // More tests with mocked Supabase client
})
```

Test files needed:
| Test File | What It Tests | Priority |
|---|---|---|
| `src/__tests__/api/dashboard.test.ts` | Dashboard endpoint response shape + error codes | High |
| `src/__tests__/api/brands.test.ts` | Brand CRUD + authorization | High |
| `src/__tests__/api/keywords.test.ts` | Keyword CRUD + scrape trigger | High |
| `src/__tests__/api/scrape.test.ts` | Scrape job queuing + status | Medium |
| `src/__tests__/api/cron.test.ts` | Cron auth + job dispatch | Medium |

### Phase 2 — Database Query Layer Tests
```typescript
// src/__tests__/lib/queries.test.ts
import { describe, it, expect } from 'vitest'
import { parseDurationSeconds, isShortVideo } from '@/lib/queries'

describe('parseDurationSeconds', () => {
  it('parses PT5M20S correctly', () => {
    expect(parseDurationSeconds('PT5M20S')).toBe(320)
  })
  it('returns 0 for null', () => {
    expect(parseDurationSeconds(null)).toBe(0)
  })
})

describe('isShortVideo', () => {
  it('returns true for videos under 240 seconds', () => {
    expect(isShortVideo('PT3M30S')).toBe(true)
  })
})
```

### Phase 3 — E2E Tests (Playwright)
```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('displays metric cards after login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'admin@test.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
  
  // Metric cards should render
  await expect(page.locator('text=Keywords Tracked')).toBeVisible()
  await expect(page.locator('text=Total Videos')).toBeVisible()
})

test('tab switching preserves state', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Brand SOV')
  await expect(page.locator('text=Share of Voice')).toBeVisible()
})
```

E2E test scenarios:
| Scenario | What It Covers |
|---|---|
| Login flow | Auth + session persistence |
| Dashboard loads | Metric cards render with data |
| Tab switching | Each tab loads without errors |
| Brand tagging flow | Pending → tagged → removed |
| Keyword management | Add → scrape → verify results |
| Navigation persistence | Go to page, leave, come back — data still there |

### Phase 4 — CI Integration
```yaml
# .github/workflows/test.yml
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test              # Unit + integration
      - run: npx playwright test   # E2E (if Supabase test project configured)
```

## Drawbacks
1. **API tests need a real database** — The API layer connects to Supabase. Tests either need: (a) a real test Supabase project, (b) mocked Supabase client, or (c) Dockerized PostgreSQL. Option (b) is fastest but tests the code in isolation from real DB behavior. Option (a) is most realistic but requires infrastructure.
2. **E2E tests are slow** — A full Playwright suite takes 5-15 minutes. This slows CI. Mitigation: run E2E tests nightly, not on every push.
3. **Test maintenance** — Every schema change requires updating tests. Without a culture of writing tests first, they'll rot. Mitigation: make test writing part of PR review checklist.
4. **No jest-dom/Testing Library** — Tests need `@testing-library/react` for component tests. Current setup only has Vitest. Adding it is straightforward but another dependency.

## Effort
- API tests (MSW): 2-3 days
- Query layer unit tests: 4 hours
- Playwright setup + scenarios: 2 days
- CI config: 1 hour
- **Total: ~5 days**

## Recommended Minimum (80% value, 20% effort)
Do ONLY:
1. `queries.test.ts` — pure functions, no DB needed (current 1 test → 20 tests)
2. API error handling tests — 401, 400, 403 for 3 key endpoints (dashboard, brands, keywords)
3. Login E2E test — smoke test

This covers the highest-risk paths for ~1 day.
