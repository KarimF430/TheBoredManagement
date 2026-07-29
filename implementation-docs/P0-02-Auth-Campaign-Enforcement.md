# P0-02: Campaign Authorization Enforcement

## Current Problem
Every API route accepts `campaign_id` as a query parameter (`req.nextUrl.searchParams.get('campaign_id')`) but **never validates that the authenticated user is allowed to access that campaign**. A brand user restricted to campaign A can trivially access campaign B's data by changing the query parameter.

## Implementation

### Change 1 — Create an authorization helper
```typescript
// src/lib/auth.ts — add
export async function authorizeCampaignAccess(
  req: NextRequest,
  campaignId: string
): Promise<{ authorized: boolean; error?: NextResponse }> {
  const session = await getSession(req)
  if (!session) {
    return { authorized: false, error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }
  // Admin can access any campaign
  if (session.role === 'admin') {
    return { authorized: true }
  }
  // Brand users can only access their assigned campaign
  if (session.campaign_id !== campaignId) {
    return { authorized: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { authorized: true }
}
```

### Change 2 — Add guard to every API route
Pattern for every route handler:

```typescript
export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get('campaign_id')
  if (!cid) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  const { authorized, error } = await authorizeCampaignAccess(req, cid)
  if (!authorized) return error

  // ... existing logic ...
}
```

### Files to modify
All 15+ API route groups that accept `campaign_id`:
- `/api/dashboard/route.ts`
- `/api/overview/route.ts`
- `/api/brands/route.ts`
- `/api/keywords/route.ts`
- `/api/videos/route.ts`
- `/api/video/route.ts`
- `/api/channel/route.ts`
- `/api/sov-trend/route.ts`
- `/api/brand-growth/route.ts` (if exists)
- `/api/alerts/route.ts`
- `/api/client/route.ts`
- `/api/analytic-calendar/route.ts`
- `/api/scrape/route.ts`
- `/api/campaigns/route.ts`

## Drawbacks
1. **Extra DB lookup per request** — `getSession()` reads and verifies a JWT (fast, no DB), but if we need to validate the user still exists in the DB, it adds latency. With JWT-only (current approach), the check is O(1) and has no DB cost.
2. **Middleware already does role checks** — There's overlap. The middleware checks role and redirects non-admin users. Adding campaign_id checks at the route level means the logic is duplicated. However, it's the right trade-off — defense in depth, and middleware can't validate data-level permissions.
3. **API routes that return JSON don't need campaign_id** — Some routes like `/api/auth/login`, `/api/cron` don't take campaign_id. Must be careful not to break these.
4. **`/api/client` route** — This serves brand-scoped data. It already knows the user's campaign_id from the JWT and shouldn't accept a query param at all. May need a separate implementation.

## Effort
- Add helper function: 30 min
- Modify 15 route files: 2-3 hours
- Test each route: 2 hours
- **Total: ~1 day**

## Verification
- Login as brand user for campaign A
- Call `/api/dashboard?campaign_id=<campaign B UUID>` 
- Expected: 403 response
