# P5: Scale & Reliability (Items 26-30)

## P5-26: Auto-Scaling Worker Pool

### Problem
Currently, workers run with fixed concurrency (scrape=2, others=1). During keyword bursts (e.g., adding 50 keywords at once), the queue backs up while workers are idle during off-peak hours.

### Implementation
Use BullMQ's `SandboxedProcessor` with Kubernetes Horizontal Pod Autoscaler:

```yaml
# k8s/worker-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sov-workers
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: External
      external:
        metric:
          name: bullmq_queue_depth
          selector:
            matchLabels:
              queue: keyword-scrape
        target:
          type: AverageValue
          averageValue: 10
```

Alternatively, use **BullMQ's built-in rate limiting + concurrency** with a single worker process:

```typescript
// worker-startup.ts — dynamic concurrency
import { getJobCounts } from '@/lib/queue'

setInterval(async () => {
  const counts = await getJobCounts('KEYWORD_SCRAPE')
  const waiting = counts.waiting + counts.prioritized
  
  // Scale concurrency based on queue depth
  const concurrency = waiting > 20 ? 5 : waiting > 10 ? 3 : 2
  scrapeWorker.concurrency = concurrency
}, 60000)
```

### Effort
- BullMQ dynamic concurrency: half-day
- K8s HPA setup: 1-2 days (if using Kubernetes)

---

## P5-27: Database Read Replicas

### Problem
The dashboard runs 20+ parallel queries per page load. On a single Supabase instance, this creates contention:
- Dashboard queries compete with write-heavy scrape jobs
- Materialized view refreshes lock tables
- No separation between OLTP (scraping) and OLAP (dashboard) workloads

### Implementation
Supabase offers **read replicas** (Pro plan +):

```typescript
// src/lib/supabase.ts — split read/write clients
export const supabaseWrite = createClient(url, serviceRoleKey, {
  db: { schema: 'public' },
})

export const supabaseRead = createClient(url, serviceRoleKey, {
  db: { 
    schema: 'public',
    // Supabase Pro replica connection string
    connection: process.env.SUPABASE_READ_REPLICA_URL,
  },
})
```

Route dashboard queries to `supabaseRead`, scrape/write queries to `supabaseWrite`.

### Cost
Supabase Pro: $25/month. Read replicas: $10-50/month per replica (varies by region/size).

### Effort: 1 day (configuration + wiring)

---

## P5-28: Rate Limit Dashboard API

### Problem
A single user refreshing 10 times in 2 seconds currently hits the API 20 times (2 endpoints × 10). With `maxDuration: 60` per function, a burst could exhaust Vercel's concurrent function limit (100 on Pro).

### Implementation
Upstash Ratelimit is already installed (`@upstash/ratelimit`):

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/cache'

// 10 requests per 10 seconds per IP
const dashboardLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  prefix: 'ratelimit:dashboard',
})

// In API route:
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { success, limit, remaining } = await dashboardLimiter.limit(ip)
  
  if (!success) {
    return NextResponse.json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((limit - remaining) / 10) 
    }, { 
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(...)) }
    })
  }
  // ... normal handler
}
```

### Rate Limit Tiers
| Endpoint | Limit | Window |
|---|---|---|
| `/api/dashboard*` | 10 req | 10s |
| `/api/brands*` | 30 req | 10s |
| `/api/keywords*` | 30 req | 10s |
| `/api/scrape` | 5 req | 60s |
| `/api/cron*` | No limit | — |

### Drawbacks
- Adds Redis call per request (~1ms)
- IP-based rate limiting is unreliable behind proxies (use `x-forwarded-for`)
- Rate limiting cron jobs would break them — must skip for cron routes

### Effort: 2-3 hours

---

## P5-29: Backup & Disaster Recovery

### Problem
No automated backup strategy. If the Supabase database is accidentally dropped or corrupted, all keyword, video, and SOV data is lost.

### Implementation
```bash
# scripts/backup.sh (cron job on external server)
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL --no-owner --no-acl \
  --exclude-table=view_snapshots \  # Exclude large daily snapshots
  > /backups/sov_$TIMESTAMP.sql

# Compress and upload to S3
gzip /backups/sov_$TIMESTAMP.sql
aws s3 cp /backups/sov_$TIMESTAMP.sql.gz s3://sov-backups/daily/

# Retention: keep daily for 30 days, monthly for 12 months
```

### Recovery playbook
1. **Database corruption**: Restore from last backup to new Supabase project → update connection string → re-run daily view cron
2. **Accidental table drop**: Restore specific table from backup to existing database
3. **Full disaster**: Spin up new Supabase project → restore full backup → re-deploy Vercel → update env vars

### What to backup
| Data | Frequency | Retention |
|---|---|---|
| Full DB (excl view_snapshots) | Daily | 30 days |
| view_snapshots (aggregated) | Weekly | 90 days |
| Schema only | On every migration | Forever |

### Drawbacks
- `pg_dump` on large databases (>10GB) takes minutes and may impact performance
- Restoring to a different Supabase region may have data residency issues
- No automated restore testing (the backup is useless if you've never restored it)

### Effort: Half-day (script + cron + S3 config)

---

## P5-30: SLA Monitoring

### Problem
No visibility into whether the dashboard is actually working for users. The first indication of a problem is usually a user complaint.

### Implementation
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    youtube_quota: await checkYouTubeQuota(),
    workers: await checkWorkerHealth(),
    lastCronRun: await getLastCronRun('daily_views'),
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}
```

### Synthetic monitoring
```yaml
# External monitoring config (e.g., Checkly, Better Uptime)
checks:
  - name: "Dashboard API"
    url: "https://sov-dashboard.vercel.app/api/health"
    interval: 60s
    assertions:
      - statusCode == 200
      - jsonPath: "$.status"
        equals: "healthy"
  
  - name: "Dashboard Page Load"
    url: "https://sov-dashboard.vercel.app/"
    interval: 300s
    assertions:
      - statusCode == 200
      - textBody contains "Keywords Tracked"

  - name: "Cron: Daily Views"
    url: "https://sov-dashboard.vercel.app/api/health/cron"
    interval: 3600s
    assertions:
      - jsonPath: "$.checks.lastCronRun.hoursAgo"
        lessThan: 25  # Should have run within the last 25 hours
```

### Alerts
| Condition | Alert Channel | Severity |
|---|---|---|
| Health check fails 3x | Email + Slack | Critical |
| P95 latency > 2s | Email | Warning |
| No cron run in 25h | Email + Slack | Critical |
| YouTube quota < 10% | Email | Warning |
| Worker queue depth > 50 | Slack | Info |

### Cost
- Checkly: $10-30/month (synthetic monitoring)
- Better Stack: Free tier includes 10 uptime monitors

### Effort: 1 day
