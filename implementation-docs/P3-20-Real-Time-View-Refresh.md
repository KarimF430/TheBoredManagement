# P3-20: Real-Time View Refresh via Supabase Realtime

## Current Problem
The dashboard only refreshes when the user clicks "Refresh" or on component mount. View data from the daily cron job is invisible until the next manual refresh. After the daily view update runs (8 AM), users must reload the page to see new data.

## Implementation

### Phase 1 — Subscribe to view_snapshots changes
```typescript
// src/lib/use-realtime-views.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeViews(campaignId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Subscribe to INSERT events on view_snapshots for this campaign
    const channel = supabase
      .channel('view-snapshots')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'view_snapshots',
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload) => {
        // Invalidate dashboard query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['dashboard', campaignId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, queryClient])
}
```

### Phase 2 — Add to dashboard page
```typescript
// page.tsx or dashboard context
import { useRealtimeViews } from '@/lib/use-realtime-views'

export default function OverviewPage() {
  const { activeCampaignId } = useCampaignStore()
  useRealtimeViews(activeCampaignId)
  // ...
}
```

### Phase 3 — Add realtime for scrape completion
```typescript
// Subscribe to scrape_jobs changes to show "new data available" indicator
supabase.channel('scrape-jobs')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'scrape_jobs',
    filter: `campaign_id=eq.${campaignId}`,
  }, (payload) => {
    if (payload.new.status === 'completed') {
      // Show a toast/notification: "New keyword data available"
      // Don't auto-refresh (user may be mid-analysis)
      setShowNewDataIndicator(true)
    }
  })
  .subscribe()
```

### Phase 4 — Add visual indicator
When new data is available, show a subtle indicator:
```typescript
// Page header area
{newDataAvailable && (
  <button onClick={() => { refetch(); setNewDataAvailable(false) }}
    style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', ... }}>
    ⬇ New data available — Click to refresh
  </button>
)}
```

## Files Changed
| File | Change |
|---|---|
| `src/lib/use-realtime-views.ts` | New hook |
| `src/app/page.tsx` | Add hook + data indicator |
| Supabase | Enable Realtime on `view_snapshots` and `scrape_jobs` tables |

## Drawbacks
1. **WebSocket connection overhead** — Supabase Realtime uses WebSockets. Each open browser tab creates a connection. For 10 concurrent users, that's 10 persistent connections. Mitigation: Supabase free tier allows 200 concurrent connections, so this is fine for dashboard scale.
2. **Realtime must be enabled per table** — Supabase does not enable Realtime by default for all tables. Must go to Supabase dashboard → Database → Replication → enable for `view_snapshots` and `scrape_jobs`. This is a one-time config step.
3. **Noisy updates** — If the view snapshot cron job inserts 500 rows in batch, that's 500 `postgres_changes` events triggering 500 invalidation calls. React Query debounces these, but the WebSocket bandwidth could be wasted. Mitigation: batch inserts into a single Webhook event or debounce the invalidation:

```typescript
// Debounced invalidation — at most once per 10 seconds
const debouncedInvalidate = useRef(
  debounce(() => queryClient.invalidateQueries(...), 10000)
).current
```

4. **Security** — Realtime subscriptions use the anon key. If RLS is not enabled, any client can subscribe to any campaign's events. Ensure RLS policies are in place before enabling Realtime.
5. **No persistent updates cross-device** — If the user opens the dashboard on two devices, both will independently receive events. This is expected behavior.

## Effort
- useRealtimeViews hook: 1-2 hours
- Supabase Realtime config: 15 min
- Visual indicator: 30 min
- Debounce handling: 30 min
- Testing: 1 hour
- **Total: ~3-4 hours**
