import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import {
  startWorker,
  pauseWorker,
  resumeWorker,
  cancelWorker,
  getWorkerStatus,
  getAllWorkers,
  createScrapeJob,
  getScrapeJobs,
  getScrapeJob,
  getJobStats,
} from '@/lib/scraper-worker'
import { getCircuitStatus, resetCircuit } from '@/lib/scraper'

// Check if scraper tables exist
async function ensureTables() {
  const client = getCPClient()
  try {
    const { error } = await client.from('cp_scrape_jobs').select('id').limit(1)
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      return { exists: false, message: 'Scraper tables not found. Run schema/017_scraper_pipeline.sql then schema/020_scraper_worker.sql in Supabase SQL Editor.' }
    }
    return { exists: true }
  } catch {
    return { exists: false, message: 'Unable to connect to scraper tables.' }
  }
}

// GET /api/scraper — Get stats, jobs, workers, cookies
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    
    if (action === 'status') {
      return NextResponse.json({
        circuit: getCircuitStatus(),
        workers: getAllWorkers(),
        timestamp: new Date().toISOString(),
      })
    }
    
    if (action === 'cookies') {
      const client = getCPClient()
      const { data } = await client.from('cp_session_cookies').select('*').order('created_at', { ascending: false })
      return NextResponse.json({ cookies: data || [] })
    }
    
    if (action === 'cookie-stats') {
      const client = getCPClient()
      const { data } = await client.rpc('cp_get_cookie_stats').single()
      return NextResponse.json({ stats: data || {} })
    }
    
    if (action === 'jobs') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const jobs = await getScrapeJobs(limit)
      return NextResponse.json({ jobs })
    }
    
    if (action === 'job') {
      const jobId = searchParams.get('job_id')
      if (!jobId) return NextResponse.json({ error: 'job_id required' }, { status: 400 })
      const job = await getScrapeJob(jobId)
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      return NextResponse.json({ job })
    }
    
    if (action === 'results') {
      const jobId = searchParams.get('job_id')
      const client = getCPClient()
      let query = client.from('cp_raw_creators').select('*').order('created_at', { ascending: false })
      if (jobId) query = query.eq('source_job_id', jobId)
      const { data } = await query.limit(500)
      return NextResponse.json({ profiles: data || [] })
    }
    
    if (action === 'filtered') {
      const client = getCPClient()
      const { data } = await client.from('cp_filtered_creators').select('*').order('followers', { ascending: false }).limit(500)
      return NextResponse.json({ creators: data || [] })
    }
    
    if (action === 'stats') {
      const stats = await getJobStats()
      return NextResponse.json({ stats })
    }
    
    // Default: return pipeline stats
    const tables = await ensureTables()
    if (!tables.exists) {
      return NextResponse.json({ error: tables.message }, { status: 503 })
    }
    
    const stats = await getJobStats()
    return NextResponse.json({
      stats: {
        ...stats,
        circuit: getCircuitStatus(),
        workers: getAllWorkers(),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/scraper — Start, pause, resume, cancel workers + cookie management
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, job_id, seed_handle, depth, max_profiles, worker_id, mode } = body
    
    // Cookie management
    if (action === 'add_cookie') {
      const { session_id, ds_user_id, csrftoken, label, username, password } = body
      
      const client = getCPClient()
      const { data, error } = await client.from('cp_session_cookies').insert({
        session_id: session_id || '',
        ds_user_id: ds_user_id || '',
        csrftoken: csrftoken || null,
        label: label || `Cookie ${new Date().toLocaleDateString()}`,
        username: username || 'auto_beast97',
        password: password || null,
        status: 'active',
      }).select().single()
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ cookie: data, message: 'Cookie added' })
    }
    
    if (action === 'delete_cookie') {
      const { cookie_id } = body
      if (!cookie_id) return NextResponse.json({ error: 'cookie_id required' }, { status: 400 })
      
      const client = getCPClient()
      await client.from('cp_session_cookies').delete().eq('id', cookie_id)
      return NextResponse.json({ message: 'Cookie deleted' })
    }
    
    if (action === 'toggle_cookie') {
      const { cookie_id, status } = body
      if (!cookie_id || !status) return NextResponse.json({ error: 'cookie_id and status required' }, { status: 400 })
      
      const client = getCPClient()
      const { data } = await client.from('cp_session_cookies').update({ status, updated_at: new Date().toISOString() }).eq('id', cookie_id).select().single()
      return NextResponse.json({ cookie: data })
    }
    
    // Pause worker
    if (action === 'pause') {
      if (!worker_id) return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
      return NextResponse.json(await pauseWorker(worker_id))
    }
    
    // Resume worker
    if (action === 'resume') {
      if (!worker_id) return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
      return NextResponse.json(await resumeWorker(worker_id))
    }
    
    // Cancel worker
    if (action === 'cancel') {
      if (!worker_id) return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
      return NextResponse.json(await cancelWorker(worker_id))
    }
    
    // Start new job
    if (!seed_handle) return NextResponse.json({ error: 'seed_handle required' }, { status: 400 })
    
    const tables = await ensureTables()
    if (!tables.exists) {
      return NextResponse.json({ error: tables.message }, { status: 503 })
    }
    
    const job = await createScrapeJob(seed_handle, depth || 2, max_profiles || 500)
    if (!job) return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    
    // Start worker
    const result = await startWorker(job.id)
    
    return NextResponse.json({
      job,
      worker: result,
      message: 'Scrape job started',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/scraper — Reset circuit breaker
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    
    if (action === 'reset_circuit') {
      resetCircuit()
      return NextResponse.json({ message: 'Circuit breaker reset' })
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
