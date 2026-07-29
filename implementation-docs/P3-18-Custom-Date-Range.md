# P3-18: Custom Date Range on All Time-Series

## Current Problem
The Views Tracker on the main page already has a custom date range picker (`chartTimeRange === 'custom'` with `chartCustomFrom`/`chartCustomTo`). But other time-series charts use only preset ranges:
- SOV Trend: Daily / Monthly / 3-Month / 6-Month / 1-Year (hardcoded in `queries.ts:292`)
- Growth: 24h / 7d / 30d (hardcoded in `page.tsx:362`)
- Brand Growth: 24h / 7d / 30d (accepts period param)

## Implementation

### Phase 1 — Refactor date range as a reusable component
```typescript
// src/components/DateRangePicker.tsx
interface DateRangePickerProps {
  value: { from: string; to: string } | null
  onChange: (range: { from: string; to: string } | null) => void
  presets?: Array<{ label: string; days: number }>
}

export function DateRangePicker({ value, onChange, presets }: DateRangePickerProps) {
  // Shows preset chips + "Custom" option
  // Custom option shows two date inputs
  // Returns { from: '2025-01-01', to: '2025-01-31' }
}
```

### Phase 2 — Add to SOV Trend page
The SOV Trend API (`/api/sov-trend`) already accepts a `range` parameter. Add support for `range=custom&from=...&to=...`:

```typescript
// queries.ts — update getSovTrend
export async function getSovTrend(
  db, campaignId, brands,
  range: 'daily' | 'monthly' | '3m' | '6m' | '1y' | 'custom',
  from?: string,
  to?: string
) {
  let days: number
  if (range === 'custom') {
    // Use from/to directly
  } else {
    days = daysMap[range]
  }
  // ...
}
```

### Phase 3 — Add to Brand Growth page
```typescript
// brand-growth route — add support
const period = searchParams.get('period') || '7d'
const customFrom = searchParams.get('from')
const customTo = searchParams.get('to')
// Pass to DB query
```

## Files Changed
| File | Change |
|---|---|
| `src/components/DateRangePicker.tsx` | New reusable component |
| `src/app/sov-trend/page.tsx` | Add custom range support |
| `src/app/brand-growth/page.tsx` | Add custom range support |
| `src/lib/queries.ts` | Update `getSovTrend` to accept custom range |
| API routes for sov-trend, brand-growth | Accept `from`/`to` params |

## Drawbacks
1. **Data gaps** — If the user picks a date range with no data (e.g., before the campaign started), the chart will be empty. Mitigation: show "No data for selected range" message, suggest nearest dates with data.
2. **Large date ranges** — A 2-year custom range could return thousands of data points, slowing the chart render. Mitigation: cap at 365 days server-side, or downsample to weekly points for ranges > 90 days.
3. **URL persistence** — Custom dates are lost on page refresh. Mitigation: encode in URL query params (`/sov-trend?from=2025-01-01&to=2025-01-31`).

## Effort
- DateRangePicker component: 2 hours
- SOV Trend custom range: 2 hours
- Brand Growth custom range: 1 hour
- **Total: ~5 hours**
