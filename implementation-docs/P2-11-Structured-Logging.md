# P2-11: Structured Logging (Pino)

## Current Problem
The codebase uses `console.log`, `console.error`, and bare string logging throughout:
- `console.error('Dashboard API error:', e)` — no structured context, no severity levels
- Workers catch errors and log them but don't include job ID, keyword ID, or timestamps
- No way to filter logs by campaign_id, route, or severity
- No log aggregation — logs are scattered in Vercel's function logs

## Implementation

### Phase 1 — Configure Pino
```typescript
// src/lib/logger.ts
import pino from 'pino'

const isEdge = typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge'

// On Edge Runtime, use a simple JSON logger that avoids Node.js deps
const logger = isEdge
  ? pino({ browser: { asObject: true } })
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,  // Production: JSON for log aggregation
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password'],
        censor: '[REDACTED]',
      },
    })

export function createRouteLogger(route: string, campaignId?: string) {
  return logger.child({ route, campaignId })
}

export function createJobLogger(jobType: string, jobId?: string) {
  return logger.child({ jobType, jobId })
}

export default logger
```

### Phase 2 — Replace console.* in API routes
```typescript
// Before
console.error('Dashboard API error:', e)
return NextResponse.json({ error: msg }, { status: 500 })

// After
const log = createRouteLogger('dashboard/get', cid)
log.error({ err: e, campaignId: cid }, 'Dashboard API error')
return NextResponse.json({ error: msg }, { status: 500 })
```

### Phase 3 — Replace console.* in workers
```typescript
// worker.ts
const log = createJobLogger('keyword-scrape', job.id)
log.info({ keywordId: job.data.keywordId, account: accountUsed }, 'Scrape started')

try {
  await scrapeKeyword(job.data.keywordId)
  log.info('Scrape completed successfully')
} catch (e) {
  log.error({ err: e, keywordId: job.data.keywordId }, 'Scrape failed')
  throw e
}
```

### Phase 4 — Add request context to middleware
```typescript
// middleware.ts
import logger from '@/lib/logger'

export async function middleware(req: NextRequest) {
  const start = Date.now()
  const log = logger.child({
    path: req.nextUrl.pathname,
    method: req.method,
    requestId: crypto.randomUUID(),
  })
  
  const response = await NextResponse.next()
  
  log.info({
    statusCode: response.status,
    duration: Date.now() - start,
  }, 'Request completed')
  
  return response
}
```

## Files Changed
| File | Change |
|---|---|
| `src/lib/logger.ts` | New — Pino configuration |
| All API `route.ts` files | Replace `console.*` with `log.*` |
| `worker.ts` | Add structured job logging |
| `middleware.ts` | Add request logging |
| `package.json` | Add `pino`, `pino-pretty` (dev) |

## Drawbacks
1. **Edge Runtime compatibility** — Pino has a browser build that works on Edge, but `pino-pretty` doesn't. Two configurations needed (Edge vs Node.js). Mitigation: use `browser: { asObject: true }` on Edge, skip pretty printing.
2. **Log volume** — Request-level logging for every API call on a dashboard generates a lot of logs. A single page load may trigger 3-5 API calls. At 10 users × 5 requests × 1KB = 50KB/minute. Manageable but worth monitoring.
3. **Vercel log retention** — Vercel retains logs for 3 days on Pro plan. For long-term retention, ship logs to Axiom/BetterStack/Datadog via Pino transport. This is additional cost and setup.
4. **Performance** — Pino is the fastest JSON logger, but any logging adds ~0.1ms per call. For the dashboard's 20+ parallel queries, this is negligible (< 2ms total).

## Effort
- Pino setup + configuration: 1 hour
- Replace console.* in 15+ route files: 2-3 hours
- Worker logging: 1 hour
- Middleware logging: 30 min
- **Total: ~4-6 hours**

## Verification
- Deploy to staging
- Trigger an API call
- Check Vercel logs — should show structured JSON with route, duration, campaignId
- Trigger a worker job — logs should include jobId, keywordId, duration
