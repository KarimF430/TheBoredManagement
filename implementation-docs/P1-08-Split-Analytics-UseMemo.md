# P1-08: Split the Analytics useMemo (22 Dependencies → Per-Tab)

## Current Problem
The analytics `useMemo` in `page.tsx:451-758` is a **~300-line function with 22 dependencies**:
```typescript
const analytics = useMemo(() => {
  // Computes: timeline, topViews, topFreq, brandBar, brandPositioning,
  //           brandEfficiency, channels, creatorChart, radar,
  //           longForm, shorts, totalViews, rankBuckets, langData,
  //           keywordTypeData, keywordActivity, scatterData,
  //           rankTypeCompare, coverageRate, untaggedRatio,
  //           regionalData, topCategory ...
  // ALL in one useMemo
}, [overview, videos, keywords, ovTrendDays, ovTrendFormat, brandSOVLang,
    brandSOVFormat, creatorFormat, creatorMinVideos, rankRangeFilter,
    rankBrandFilter, videoLanguagesMap, showDemo, regionalApiStats,
    regionalApiCounts, totalRegionalViews, chartTimeRange, chartCustomFrom,
    chartCustomTo])  // ← 22 dependencies
```

**Problem:** Changing any single filter (e.g., `ovTrendDays` from 14 to 30) recomputes **everything** — brand SOV, creators, rankings, scatter plot, regional data. Only the timeline needs to change.

## Implementation

### Phase 1 — Split into per-tab useMemo blocks
```typescript
// ── Overview Tab Analytics ──
const overviewAnalytics = useMemo(() => ({
  timeline: computeTimeline(overview, ovTrendDays, ovTrendFormat),
  regionalData: computeRegionalData(regionalApiStats, ...),
  topCategory: computeTopCategory(keywords),
}), [overview, ovTrendDays, ovTrendFormat, regionalApiStats, ...])

// ── Brand SOV Tab Analytics ──
const brandAnalytics = useMemo(() => ({
  topViews: computeBrandViewSOV(videos, brandSOVLang, brandSOVFormat),
  topFreq: computeBrandFreqSOV(videos, brandSOVLang, brandSOVFormat),
  brandPositioning: computeBrandPositioning(videos, brandSOVLang, brandSOVFormat),
  brandEfficiency: computeBrandEfficiency(videos, brandSOVLang, brandSOVFormat),
}), [videos, brandSOVLang, brandSOVFormat])

// ── Creators Tab Analytics ──
const creatorAnalytics = useMemo(() => ({
  channels: computeChannels(videos, creatorFormat, creatorMinVideos),
  creatorRadar: computeCreatorRadar(channels),
  creatorChart: computeCreatorChart(channels),
}), [videos, creatorFormat, creatorMinVideos])

// ── Rankings Tab Analytics ──
const rankAnalytics = useMemo(() => ({
  rankBuckets: computeRankBuckets(videos, rankBrandFilter, rankRangeFilter),
  scatterData: computeScatter(videos, rankBrandFilter, rankRangeFilter),
  rankTypeCompare: computeRankTypeCompare(longForm, shorts),
}), [videos, rankBrandFilter, rankRangeFilter])

// ── Global cross-tab analytics ──
const globalAnalytics = useMemo(() => ({
  longForm, shorts, totalViews, coverageRate, untaggedRatio,
  langData, keywordTypeData, keywordActivity,
}), [videos, keywords])
```

### Phase 2 — Extract computation functions into pure utilities
```typescript
// src/lib/compute-analytics.ts

export function computeBrandViewSOV(videos: Video[], lang: string, format: string) {
  // Pure function — no hooks, no component context
  // → Easily testable with Vitest
}

export function computeTimeline(overview: OverviewData | null, days: number, format: string) {
  // → Same
}
// ... etc
```

### Phase 3 — Each tab reads only its own analytics
```typescript
// OverviewTab.tsx
const { timeline, regionalData } = useOverviewAnalytics()
// → Only re-renders when overview-related dependencies change

// BrandSOVTab.tsx
const { topViews, topFreq, brandPositioning } = useBrandAnalytics()
// → Only re-renders when brand-related dependencies change
```

## Files Changed
| File | Change |
|---|---|
| `src/lib/compute-analytics.ts` | New — pure computation functions |
| `src/lib/use-analytics.ts` | New — per-tab useMemo hooks |
| `src/app/page.tsx` | Replace single useMemo with per-tab hooks |

## Drawbacks
1. **Duplicated iteration** — If both `computeBrandViewSOV` and `computeBrandFreqSOV` iterate the same `videos` array, that's 2x iteration. Mitigation: use a single pass that computes both, returning `{topViews, topFreq}` together.
2. **Intermediate results** — Some computations depend on other computations (e.g., `creatorRadar` depends on `channels`). Must ensure the dependency chain is correct. Mitigation: start from leaf computations and compose upward.
3. **Code volume** — A single 300-line function becomes 5 functions of ~60 lines each + hook wiring. Total code may increase by 30%. This is a good trade-off.
4. **Cannot optimize globally** — Some visualizations share computations (e.g., `longForm`/`shorts` filters are used by both brand and creator analytics). Splitting may cause redundant computation. Mitigation: compute shared data in `globalAnalytics` and pass as inputs.

## Effort
- Extract pure computation functions: 2-3 hours
- Create per-tab hooks: 1 hour
- Wire into components: 2 hours
- Test each tab independently: 1 hour
- **Total: ~1 day**
