# P1-05: SSR for Dashboard Shell + Lazy Hydration

## Current Problem
`src/app/page.tsx` starts with `'use client'` — the entire page is JavaScript-rendered. Users see a blank white screen until:
1. React JS bundle downloads and parses (200-400KB)
2. React hydrates the component tree
3. `useEffect` fires `fetchCampaigns()`
4. API call returns
5. State updates → re-render

This is **~2-4 seconds of blank screen** on a slow connection.

## Implementation

### Phase 1 — Create an SSR-friendly shell
The root layout (`layout.tsx`) already renders `<AppShell>{children}</AppShell>`. Make `AppShell` server-compatible by pushing the `'use client'` boundary deeper:

```typescript
// src/app/page.tsx — now a Server Component
import { Suspense } from 'react'
import ClientDashboard from './ClientDashboard'
import { PageSkeleton } from '@/components/PageSkeleton'

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientDashboard />
    </Suspense>
  )
}
```

### Phase 2 — Server-render initial data
Pre-fetch campaign data on the server and pass it as props:

```typescript
// src/app/page.tsx (Server Component)
import { getCampaignList } from '@/lib/queries-server'
import { ClientDashboard } from './ClientDashboard'

export default async function Page() {
  const initialCampaigns = await getCampaignList()  // Server-side fetch
  
  return (
    <ClientDashboard initialCampaigns={initialCampaigns} />
  )
}
```

The `ClientDashboard` component can then skip the `fetchCampaigns()` call on first render.

### Phase 3 — Lazy-load heavy tabs
Use `next/dynamic` with `ssr: false` for all chart-heavy tabs:

```typescript
// ClientDashboard.tsx
import dynamic from 'next/dynamic'

const BrandSOVTab = dynamic(() => import('@/components/dashboard/BrandSOVTab'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 400 }} />
})
```

This means:
- The initial HTML contains the Overview tab (metric cards, simple data)
- Chart libraries (recharts) only load when user clicks a chart tab
- No JavaScript is wasted on tabs the user may never open

## Files Changed
| File | Change |
|---|---|
| `src/app/page.tsx` | Convert to Server Component, move client logic to ClientDashboard.tsx |
| `src/app/ClientDashboard.tsx` | New — contains current `'use client'` logic |
| `src/lib/queries-server.ts` | New — server-safe data fetching (no 'use client' imports) |
| `src/components/PageSkeleton.tsx` | Update to match dashboard layout |

## Drawbacks
1. **Cannot use hooks in Server Components** — The conversion requires splitting the file. The current page.tsx uses `useState`, `useEffect`, `useMemo`, `useQuery` — all must move to ClientDashboard.tsx. This is the same decomposition as P1-04.
2. **Server rendering adds latency to initial page load** — The server must complete the data fetch before sending HTML. For slow Supabase queries, this could be worse than client-rendering (TTFB increases). Mitigation: keep server pre-fetching minimal (only campaign list, not full dashboard data).
3. **Hydration mismatch** — If server-rendered data differs from client data, React will error. Must ensure the server and client agree on the initial state. Mitigation: serialize the server data as a script tag (`<script id="__INITIAL_DATA__"...>`).
4. **Database connection in serverless** — Server Components that do DB queries will hold the connection during render. On Vercel, this ties up the function invocation. For a heavily-trafficked dashboard, this could cause cold starts under load.

## Effort
- Page split + Server Component: 1 day
- Data pre-fetching: 4 hours
- Lazy hydration: 2 hours
- **Total: ~1.5 days**

## Verification
- View page source — HTML should contain metric card values
- Disable JavaScript — page should show skeleton layout
- Network tab — chart JS bundles only load when chart tab is clicked
