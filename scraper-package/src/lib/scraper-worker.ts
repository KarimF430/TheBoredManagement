/**
 * Scraper Worker — Spawns Python instaloader subprocess
 *
 * - Multi-cookie rotation with health tracking
 * - Dynamic rate limiting with exponential backoff
 * - Session warming on startup
 * - Checkpoint saved after every profile
 * - Resume on restart
 */

import { getCPClient } from '@/lib/cp-db'
import { spawn } from 'child_process'
import path from 'path'
import { scoreCreator, classifyTier } from '@/lib/discovery'

// ── Types ──────────────────────────────────────────────────────────

export interface ScrapeJob {
  id: string
  seed_handle: string
  depth: number
  max_profiles: number
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress: number
  profiles_found: number
  profiles_passed: number
  profiles_failed: number
  profiles_filtered: number
  error_message: string | null
  checkpoint: Record<string, unknown> | null
  can_resume: boolean
  started_at: string | null
  paused_at: string | null
  completed_at: string | null
  created_at: string
}

export interface WorkerInfo {
  worker_id: string
  job_id: string | null
  status: 'idle' | 'running' | 'paused' | 'error'
  current_handle: string | null
  profiles_scraped: number
  profiles_passed: number
  profiles_failed: number
  started_at: string | null
  last_activity_at: string | null
}

// ── Active Workers ─────────────────────────────────────────────────

const activeWorkers = new Map<string, { process: any; job: ScrapeJob | null }>()

// ── Get All Active Cookies ──────────────────────────────────────────

async function getActiveCookies(): Promise<Array<{ id: string; session_id: string; ds_user_id: string; csrftoken: string | null; username?: string | null; password?: string | null }>> {
  try {
    const client = getCPClient()
    const { data } = await client
      .from('cp_session_cookies')
      .select('id, session_id, ds_user_id, csrftoken, username, password')
      .eq('status', 'active')
      .order('last_used_at', { ascending: true, nullsFirst: true })
    
    return data || []
  } catch { return [] }
}

// ── Handle Cookie Events from Python ───────────────────────────────

async function handleCookieEvent(event: { type: string; cookie_id: string; detail?: string }) {
  const client = getCPClient()
  const now = new Date().toISOString()
  
  if (event.type === 'expired' && event.cookie_id) {
    await client.from('cp_session_cookies').update({
      status: 'expired',
      last_error_at: now,
      consecutive_errors: { $inc: 1 } as any,
      updated_at: now,
    }).eq('id', event.cookie_id)
  } else if (event.type === 'activated' && event.cookie_id) {
    // Try to find by id, or by matching session_id
    await client.from('cp_session_cookies').update({
      last_used_at: now,
      last_success_at: now,
      consecutive_errors: 0,
      updated_at: now,
    }).eq('id', event.cookie_id)
  } else if (event.type === 'failed' && event.cookie_id) {
    await client.from('cp_session_cookies').update({
      last_error_at: now,
      consecutive_errors: { $inc: 1 } as any,
      updated_at: now,
    }).eq('id', event.cookie_id)
  }
}

// ── Start Worker ───────────────────────────────────────────────────

export async function startWorker(jobId: string, workerId?: string): Promise<{ worker_id: string; message: string }> {
  const wid = workerId || `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  if (activeWorkers.has(wid)) {
    return { worker_id: wid, message: 'Worker already running' }
  }
  
  const client = getCPClient()
  const { data: job, error } = await client
    .from('cp_scrape_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error || !job) return { worker_id: wid, message: 'Job not found' }
  if (job.status === 'completed' || job.status === 'cancelled') return { worker_id: wid, message: 'Job already finished' }
  
  // Get all active cookies
  const cookies = await getActiveCookies()
  if (cookies.length === 0) return { worker_id: wid, message: 'No active session cookies. Add cookies in the Cookies tab.' }
  
  // Update job status
  await client.from('cp_scrape_jobs').update({
    status: 'running',
    started_at: job.started_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)
  
  // Build Python command
  const scriptPath = path.join(process.cwd(), 'scraper_worker.py')
  const args = [
    scriptPath,
    '--seed', job.seed_handle,
    '--depth', String(job.depth || 2),
    '--max-profiles', String(job.max_profiles || 5000),
    '--username', cookies[0].username || 'auto_beast97',
  ]
  
  // Login mode: use password if available
  if (cookies[0].password) {
    args.push('--password', cookies[0].password)
  } else {
    // Cookie mode: pass cookies JSON
    const cookieJson = JSON.stringify(cookies.map(c => ({
      id: c.id,
      session_id: c.session_id,
      ds_user_id: c.ds_user_id,
      csrftoken: c.csrftoken || '',
    })))
    args.push('--cookies', cookieJson)
  }
  
  if (job.checkpoint) {
    args.push('--checkpoint', JSON.stringify(job.checkpoint))
  }
  
  // Spawn Python process
  const proc = spawn('python', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  
  activeWorkers.set(wid, { process: proc, job })
  
  // Handle stdout (final JSON output)
  let stdoutData = ''
  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutData += chunk.toString()
  })
  
  // Handle stderr (progress, checkpoints, cookie events)
  proc.stderr?.on('data', (chunk: Buffer) => {
    const lines = chunk.toString().split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        if (line.startsWith('CHECKPOINT:')) {
          const cp = JSON.parse(line.replace('CHECKPOINT:', ''))
          client.from('cp_scrape_jobs').update({
            checkpoint: cp,
            progress: Math.round(((cp.profiles_count + cp.errors_count) / (job.max_profiles || 5000)) * 100),
            profiles_found: cp.profiles_count,
            profiles_failed: cp.errors_count,
            last_checkpoint_at: new Date().toISOString(),
            can_resume: true,
            updated_at: new Date().toISOString(),
          }).eq('id', jobId)
        } else if (line.startsWith('COOKIE_EVENT:')) {
          const event = JSON.parse(line.replace('COOKIE_EVENT:', ''))
          handleCookieEvent(event)
        }
      } catch {
        // Ignore parse errors from malformed lines
      }
    }
  })
  
  // Handle process exit
  proc.on('close', async (code: number) => {
    try {
      const result = JSON.parse(stdoutData)
      
      // Check for session error
      if (result.session_error) {
        await client.from('cp_scrape_jobs').update({
          status: 'failed',
          error_message: result.session_error,
          can_resume: true,
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        activeWorkers.set(wid, { process: null, job: null })
        return
      }
      
      // Save profiles to DB
      let profilesPassed = 0
      let profilesFiltered = 0
      
      for (const profile of result.profiles || []) {
        const { data: raw } = await client.from('cp_raw_creators').upsert({
          handle: profile.handle,
          full_name: profile.full_name,
          bio: profile.bio,
          profile_pic_url: profile.profile_pic_url,
          is_verified: profile.is_verified,
          is_private: profile.is_private,
          is_business: profile.is_business,
          followers: profile.followers,
          following: profile.following,
          posts_count: profile.posts_count,
          avg_views: profile.avg_views,
          avg_likes: profile.avg_likes,
          avg_comments: profile.avg_comments,
          engagement_rate: profile.engagement_rate,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          category: profile.category,
          source: 'scraper',
          source_job_id: job.id,
          status: 'raw',
        }, { onConflict: 'handle' }).select().single()
        
        if (raw) {
          const scored = scoreCreator({
            name: profile.full_name || profile.handle,
            subscribers: profile.followers,
            avg_views: profile.avg_views,
            avg_likes: profile.avg_likes,
            avg_comments: profile.avg_comments,
            avg_engagement: profile.engagement_rate,
          })
          const viewsToFollowersRatio = profile.followers > 0 ? (profile.avg_views / profile.followers) : 0
          const passedReach = viewsToFollowersRatio >= 0.4

          if (scored.passed && passedReach) {
            await client.from('cp_filtered_creators').upsert({
              raw_creator_id: raw.id,
              handle: profile.handle,
              full_name: profile.full_name,
              bio: profile.bio,
              profile_pic_url: profile.profile_pic_url,
              is_verified: profile.is_verified,
              email: profile.email,
              phone: profile.phone,
              website: profile.website,
              followers: profile.followers,
              following: profile.following,
              posts_count: profile.posts_count,
              avg_views: profile.avg_views,
              avg_likes: profile.avg_likes,
              avg_comments: profile.avg_comments,
              engagement_rate: profile.engagement_rate,
              views_to_followers_ratio: scored.views_to_followers_ratio,
              category: profile.category,
              tier: classifyTier(profile.followers),
              score_breakdown: scored,
              score_passed: true,
            }, { onConflict: 'handle' })
            
            profilesFiltered++
          }
          
          profilesPassed++
        }
      }
      
      // Save errors
      for (const err of result.errors || []) {
        await client.from('cp_scrape_errors').insert({
          job_id: job.id,
          handle: err.handle,
          error_type: err.error_type,
          error_message: err.error,
        })
      }
      
      // Update job as completed
      await client.from('cp_scrape_jobs').update({
        status: 'completed',
        progress: 100,
        profiles_found: result.total_found || 0,
        profiles_passed: profilesPassed,
        profiles_failed: result.total_errors || 0,
        profiles_filtered: profilesFiltered,
        can_resume: false,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)
    } catch (err) {
      await client.from('cp_scrape_jobs').update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        can_resume: true,
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)
    }
    
    activeWorkers.set(wid, { process: null, job: null })
  })
  
  proc.on('error', async (err: Error) => {
    await client.from('cp_scrape_jobs').update({
      status: 'failed',
      error_message: err.message,
      can_resume: true,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)
    
    activeWorkers.set(wid, { process: null, job: null })
  })
  
  return { worker_id: wid, message: 'Worker started' }
}

// ── Pause/Resume/Cancel ────────────────────────────────────────────

export async function pauseWorker(workerId: string): Promise<{ message: string }> {
  const worker = activeWorkers.get(workerId)
  if (!worker) return { message: 'Worker not found' }
  
  worker.process?.kill()
  activeWorkers.set(workerId, { process: null, job: null })
  
  if (worker.job) {
    const client = getCPClient()
    await client.from('cp_scrape_jobs').update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      can_resume: true,
      updated_at: new Date().toISOString(),
    }).eq('id', worker.job.id)
  }
  
  return { message: 'Worker paused' }
}

export async function resumeWorker(workerId: string): Promise<{ message: string }> {
  const worker = activeWorkers.get(workerId)
  if (!worker || !worker.job) return { message: 'Worker not found' }
  
  return startWorker(worker.job.id, workerId)
}

export async function cancelWorker(workerId: string): Promise<{ message: string }> {
  const worker = activeWorkers.get(workerId)
  if (!worker) return { message: 'Worker not found' }
  
  worker.process?.kill()
  activeWorkers.set(workerId, { process: null, job: null })
  
  if (worker.job) {
    const client = getCPClient()
    await client.from('cp_scrape_jobs').update({
      status: 'cancelled',
      can_resume: false,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', worker.job.id)
  }
  
  return { message: 'Worker cancelled' }
}

// ── Status ─────────────────────────────────────────────────────────

export function getWorkerStatus(workerId: string): WorkerInfo | null {
  const worker = activeWorkers.get(workerId)
  if (!worker) return null
  
  return {
    worker_id: workerId,
    job_id: worker.job?.id || null,
    status: worker.process ? 'running' : 'paused',
    current_handle: null,
    profiles_scraped: worker.job?.profiles_found || 0,
    profiles_passed: worker.job?.profiles_passed || 0,
    profiles_failed: worker.job?.profiles_failed || 0,
    started_at: worker.job?.started_at || null,
    last_activity_at: new Date().toISOString(),
  }
}

export function getAllWorkers(): WorkerInfo[] {
  return Array.from(activeWorkers.entries()).map(([id, w]) => ({
    worker_id: id,
    job_id: w.job?.id || null,
    status: w.process ? 'running' : 'paused',
    current_handle: null,
    profiles_scraped: w.job?.profiles_found || 0,
    profiles_passed: w.job?.profiles_passed || 0,
    profiles_failed: w.job?.profiles_failed || 0,
    started_at: w.job?.started_at || null,
    last_activity_at: new Date().toISOString(),
  }))
}

// ── Queue Management ───────────────────────────────────────────────

export async function createScrapeJob(
  seedHandle: string,
  depth: number = 2,
  maxProfiles: number = 5000
): Promise<ScrapeJob | null> {
  const client = getCPClient()
  const { data, error } = await client.from('cp_scrape_jobs').insert({
    seed_handle: seedHandle.replace(/^@/, '').toLowerCase(),
    depth,
    max_profiles: maxProfiles,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single()
  
  return error ? null : data
}

export async function getScrapeJobs(limit: number = 50): Promise<ScrapeJob[]> {
  const client = getCPClient()
  const { data } = await client
    .from('cp_scrape_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return data || []
}

export async function getScrapeJob(jobId: string): Promise<ScrapeJob | null> {
  const client = getCPClient()
  const { data } = await client
    .from('cp_scrape_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  return data || null
}

export async function getJobStats(): Promise<{
  total_jobs: number
  running_jobs: number
  completed_jobs: number
  total_profiles: number
  total_filtered: number
  total_errors: number
}> {
  const client = getCPClient()
  
  const [{ count: totalJobs }, { count: runningJobs }, { count: completedJobs }] = await Promise.all([
    client.from('cp_scrape_jobs').select('*', { count: 'exact', head: true }),
    client.from('cp_scrape_jobs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    client.from('cp_scrape_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ])
  
  const [{ count: totalProfiles }, { count: totalFiltered }, { count: totalErrors }] = await Promise.all([
    client.from('cp_raw_creators').select('*', { count: 'exact', head: true }),
    client.from('cp_filtered_creators').select('*', { count: 'exact', head: true }),
    client.from('cp_scrape_errors').select('*', { count: 'exact', head: true }),
  ])
  
  return {
    total_jobs: totalJobs || 0,
    running_jobs: runningJobs || 0,
    completed_jobs: completedJobs || 0,
    total_profiles: totalProfiles || 0,
    total_filtered: totalFiltered || 0,
    total_errors: totalErrors || 0,
  }
}
