# P2-10: Error Monitoring (Sentry)

## Current Problem
Errors are handled with `console.error()` and generic `try/catch` returning `{ error: message }`. No one knows when:
- The daily view refresh cron job fails at 3 AM
- A YouTube API key exhausts its quota mid-scrape
- A user encounters a 500 error on their dashboard

## Implementation

### Phase 1 — Add Sentry to API Routes
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% of transactions for performance monitoring
  environment: process.env.NODE_ENV,
})

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context })
}
```

### Phase 2 — Wrap API route handlers
```typescript
// src/lib/api-utils.ts
import { captureError } from './sentry'

export async function handleApiRoute<T>(
  handler: () => Promise<NextResponse<T>>,
  context: { route: string; method: string }
): Promise<NextResponse<T | { error: string }>> {
  try {
    return await handler()
  } catch (e) {
    captureError(e, { route: context.route, method: context.method })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Usage in any route:
export async function GET(req: NextRequest) {
  return handleApiRoute(async () => {
    // ... route logic
  }, { route: 'dashboard', method: 'GET' })
}
```

### Phase 3 — Add Sentry to workers
```typescript
// worker.ts — inside job processors
import { captureError } from '@/lib/sentry'

const worker = new Worker('KEYWORD_SCRAPE', async (job) => {
  try {
    await scrapeKeyword(job.data.keywordId)
  } catch (e) {
    captureError(e, { jobId: job.id, keywordId: job.data.keywordId })
    throw e  // Let BullMQ handle retry
  }
})
```

### Phase 4 — Add Sentry to browser
```typescript
// layout.tsx or Providers.tsx
import * as Sentry from '@sentry/nextjs'

// In the root layout:
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [Sentry.replayIntegration()],  // Session replays for UX issues
})
```

## Files Changed
| File | Change |
|---|---|
| `src/lib/sentry.ts` | New — Sentry initialization |
| `src/lib/api-utils.ts` | New or extended — error wrapper |
| `src/lib/worker.ts` | Add Sentry error capture |
| `src/app/layout.tsx` | Add Sentry browser init (optional) |
| `sentry.client.config.ts` | New (auto-created by @sentry/nextjs) |
| `sentry.server.config.ts` | New |

## Drawbacks
1. **Cost** — Sentry's free tier (5K events/month) may be tight for a dashboard with cron jobs firing daily. Each worker error per video = potentially 500+ events in one run. Mitigation: sample errors at 0.1 rate, or filter out known non-errors.
2. **Performance overhead** — Sentry's browser instrumentation adds ~30KB to the JS bundle. Performance monitoring adds a small overhead per request. Mitigation: only enable in production, use 0.1 trace sample rate.
3. **False alarms** — YouTube quota exhaustion is a normal operational state, not an error. If captured as an error, it will trigger alerts every day. Must be explicit about what's an error vs. expected operational state. Mitigation: don't `captureError` for quota errors; log them as warnings.
4. **Sentry + Next.js setup** — The `@sentry/nextjs` package wraps your build process. It adds build time and can cause deployment issues if misconfigured. Follow the official wizard.

## Effort
- Install + configure Sentry: 1 hour
- Wrap API routes: 1-2 hours
- Add to workers: 30 min
- Browser setup: 30 min
- **Total: ~3-4 hours**

## Verification
- Trigger a deliberate error (e.g., invalid campaign_id)
- Check Sentry dashboard — error should appear with stack trace + request context
- Cron job failure → appears in Sentry within 1 minute
