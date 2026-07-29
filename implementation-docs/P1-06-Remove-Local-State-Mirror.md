# P1-06: Remove Local State Mirror of React Query Data

## Current Problem
In `page.tsx:348-356`, the component maintains **7 `useState` variables** that mirror React Query data:
```typescript
const [overview, setOverview] = useState<any>(null)
const [keywords, setKeywords] = useState<any[]>([])
const [videos, setVideos] = useState<any[]>([])
const [regionalApiStats, setRegionalApiStats] = useState<Record<string, number>>({})
const [regionalApiCounts, setRegionalApiCounts] = useState<Record<string, number>>({})
const [totalRegionalViews, setTotalRegionalViews] = useState(0)
const [hasData, setHasData] = useState(false)
```

These are populated via a `useEffect`:
```typescript
useEffect(() => {
  if (dashboardQuery.data) {
    setOverview(dashboardQuery.data.overview)
    setKeywords(dashboardQuery.data.keywords ?? [])
    setVideos(dashboardQuery.data.topVideos ?? [])
    // ... more setState calls
  }
}, [dashboardQuery.data])
```

**Why this destroys performance:**
1. Every React Query cache hit triggers this `useEffect` → 7 `setState` calls → 7 re-renders
2. The analytics `useMemo` depends on `overview`, `keywords`, `videos` — re-computes 450 lines on every navigation back
3. React Query's built-in caching is bypassed — the cache is copied into local state, defeating SWR patterns

## Implementation

### Change 1 — Read directly from dashboardQuery.data
Replace all references to local state with direct properties of `dashboardQuery.data`:

```typescript
// Before
<MetricCard label="Keywords" value={overview?.totalKeywords ?? 0} />

// After
<MetricCard label="Keywords" value={dashboardQuery.data?.overview?.totalKeywords ?? 0} />
```

### Change 2 — Remove the 7 useState declarations and the mirror useEffect
Delete lines 348-417 (the 7 `useState` declarations and the `useEffect` that copies data).

### Change 3 — Update the analytics useMemo to read from dashboardQuery directly
```typescript
// Before
const analytics = useMemo(() => {
  // ... uses overview, videos, keywords from local state
}, [overview, videos, keywords, ...])

// After
const analytics = useMemo(() => {
  const d = dashboardQuery.data
  if (!d) return fallbackEmptyAnalytics
  // ... uses d.overview, d.keywords, d.topVideos directly
}, [dashboardQuery.data, ...filterStates])
```

### Change 4 — Handle null data gracefully
Every place that accesses `overview?.x`, `videos.map(...)` etc. needs a null check or default.

## Specific lines to change
| Line(s) | Before | After |
|---|---|---|
| 348-356 | `const [overview, setOverview] = useState(null)` | Remove |
| 405-417 | `useEffect(() => { if (d.data) setOverview(...) })` | Remove entire effect |
| 408 | `const ov = d.overview \|\| d.kpis` | Use d.data.overview directly |
| 346 | `const [hasData, setHasData] = useState(false)` | Remove; compute inline |
| 760-768 | `const { isDemo, timeline, topViews, ... } = analytics` | Keep (reads from memo) |
| 894-1000 | `overview?.totalKeywords ?? 0` | `dashboardQuery.data?.overview.totalKeywords ?? 0` |

## Drawbacks
1. **More verbose JSX** — Instead of `overview?.totalKeywords`, you'll write `dashboardQuery.data?.overview?.totalKeywords ?? 0` everywhere. This can be mitigated with a local alias: `const overview = dashboardQuery.data?.overview`.
2. **Re-render implications** — The analytics `useMemo` will re-run whenever `dashboardQuery.data` changes (i.e., on every successful refetch). This is identical to current behavior but now predictable.
3. **Cannot "edit" local data** — If any feature modifies local state (e.g., optimistic updates when tagging a brand), the change would be lost on the next query update. Currently, the `useEffect` re-syncs. **Check if any inline editing happens.** If so, those features need to use React Query's cache directly or use `queryClient.setQueryData`.
4. **`hasData` is used inline** — Search for `hasData` references and replace with a computed boolean: `const hasData = !!dashboardQuery.data?.overview && (dashboardQuery.data.overview.totalVideos ?? 0) > 0`.

## Effort
- Find/replace in file: 2-3 hours
- Testing all 10+ usages of each removed state variable: 2 hours
- **Total: ~4-5 hours**

## Verification
- All metric cards, charts, and tables show the same values as before
- No new loading states appear on navigation
- React DevTools shows no unnecessary re-renders
- Navigating away and back shows cached data instantly (no API call in Network tab)
