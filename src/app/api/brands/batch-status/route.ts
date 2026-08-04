import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/brands/batch-status?jobId=batch-xxx-123
 *
 * Returns current status of a batch analysis job.
 * Frontend polls this every 2-3 seconds to update the progress bar.
 *
 * Response:
 * {
 *   "jobId": "batch-xxx-123",
 *   "phase": "processing" | "complete" | "error" | "cancelled",
 *   "total": 1000,
 *   "processed": 450,
 *   "success": 300,
 *   "failed": 5,
 *   "skipped": 145,
 *   "percent": 45,
 *   "elapsed": "2m 15s",
 *   "estimatedRemaining": "2m 45s",
 *   "errors": [...]
 * }
 */

// Import the job tracker from batch-analyze route
// In production, this should be in a shared store (Redis/DB)
// For now, we export from batch-analyze and import here

let getJobStatus: ((jobId: string) => any) | null = null

try {
  // Dynamic import to avoid circular dependencies
  const batchModule = require('../batch-analyze/route')
  getJobStatus = batchModule.getJobStatus
} catch {
  // Job tracking is in-memory — may not be available across cold starts
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Try in-memory job tracker first
    if (getJobStatus) {
      const job = getJobStatus(jobId)
      if (job) {
        return NextResponse.json(formatJobStatus(jobId, job))
      }
    }

    // Fallback: check database for completed analysis
    // Count recently analyzed videos as a proxy
    return NextResponse.json({
      jobId,
      phase: 'unknown',
      message: 'Job status unavailable (serverless cold start). Check database for results.',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function formatJobStatus(jobId: string, job: any) {
  const elapsed = Date.now() - job.startedAt
  const elapsedStr = formatDuration(elapsed)

  let estimatedRemaining = 'calculating...'
  if (job.processed > 0 && job.processed < job.total) {
    const avgTimePerVideo = elapsed / job.processed
    const remaining = avgTimePerVideo * (job.total - job.processed)
    estimatedRemaining = formatDuration(remaining)
  }

  return {
    jobId,
    phase: job.phase,
    total: job.total,
    processed: job.processed,
    success: job.success,
    failed: job.failed,
    skipped: job.skipped,
    percent: Math.round((job.processed / job.total) * 100),
    elapsed: elapsedStr,
    estimatedRemaining: job.phase === 'complete' ? '0s' : estimatedRemaining,
    errors: job.errors.slice(-10), // Last 10 errors only
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}
