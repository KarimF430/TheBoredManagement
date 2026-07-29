# P2-14: Stabilize the exec_sql Response Parser

## Current Problem
The `queryAll` function in `supabase.ts:82-103` has **7 conditional branches** trying to unwrap the Supabase RPC response:

```typescript
if (Array.isArray(data)) {
  if (data.length === 0) return []
  const first = data[0]
  if (first?.json_agg === null || first?.json_agg === undefined) return []
  if (first?.json_agg) rows = Array.isArray(first.json_agg) ? first.json_agg : [first.json_agg]
  else if (Array.isArray(first)) rows = first
  else rows = [first]
} else if (data?.json_agg === null || data?.json_agg === undefined) {
  return []
} else if (data?.json_agg) {
  rows = Array.isArray(data.json_agg) ? data.json_agg : [data.json_agg]
} else if (Array.isArray(data)) {
  rows = data
} else {
  rows = [data]
}
return Array.isArray(rows) ? rows.filter(Boolean) : [rows].filter(Boolean)
```

**Why this is dangerous:**
- The shape of the RPC response differs between Supabase versions, platforms (local vs cloud), and query types
- Any of these branches returning the wrong shape silently corrupts data
- No error is thrown — the function returns `[]` on unexpected shapes, hiding data loss
- The `RETURNING` clause handler (lines 107-127) has its own separate multi-branch unwrapper
- The CTE wrapper (lines 65-80) has a brittle "find last closing paren" heuristic

## Implementation

### Phase 1 — Replace with a tested utility function
```typescript
// supabase.ts — replace the multi-branch with a tested function

const JSON_AGG_EMPTY_SENTINEL = Symbol('json_agg_empty')

function unwrapExecSqlResponse<T>(response: unknown): T[] {
  if (!response) return []

  // Normalize to array
  const items = Array.isArray(response) ? response : [response]
  if (items.length === 0) return []

  // Most common path: data[0].json_agg = [{...}, {...}]
  const first = items[0] as Record<string, unknown>
  
  if (first && typeof first === 'object' && 'json_agg' in first) {
    const agg = first.json_agg
    if (agg === null || agg === undefined) return []
    return Array.isArray(agg) ? (agg as T[]) : [agg as T]
  }

  // Fallback: data is already an array of rows
  return items as T[]
}
```

### Phase 2 — Add tests
```typescript
// src/__tests__/lib/supabase.test.ts
import { describe, it, expect } from 'vitest'

// The unwrap function would need to be exported or tested via public API
describe('queryAll response unwrapping', () => {
  const unwrap = unwrapExecSqlResponse

  it('handles empty response', () => {
    expect(unwrap(null)).toEqual([])
    expect(unwrap(undefined)).toEqual([])
    expect(unwrap([])).toEqual([])
  })

  it('handles standard json_agg response', () => {
    const data = [{ json_agg: [{ id: 1 }, { id: 2 }] }]
    expect(unwrap(data)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('handles json_agg with empty array', () => {
    const data = [{ json_agg: [] }]
    expect(unwrap(data)).toEqual([])
  })

  it('handles json_agg with null', () => {
    const data = [{ json_agg: null }]
    expect(unwrap(data)).toEqual([])
  })

  it('handles single object instead of array', () => {
    const data = [{ json_agg: { id: 1 } }]
    expect(unwrap(data)).toEqual([{ id: 1 }])
  })

  it('handles direct array response', () => {
    const data = [{ id: 1 }, { id: 2 }]
    expect(unwrap(data)).toEqual([{ id: 1 }, { id: 2 }])
  })
})
```

### Phase 3 — Add debugging for unexpected shapes
```typescript
function unwrapExecSqlResponse<T>(response: unknown): T[] {
  if (!response) return []

  const items = Array.isArray(response) ? response : [response]
  if (items.length === 0) return []

  const first = items[0] as Record<string, unknown>
  
  if (first && typeof first === 'object' && 'json_agg' in first) {
    const agg = first.json_agg
    if (agg === null || agg === undefined) return []
    // Log unexpected shapes for debugging
    if (!Array.isArray(agg) && typeof agg !== 'object') {
      console.warn('Unexpected json_agg shape:', typeof agg, agg)
    }
    return Array.isArray(agg) ? (agg as T[]) : [agg as T]
  }

  // If we get here with something unexpected, log it
  if (items.length > 0) {
    const sample = JSON.stringify(items[0]).slice(0, 200)
    console.warn('Unexpected exec_sql response shape:', sample)
  }

  return items as T[]
}
```

## Files Changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Replace response unwrapping logic (lines 82-132) |
| `src/__tests__/lib/supabase.test.ts` | New test file |

## Drawbacks
1. **Supabase RPC behavior is version-dependent** — What works today may break on Supabase platform upgrades. Tests help detect regression but don't prevent it.
2. **Removing branches may break edge cases** — The current code handles multiple shapes because they actually occur in different environments. Simplifying could break on a different Supabase version or configuration.
3. **The real fix is to stop using exec_sql** — The cleanest solution is to migrate away from the `exec_sql` RPC pattern entirely and use Supabase's native query client with RLS. This is a larger architectural change (scoped separately).

## Effort
- Write unwrap utility: 1 hour
- Write tests: 1 hour
- Integrate into queryAll + RETURNING handler: 1 hour
- Test with real Supabase data: 1 hour
- **Total: ~4 hours**

## Verification
- All existing API routes return correct data
- Unit tests pass in CI
- No console.warn for unexpected shapes in production logs
