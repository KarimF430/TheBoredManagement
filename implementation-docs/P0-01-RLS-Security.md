# P0-01: Row-Level Security & SQL Layer

## Current Problem
`src/lib/supabase.ts` uses a custom `exec_sql` RPC that sends raw SQL strings to Supabase. This bypasses Supabase's Row-Level Security because queries run under the `service_role` key. A missing `WHERE campaign_id = $1` in any query exposes all campaigns.

## Implementation

### Change 1 — Add campaign_id enforcement wrapper
Replace direct `supabase.rpc('exec_sql', ...)` calls with a wrapper that injects `campaign_id` constraints:

```typescript
// supabase.ts — new guardedQuery function
export async function queryAllGuarded<T>(
  sql: string,
  params: any[],
  campaignId: string  // required — forces caller to specify
): Promise<T[]> {
  // Validate campaignId is a valid UUID
  if (!campaignId || !UUID_RE.test(campaignId)) {
    throw new Error('Invalid or missing campaign_id')
  }
  return queryAll<T>(sql, [campaignId, ...params])
}
```

### Change 2 — Audit all queryAll calls
Search every `queryAll(` call across all API routes and lib files. Any query missing a campaign filter gets one added. This is the bulk of the work.

**Files to audit:** `route.ts` files in all API routes, `scrape-pipeline-pg.ts`, `queries.ts`

### Change 3 — Optional: Create Postgres RLS policies as defense-in-depth
Create SQL migration that adds RLS policies on all data tables:

```sql
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see campaigns they belong to
CREATE POLICY campaign_isolation ON campaigns
  USING (id IN (
    SELECT campaign_id FROM users WHERE id = auth.uid()
  ));
```

This is defense-in-depth — even if `exec_sql` is misused, RLS at the table level prevents data leaks.

## Files Changed
| File | Change |
|---|---|
| `src/lib/supabase.ts` | Add `queryAllGuarded()`, add `UUID_RE` if not present |
| `src/app/api/dashboard/route.ts` | Replace `queryAll` with `queryAllGuarded(cid)` |
| `src/app/api/*/route.ts` (all routes) | Audit every queryAll call, add campaign guard |
| `schema/005_rls_policies.sql` | New migration for RLS |

## Drawbacks
1. **False sense of security** — If any developer uses the unguarded `queryAll()` in new code, the protection is bypassed. Must either deprecate `queryAll` or rename it to `queryAllUnsafe` to signal intent.
2. **Performance** — RLS policies add query overhead (extra JOIN per query). For a dashboard doing 20+ queries per page load, this adds measurable latency (~50-200ms per page).
3. **exec_sql RPC bypasses RLS anyway** — Supabase RPCs run with `security_definer` by default (the definer's permissions, i.e. service_role). RLS policies apply to the calling user, not the definer. So **RLS won't actually help** if queries still go through `exec_sql`. The guard function is the real fix.
4. **Migration complexity** — If RLS is enabled, Supabase's native client queries (used in `queries.ts`) will also be restricted. Must ensure the service client has `bypass_rls` or the RPC is properly configured.

## Effort
- Code changes: 4-6 hours
- Testing each API route: 4 hours
- **Total: ~1-2 days**

## Verification
- Create a second campaign
- Login as a brand user restricted to campaign A
- Hit API with `campaign_id=B` → should return 403, not data
