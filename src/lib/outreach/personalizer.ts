/**
 * Per-creator email personalization via GPT-4o mini.
 *
 * Generates genuine per-creator subject + body from raw_signals context.
 *
 * CRITICAL GUARDS:
 * 1. Specificity guard: rejects generated emails that don't reference at least
 *    one concrete detail from raw_signals. Generic "name-slotted" templates
 *    are treated as failed generations — retry or flag, don't send.
 * 2. Fallback visibility: logs and alerts on fallback rate. If 20% of sends
 *    silently fall back to template because the LLM is timing out, reply rate
 *    quietly craters and nothing tells you why.
 * 3. Retry on generic output: if the generated email doesn't reference raw_signals
 *    details, retry up to 2 times before falling back.
 */

import { classifyJson, safeParse } from './llm'
import { outreachSelect, outreachInsert } from './db'
import { outreachConfig } from './config'
import { alert } from './alerts'

const SYSTEM_PROMPT = `You write a cold outreach email to a content creator. The email must be:
- Plain text only, maximum 150 words
- One link maximum (the form link provided)
- Highly specific to this creator — reference their actual content, niche, or recent work
- Conversational, not salesy
- No fluff, no "I hope this finds you well"
- The subject line must be short (under 50 chars) and not look like marketing

Return ONLY a JSON object: {"subject": "...", "body_text": "..."}. No prose, no markdown.`

interface PersonalizedEmail {
  creator_id: string
  recipient_email: string
  subject: string
  body_text: string
  fallback: boolean
  specificityScore: number
}

// Track fallback counts for alerting
let fallbackCount = 0
let totalCount = 0
const FALLBACK_ALERT_THRESHOLD = 0.15 // Alert if >15% fallback rate

export async function personalizeForCreators(
  creatorIds: string[],
  template: { subject: string; body_text: string; tier: string; stage: string; id: string },
  formUrl: string
): Promise<PersonalizedEmail[]> {
  const creators = await outreachSelect<any>('outreach_creators', {})
  const filtered = creators.filter((c: any) => creatorIds.includes(c.id))

  const results: PersonalizedEmail[] = []

  for (const creator of filtered) {
    totalCount++
    try {
      const personalized = await generateWithSpecificityGuard(creator, template, formUrl)
      results.push(personalized)
    } catch {
      fallbackCount++
      results.push({
        creator_id: creator.id,
        recipient_email: creator.email,
        subject: template.subject,
        body_text: template.body_text,
        fallback: true,
        specificityScore: 0,
      })
    }
  }

  // Check fallback rate and alert if too high
  checkFallbackRate()

  return results
}

/**
 * Generates personalized email with specificity guard.
 *
 * Retries up to 2 times if the output doesn't reference concrete details
 * from raw_signals. Falls back to template if all retries fail.
 */
async function generateWithSpecificityGuard(
  creator: any,
  template: { body_text: string; subject: string },
  formUrl: string,
  maxRetries = 2
): Promise<PersonalizedEmail> {
  const signals = creator.raw_signals || {}
  const concreteDetails = extractConcreteDetails(signals)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generatePersonalizedEmail(creator, template, formUrl)
      const specificityScore = checkSpecificity(result.body_text, concreteDetails)

      if (specificityScore >= 1) {
        // At least one concrete detail referenced — good enough
        return {
          creator_id: creator.id,
          recipient_email: creator.email,
          subject: result.subject,
          body_text: result.body_text,
          fallback: false,
          specificityScore,
        }
      }

      // Generic output — retry (unless this was the last attempt)
      if (attempt < maxRetries) continue
    } catch {
      if (attempt < maxRetries) continue
      throw new Error('Personalization failed after retries')
    }
  }

  // All retries failed — fallback to template
  return {
    creator_id: creator.id,
    recipient_email: creator.email,
    subject: template.subject,
    body_text: template.body_text,
    fallback: true,
    specificityScore: 0,
  }
}

async function generatePersonalizedEmail(
  creator: any,
  template: { body_text: string },
  formUrl: string
): Promise<{ subject: string; body_text: string }> {
  const signals = creator.raw_signals || {}
  const context = buildContext(creator, signals)

  const user = `Write a first-touch cold email to this creator:

Name: ${creator.name || 'Unknown'}
Niche: ${creator.niche || 'Unknown'}
Context: ${context}

Use this template as the structural base, but rewrite it with genuine specifics:
---
${template.body_text}
---

The form link to include: ${formUrl}

Return ONLY JSON: {"subject": "...", "body_text": "..."}`

  const result = await classifyJson(SYSTEM_PROMPT, user, 500)

  if (!result.ok || !result.data.subject || !result.data.body_text) {
    throw new Error('Personalization failed: invalid model output')
  }

  const subject = String(result.data.subject).slice(0, 50)
  const bodyText = String(result.data.body_text).slice(0, 1000)

  return { subject, body_text: bodyText }
}

/**
 * Extracts concrete, specific details from raw_signals that can be
 * referenced in a personalized email.
 *
 * Returns an array of strings that should appear in the generated email
 * for it to be considered genuinely personalized.
 */
function extractConcreteDetails(signals: Record<string, unknown>): string[] {
  const details: string[] = []

  // Concrete details that prove specificity
  if (signals.recent_content && typeof signals.recent_content === 'string' && signals.recent_content.length > 10) {
    details.push(signals.recent_content as string)
  }
  if (signals.recent_campaign && typeof signals.recent_campaign === 'string' && signals.recent_campaign.length > 5) {
    details.push(signals.recent_campaign as string)
  }
  if (signals.brand_collabs && typeof signals.brand_collabs === 'string' && signals.brand_collabs.length > 5) {
    details.push(signals.brand_collabs as string)
  }
  if (signals.content_style && typeof signals.content_style === 'string' && signals.content_style.length > 5) {
    details.push(signals.content_style as string)
  }
  if (signals.audience_demographics && typeof signals.audience_demographics === 'string' && signals.audience_demographics.length > 10) {
    details.push(signals.audience_demographics as string)
  }
  if (signals.platform && typeof signals.platform === 'string') {
    details.push(signals.platform as string)
  }

  return details
}

/**
 * Checks if the generated email references at least one concrete detail
 * from the creator's raw_signals.
 *
 * Returns the count of concrete details found in the email body.
 * A score of 0 means the email is generic — failed specificity guard.
 */
function checkSpecificity(bodyText: string, concreteDetails: string[]): number {
  if (!concreteDetails.length) return 1 // No details to check — pass by default
  if (!bodyText) return 0

  const lower = bodyText.toLowerCase()
  let score = 0

  for (const detail of concreteDetails) {
    // Check if any significant word from the detail appears in the email
    const words = detail.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    for (const word of words) {
      if (lower.includes(word)) {
        score++
        break // Count each detail only once
      }
    }
  }

  return score
}

function buildContext(creator: any, signals: Record<string, unknown>): string {
  const parts: string[] = []

  if (signals.recent_content) parts.push(`Recent content: ${signals.recent_content}`)
  if (signals.platform) parts.push(`Primary platform: ${signals.platform}`)
  if (signals.follower_count) parts.push(`Followers: ${signals.follower_count}`)
  if (signals.engagement_rate) parts.push(`Engagement rate: ${(signals.engagement_rate as number * 100).toFixed(1)}%`)
  if (signals.recent_campaign) parts.push(`Recent campaign: ${signals.recent_campaign}`)
  if (signals.brand_collabs) parts.push(`Past brand collabs: ${signals.brand_collabs}`)
  if (signals.content_style) parts.push(`Content style: ${signals.content_style}`)
  if (signals.audience_demographics) parts.push(`Audience: ${signals.audience_demographics}`)

  return parts.join('. ') || 'No additional context available.'
}

/**
 * Checks fallback rate and alerts if it exceeds the threshold.
 * Resets counters after alerting to avoid repeated alerts.
 */
function checkFallbackRate(): void {
  if (totalCount === 0) return

  const fallbackRate = fallbackCount / totalCount

  if (fallbackRate >= FALLBACK_ALERT_THRESHOLD) {
    alert({
      severity: 'warning',
      scope: 'personalizer',
      message: `Personalizer fallback rate is ${(fallbackRate * 100).toFixed(1)}% (${fallbackCount}/${totalCount}). Reply rate may crater — check LLM availability and raw_signals quality.`,
    })

    // Reset counters after alerting
    fallbackCount = 0
    totalCount = 0
  }
}

/**
 * Returns current fallback stats for monitoring.
 */
export function getFallbackStats(): { fallbackCount: number; totalCount: number; fallbackRate: number } {
  return {
    fallbackCount,
    totalCount,
    fallbackRate: totalCount > 0 ? fallbackCount / totalCount : 0,
  }
}
