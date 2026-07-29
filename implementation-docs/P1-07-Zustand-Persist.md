# P1-07: Zustand Persist — Campaign Store Survives Navigation

## Current Problem
`src/lib/store.ts` uses a plain Zustand store. When `page.tsx` re-mounts after navigation:
- `activeCampaignId` resets to `''` (default)
- `_campaignsFetched` resets to `false`
- `fetchCampaigns()` fires again → API call
- On response, `activeCampaignId` is set → React Query key changes → new API call

This causes **two sequential API calls** on every page return.

## Implementation

### Change 1 — Add persist middleware
```typescript
// src/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CampaignStore {
  campaigns: Campaign[]
  activeCampaignId: string
  _campaignsFetched: boolean
  setActiveCampaignId: (id: string) => void
  fetchCampaigns: () => Promise<void>
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      campaigns: [],
      activeCampaignId: '',
      _campaignsFetched: false,

      setActiveCampaignId: (id) => {
        const prev = get().activeCampaignId
        if (prev !== id) set({ activeCampaignId: id })
      },

      fetchCampaigns: async () => {
        const state = get()
        if (state._campaignsFetched && state.campaigns.length > 0) return
        try {
          const r = await fetch('/api/campaigns')
          if (!r.ok) return
          const contentType = r.headers.get('content-type') ?? ''
          if (!contentType.includes('application/json')) return
          const d = await r.json()
          const camps: Campaign[] = d.campaigns ?? []
          set({
            campaigns: camps,
            _campaignsFetched: true,
            activeCampaignId: get().activeCampaignId || (camps.length > 0 ? camps[0].id : ''),
          })
        } catch (e) {
          console.error('Failed to fetch campaigns in store', e)
        }
      },
    }),
    {
      name: 'sov-campaigns',  // localStorage key
      partialize: (state) => ({
        // Only persist these fields — don't persist _campaignsFetched
        // (it should re-fetch if campaigns are empty)
        campaigns: state.campaigns,
        activeCampaignId: state.activeCampaignId,
      }),
    }
  )
)
```

### Change 2 — Handle localStorage unavailability
Add a try/catch for SSR / private browsing:

```typescript
persist(
  (set, get) => ({...}),
  {
    name: 'sov-campaigns',
    storage: typeof window !== 'undefined' 
      ? window.localStorage 
      : undefined,  // Server: no storage, will fetch fresh
    skipHydration: true,  // Don't hydrate on server
  }
)
```

## Drawbacks
1. **Stale campaign data** — If a campaign is added/deleted in another tab, the cached list is stale until the cache expires or the user refreshes. Mitigation: set a `storageVersion` that can be bumped to force a refresh, or add an "auto-refresh after 5 minutes" check.
2. **localStorage limits** — Campaign list is small (< 10KB), well within the 5MB limit. No concern.
3. **Security** — No sensitive data is stored (campaign IDs are already in the URL). Not a concern.
4. **Zustand v5 API** — The `persist` middleware API changed in Zustand v5. Verify the exact version in `package.json` (`^5.0.14`). The v5 API is: `create<Store>()(persist((set, get) => ({}), { name: '...' }))`.

## Additional improvement: Hydration guard
Add a `useEffect` in the page to re-validate the cached campaign list on mount (without blocking the UI):

```typescript
// In page.tsx (after persist is added)
useEffect(() => {
  // Background re-validation — fires after render, doesn't block
  fetchCampaigns()
}, [])  // Only on mount, not on every navigation
```

## Effort
- Add persist middleware: 15 minutes
- Add hydration guard: 10 minutes
- Test navigation flow: 30 minutes
- **Total: ~1 hour**

## Verification
- Navigate to `/brands` → back to `/`
- Network tab shows NO campaign fetch or dashboard query re-fetch
- Campaign selector shows previously selected campaign immediately
- Clear localStorage → next navigation re-fetches normally
