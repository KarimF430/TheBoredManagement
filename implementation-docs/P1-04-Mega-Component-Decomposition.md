# P1-04: Decompose page.tsx Mega-Component

## Current Problem
`src/app/page.tsx` is **2332 lines** with:
- 20+ imported components/libraries
- 30+ `useState` variables
- One `useMemo` with 22 dependencies
- 9 tabs rendered via `{activeTab === '...' && (...)}` — all logic in one file
- 7 `useState` variables that mirror React Query data
- Inline styles for every element (no Tailwind classes used)

This makes the file impossible to maintain, refactor, or performance-tune. A change to one tab risks breaking others.

## Implementation Strategy
**Do NOT split into separate routes** (agreed from earlier discussion — shared state loss is too risky). Instead, split into per-tab component files that share state via a context.

### Phase 1 — Create a DashboardContext
```typescript
// src/lib/dashboard-context.tsx
'use client'
import { createContext, useContext } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

interface DashboardContextValue {
  activeCampaignId: string
  dashboardQuery: UseQueryResult
  // Per-widget filter states (lifted from page.tsx)
  ovTrendFormat: 'all' | 'long' | 'short'
  setOvTrendFormat: (v: 'all' | 'long' | 'short') => void
  // ... all other shared filters
  analytics: ReturnType<typeof computeAnalytics>
}

export const DashboardContext = createContext<DashboardContextValue>(...)
export const useDashboard = () => useContext(DashboardContext)
```

### Phase 2 — Create per-tab components
```
src/components/
  dashboard/
    OverviewTab.tsx    (was: lines 891-1423)
    BrandSOVTab.tsx    (was: lines 1428-1632)
    CreatorsTab.tsx    (was: lines 1637-...)
    RankingsTab.tsx
    VideosTabWrapper.tsx  (thin wrapper around existing VideosTab)
    KeywordsTabWrapper.tsx
    TrendsTabWrapper.tsx
    GrowthTabWrapper.tsx
    AlertsTabWrapper.tsx
    SettingsTabWrapper.tsx
    helpers/
      MetricCard.tsx
      Card.tsx
      KPI.tsx
      Delta.tsx
      Bar100.tsx
      Rank.tsx
      Tip.tsx
      Charts/  (recharts wrappers)
```

### Phase 3 — page.tsx becomes thin orchestration
```typescript
export default function OverviewPage() {
  return (
    <DashboardProvider>
      <TabBar />      {/* was inline tab pills */}
      <TabContent />  {/* switches between tab components */}
    </DashboardProvider>
  )
}
```

### Phase 4 — Pull the analytics useMemo into a custom hook
```typescript
// src/lib/use-analytics.ts
export function useAnalytics(
  overview, videos, keywords, 
  allFilterStates...
): AnalyticsResult {
  return useMemo(() => {
    // ... the 450-line computation, now testable in isolation
  }, [overview, videos, keywords, allFilterStates...])
}
```

## Files Changed
| File | Status |
|---|---|
| `src/app/page.tsx` | Existing → becomes ~50 lines |
| `src/lib/dashboard-context.tsx` | New |
| `src/lib/use-analytics.ts` | New |
| `src/components/dashboard/OverviewTab.tsx` | New |
| `src/components/dashboard/BrandSOVTab.tsx` | New |
| `src/components/dashboard/CreatorsTab.tsx` | New |
| `src/components/dashboard/RankingsTab.tsx` | New |
| `src/components/dashboard/helpers/*.tsx` | New (6-8 files) |
| `src/components/dashboard/helpers/Charts/*.tsx` | New (optional) |

## Drawbacks
1. **No incremental benefit until complete** — This is an all-or-nothing refactor. The file stays at 2332 lines until the last tab is extracted. Risk of getting 60% done and abandoning.
2. **Mitigation:** Do it in 3 clear PRs: (a) extract helpers + MetricCard/Card/KPI, (b) extract useAnalytics hook, (c) extract tabs one at a time, replacing with wrapper components as you go. Each PR improves the situation independently.
3. **Performance risk** — Wrapping everything in a context may cause unnecessary re-renders if not done carefully (all consumers re-render when any context value changes). Mitigation: split into multiple contexts (filter context, data context, UI context).
4. **State duplication** — Filters currently live as `useState` in page.tsx. Moving them to context means any component can change them. Must enforce one-way data flow.
5. **Time investment** — This is ~3 days of focused work with no visible user-facing change. Hard to justify to stakeholders.

## Alternative (lower effort)
Instead of full decomposition, extract only:
- The analytics `useMemo` into `use-analytics.ts` (testable, clean)
- The 6 helper components (MetricCard, Card, KPI, Delta, Bar100, Rank) into separate files
- Each tab render block into separate files

This gets 80% of the maintainability benefit with 30% of the effort.

## Effort
- Full decomposition: 3 days
- Minimal extraction (alternative): 1 day
- **Total (recommended): 1 day for alternative, revisit full decomposition later**

## Verification
- Every tab renders identical output to current page.tsx
- No visible loading states introduced
- All filters still work across tabs
