import { queryAll } from './supabase'

// GPT-4o-mini pricing (OpenRouter, as of 2026)
const MODEL_PRICING: Record<string, { input: number; output: number; cached: number }> = {
  'openai/gpt-4o-mini': {
    input: 0.15 / 1_000_000,    // $0.15 per 1M tokens
    output: 0.60 / 1_000_000,   // $0.60 per 1M tokens
    cached: 0.075 / 1_000_000,  // $0.075 per 1M tokens
  },
  'openai/gpt-4o': {
    input: 2.50 / 1_000_000,
    output: 10.00 / 1_000_000,
    cached: 1.25 / 1_000_000,
  },
}

export interface LlmUsageLog {
  videoId?: string
  campaignId?: string
  callType: 'brand_analysis' | 'irrelevance_detection' | 'metadata_analysis'
  model: string
  provider?: string
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  latencyMs: number
  transcriptLength?: number
  candidateCount?: number
  brandsDetected?: number
  success: boolean
  errorMessage?: string
}

export interface LlmUsageSummary {
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCachedTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  successRate: number
  byModel: Record<string, {
    calls: number
    tokens: number
    cost: number
  }>
  byCallType: Record<string, {
    calls: number
    tokens: number
    cost: number
  }>
}

export interface CampaignCostSummary {
  campaignId: string
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  firstCall: string
  lastCall: string
}

export interface VideoCostDetail {
  videoId: string
  campaignId: string | null
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  callCount: number
  avgLatencyMs: number
}

/**
 * Calculate cost in USD for an LLM call based on model and token counts.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  const nonCachedInput = Math.max(0, inputTokens - cachedTokens)
  return (nonCachedInput * pricing.input) +
         (outputTokens * pricing.output) +
         (cachedTokens * pricing.cached)
}

/**
 * Log an LLM API call to the database.
 * Call this after every OpenRouter/OpenAI API call.
 */
export async function logLlmUsage(log: LlmUsageLog): Promise<void> {
  try {
    const cost = calculateCost(
      log.model,
      log.inputTokens,
      log.outputTokens,
      log.cachedTokens || 0
    )

    await queryAll(
      `INSERT INTO llm_usage (
        video_id, campaign_id, call_type, model, provider,
        input_tokens, output_tokens, cached_tokens, total_tokens,
        cost_usd, latency_ms,
        transcript_length, candidate_count, brands_detected,
        success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        log.videoId || null,
        log.campaignId || null,
        log.callType,
        log.model,
        log.provider || 'openrouter',
        log.inputTokens,
        log.outputTokens,
        log.cachedTokens || 0,
        log.inputTokens + log.outputTokens,
        cost,
        log.latencyMs,
        log.transcriptLength || 0,
        log.candidateCount || 0,
        log.brandsDetected || 0,
        log.success,
        log.errorMessage || null,
      ]
    )
  } catch (err) {
    // Never crash the main flow for usage logging failures
    console.error('Failed to log LLM usage:', err)
  }
}

/**
 * Get usage summary for a campaign or globally.
 * Similar to getQuotaStatus() for YouTube API keys.
 */
export async function getLlmUsageSummary(
  campaignId?: string,
  startDate?: string,
  endDate?: string
): Promise<LlmUsageSummary> {
  let whereClause = '1=1'
  const params: any[] = []
  let paramIdx = 1

  if (campaignId) {
    whereClause += ` AND campaign_id = $${paramIdx++}`
    params.push(campaignId)
  }
  if (startDate) {
    whereClause += ` AND created_at >= $${paramIdx++}`
    params.push(startDate)
  }
  if (endDate) {
    whereClause += ` AND created_at <= $${paramIdx++}`
    params.push(endDate)
  }

  const rows = await queryAll<any>(
    `SELECT
       COUNT(*) as total_calls,
       COALESCE(SUM(input_tokens), 0) as total_input_tokens,
       COALESCE(SUM(output_tokens), 0) as total_output_tokens,
       COALESCE(SUM(cached_tokens), 0) as total_cached_tokens,
       COALESCE(SUM(cost_usd), 0) as total_cost_usd,
       COALESCE(AVG(latency_ms), 0) as avg_latency_ms,
       SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count
     FROM llm_usage
     WHERE ${whereClause}`,
    params
  )

  const row = rows?.[0] || {
    total_calls: 0, total_input_tokens: 0, total_output_tokens: 0,
    total_cached_tokens: 0, total_cost_usd: 0, avg_latency_ms: 0, success_count: 0,
  }

  // Breakdown by model
  const modelRows = await queryAll<any>(
    `SELECT model, COUNT(*) as calls, SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost
     FROM llm_usage WHERE ${whereClause} GROUP BY model`,
    params
  )

  const byModel: Record<string, { calls: number; tokens: number; cost: number }> = {}
  for (const m of modelRows || []) {
    byModel[m.model] = { calls: m.calls, tokens: m.tokens, cost: m.cost }
  }

  // Breakdown by call type
  const typeRows = await queryAll<any>(
    `SELECT call_type, COUNT(*) as calls, SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost
     FROM llm_usage WHERE ${whereClause} GROUP BY call_type`,
    params
  )

  const byCallType: Record<string, { calls: number; tokens: number; cost: number }> = {}
  for (const t of typeRows || []) {
    byCallType[t.call_type] = { calls: t.calls, tokens: t.tokens, cost: t.cost }
  }

  return {
    totalCalls: row.total_calls,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    totalCachedTokens: row.total_cached_tokens,
    totalCostUsd: row.total_cost_usd,
    avgLatencyMs: Math.round(row.avg_latency_ms),
    successRate: row.total_calls > 0 ? Math.round((row.success_count / row.total_calls) * 100) : 0,
    byModel,
    byCallType,
  }
}

/**
 * Get cost breakdown per campaign.
 * Returns array of campaign cost summaries.
 */
export async function getCampaignCostSummaries(): Promise<CampaignCostSummary[]> {
  const rows = await queryAll<any>(
    `SELECT
       campaign_id,
       COUNT(*) as total_calls,
       SUM(input_tokens) as total_input_tokens,
       SUM(output_tokens) as total_output_tokens,
       SUM(cost_usd) as total_cost_usd,
       AVG(latency_ms) as avg_latency_ms,
       MIN(created_at) as first_call,
       MAX(created_at) as last_call
     FROM llm_usage
     WHERE campaign_id IS NOT NULL
     GROUP BY campaign_id
     ORDER BY total_cost_usd DESC`
  )

  return (rows || []).map(r => ({
    campaignId: r.campaign_id,
    totalCalls: r.total_calls,
    totalInputTokens: r.total_input_tokens,
    totalOutputTokens: r.total_output_tokens,
    totalCostUsd: r.total_cost_usd,
    avgLatencyMs: Math.round(r.avg_latency_ms),
    firstCall: r.first_call,
    lastCall: r.last_call,
  }))
}

/**
 * Get cost per video for a campaign.
 * Returns top N most expensive videos to analyze.
 */
export async function getVideoCostDetails(
  campaignId: string,
  limit: number = 20
): Promise<VideoCostDetail[]> {
  const rows = await queryAll<any>(
    `SELECT
       video_id,
       campaign_id,
       SUM(cost_usd) as total_cost_usd,
       SUM(input_tokens) as total_input_tokens,
       SUM(output_tokens) as total_output_tokens,
       COUNT(*) as call_count,
       AVG(latency_ms) as avg_latency_ms
     FROM llm_usage
     WHERE campaign_id = $1
     GROUP BY video_id, campaign_id
     ORDER BY total_cost_usd DESC
     LIMIT $2`,
    [campaignId, limit]
  )

  return (rows || []).map(r => ({
    videoId: r.video_id,
    campaignId: r.campaign_id,
    totalCostUsd: r.total_cost_usd,
    totalInputTokens: r.total_input_tokens,
    totalOutputTokens: r.total_output_tokens,
    callCount: r.call_count,
    avgLatencyMs: Math.round(r.avg_latency_ms),
  }))
}

/**
 * Get daily cost trend for a campaign or globally.
 */
export async function getDailyCostTrend(
  campaignId?: string,
  days: number = 30
): Promise<Array<{
  date: string
  calls: number
  costUsd: number
  inputTokens: number
  outputTokens: number
  avgLatencyMs: number
}>> {
  let whereClause = `created_at >= NOW() - INTERVAL '${days} days'`
  const params: any[] = []

  if (campaignId) {
    whereClause += ' AND campaign_id = $1'
    params.push(campaignId)
  }

  const rows = await queryAll<any>(
    `SELECT
       DATE(created_at) as usage_date,
       COUNT(*) as calls,
       SUM(cost_usd) as cost_usd,
       SUM(input_tokens) as input_tokens,
       SUM(output_tokens) as output_tokens,
       AVG(latency_ms) as avg_latency_ms
     FROM llm_usage
     WHERE ${whereClause}
     GROUP BY DATE(created_at)
     ORDER BY usage_date DESC`,
    params
  )

  return (rows || []).map(r => ({
    date: r.usage_date,
    calls: r.calls,
    costUsd: r.cost_usd,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    avgLatencyMs: Math.round(r.avg_latency_ms),
  }))
}

/**
 * Estimate cost for analyzing N videos.
 * Uses average token counts from historical data.
 */
export async function estimateAnalysisCost(
  videoCount: number,
  campaignId?: string
): Promise<{
  estimatedCostUsd: number
  avgCostPerVideo: number
  avgInputTokens: number
  avgOutputTokens: number
  basedOnSamples: number
}> {
  let whereClause = "call_type = 'brand_analysis' AND success = TRUE"
  const params: any[] = []

  if (campaignId) {
    whereClause += ' AND campaign_id = $1'
    params.push(campaignId)
  }

  const rows = await queryAll<any>(
    `SELECT
       AVG(input_tokens) as avg_input,
       AVG(output_tokens) as avg_output,
       AVG(cost_usd) as avg_cost,
       COUNT(*) as sample_count
     FROM llm_usage
     WHERE ${whereClause}`,
    params
  )

  const row = rows?.[0] || { avg_input: 1500, avg_output: 500, avg_cost: 0.0006, sample_count: 0 }

  return {
    estimatedCostUsd: row.avg_cost * videoCount,
    avgCostPerVideo: row.avg_cost,
    avgInputTokens: Math.round(row.avg_input),
    avgOutputTokens: Math.round(row.avg_output),
    basedOnSamples: row.sample_count,
  }
}

/**
 * Refresh the materialized summary view.
 * Call periodically (e.g., daily cron).
 */
export async function refreshSummaryView(): Promise<void> {
  try {
    await queryAll(`SELECT refresh_llm_usage_summary()`)
  } catch (err) {
    console.error('Failed to refresh LLM usage summary:', err)
  }
}

/**
 * Generate a full usage report (similar to exportQuotaReport).
 */
export async function exportLlmUsageReport(campaignId?: string): Promise<string> {
  const summary = await getLlmUsageSummary(campaignId)
  const campaigns = campaignId ? [] : await getCampaignCostSummaries()
  const trend = await getDailyCostTrend(campaignId, 30)

  const report = {
    generated_at: new Date().toISOString(),
    campaign_filter: campaignId || 'all',
    summary: {
      total_calls: summary.totalCalls,
      total_input_tokens: summary.totalInputTokens,
      total_output_tokens: summary.totalOutputTokens,
      total_cached_tokens: summary.totalCachedTokens,
      total_cost_usd: summary.totalCostUsd,
      avg_latency_ms: summary.avgLatencyMs,
      success_rate: summary.successRate,
    },
    by_model: summary.byModel,
    by_call_type: summary.byCallType,
    campaign_breakdown: campaigns,
    daily_trend: trend.slice(0, 14), // Last 14 days
    recommendations: generateLlmRecommendations(summary, campaigns),
  }

  return JSON.stringify(report, null, 2)
}

function generateLlmRecommendations(
  summary: LlmUsageSummary,
  campaigns: CampaignCostSummary[]
): string[] {
  const recommendations: string[] = []

  if (summary.totalCalls > 0 && summary.successRate < 95) {
    recommendations.push(`Success rate is ${summary.successRate}% — investigate error logs for failing LLM calls`)
  }

  if (summary.avgLatencyMs > 5000) {
    recommendations.push('Average latency exceeds 5s — consider switching to a faster provider or model')
  }

  const cachedRatio = summary.totalInputTokens > 0
    ? summary.totalCachedTokens / summary.totalInputTokens
    : 0
  if (cachedRatio < 0.2 && summary.totalCalls > 100) {
    recommendations.push('Low cache hit ratio — enable prompt caching on OpenRouter for 50% input cost savings')
  }

  if (summary.totalCostUsd > 10) {
    recommendations.push('Monthly LLM cost exceeds $10 — review if classification-only mode could reduce token usage')
  }

  if (campaigns.length > 5) {
    const expensive = campaigns.filter(c => c.totalCostUsd > 1)
    if (expensive.length > 0) {
      recommendations.push(`${expensive.length} campaigns cost >$1 each — review if all videos need LLM analysis or if matching-only suffices`)
    }
  }

  return recommendations
}
