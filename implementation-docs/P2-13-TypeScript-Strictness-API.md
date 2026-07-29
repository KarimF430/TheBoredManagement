# P2-13: TypeScript Strictness — Eliminate `any` Types in API Layer

## Current Problem
The API routes and lib files use `any` extensively:
```typescript
// route.ts:272
const videoRows = await queryAll<any>(...)
// route.ts:314
const topVideos = videoRows.map((v: any) => ({...}))
// page.tsx:348
const [overview, setOverview] = useState<any>(null)
// supabase.ts:57
export async function queryAll<T = any>(...): Promise<T[]>
```

This means TypeScript is not catching:
- Misspelled property names (`video_count` vs `videoCount`)
- Changed API response shapes
- Missing null checks
- Type mismatches between API response and frontend expectations

## Implementation

### Phase 1 — Add typed result types to queryAll
Instead of `<T = any>`, use the existing `Database` type:

```typescript
// supabase.ts — leverage the Database type from supabase.ts:273-958
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

// Usage:
const keywords = await queryAll<Tables<'keywords'>>(sql, params)
// → keywords is typed as { id: string; text: string; campaign_id: string; ... }[]
```

### Phase 2 — Create API response types
```typescript
// src/lib/api-types.ts
export interface DashboardResponse {
  overview: {
    totalKeywords: number
    totalVideos: number
    totalViewership: number
    // ... all fields from the response
  }
  keywords: Tables<'keywords'>[]
  topVideos: (Tables<'videos'> & {
    keywords_appeared: string[]
    tags: string[]
  })[]
  campaignBrands: string[]
}
```

### Phase 3 — Remove `any` from all API routes
```typescript
// Before
const data = await queryAll<any>(sql, [cid])

// After
interface Top10Row { video_id: string }
const data = await queryAll<Top10Row>(sql, [cid])
```

### Phase 4 — Remove `any` from frontend
```typescript
// page.tsx — Before
const [overview, setOverview] = useState<any>(null)

// After
import type { OverviewData } from '@/lib/api-types'
const overview = dashboardQuery.data?.overview as OverviewData | undefined
```

## Files to refactor
| File | Estimated `any` count |
|---|---|
| `src/app/api/dashboard/route.ts` | ~15 |
| `src/app/page.tsx` | ~30+ |
| `src/app/brands/page.tsx` | ~10 |
| `src/lib/queries.ts` | ~20 |
| `src/lib/supabase.ts` | ~8 |
| `src/lib/scrape-pipeline-pg.ts` | ~50+ |
| Other API routes | ~5 each |

## Drawbacks
1. **Time investment** — A thorough `any` removal across the entire codebase is 2-3 days of tedious work with no visible user impact. The `scrape-pipeline-pg.ts` alone has 50+ `any` references.
2. **Type complexity** — Some API responses are dynamically shaped (e.g., `dailyViews` is built at runtime from SQL). These require explicit interfaces that must be kept in sync with SQL. If the SQL changes and the type doesn't, the `as` cast lies to you.
3. **Existing type definition has omissions** — The `Database` type in `supabase.ts:273-958` may be incomplete or outdated compared to the actual Supabase schema. Fixing it requires a schema sync.
4. **Marginal benefit in high-churn areas** — The `scrape-pipeline-pg.ts` code changes frequently. Adding strict types means updating the type definitions with every change. This friction may cause developers to reach for `as any` workarounds.

## Alternative (recommended)
Instead of blanket `any` removal, do **progressive typing**:
1. Start with API routes (the contract between frontend and backend) — add response types there (Phase 2 above)
2. Leave `scrape-pipeline-pg.ts` loosely typed (it's internal infrastructure)
3. Add runtime validation with Zod for API responses:

```typescript
import { z } from 'zod'

const DashboardResponseSchema = z.object({
  overview: z.object({
    totalKeywords: z.number(),
    totalVideos: z.number(),
    // ...
  }),
  keywords: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    // ...
  })),
})

// Validate API response at runtime + infer types
type DashboardResponse = z.infer<typeof DashboardResponseSchema>
```

This catches schema mismatches at runtime (important for cron jobs) and provides TypeScript types without manual interface maintenance.

## Effort
- Progressive typing (recommended): 1-2 days
- Blanket `any` removal: 3-4 days
- Zod schema validation: 2-3 days

**Recommendation:** Do Phase 2 (API response types) + Zod validation. Skip blanket `any` removal in scrape pipeline.

## Verification
- `npx tsc --noEmit` passes with no new errors
- API responses match Zod schemas (tested with existing data)
- Frontend correctly infers types from response
