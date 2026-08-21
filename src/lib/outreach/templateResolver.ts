/**
 * Template placeholder resolver.
 *
 * Resolves {{variable}} placeholders in email templates.
 * Supported variables:
 *   {{onboarding_link}}  — Per-creator onboarding URL (creates session if needed)
 *   {{first_name}}       — Creator's first name (from name field)
 *   {{last_name}}        — Creator's last name (from name field)
 *   {{full_name}}        — Creator's full name
 *   {{niche}}            — Creator's niche
 *   {{platform}}         — Creator's primary platform (from raw_signals)
 *   {{recipient_email}}  — Recipient email address
 */

import { getCPClient } from '@/lib/cp-db'
import { createOnboardingSession } from '@/lib/creator-onboarding'

const ONBOARDING_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface ResolvedTemplate {
  subject: string
  body_text: string
  body_html: string | undefined
}

export async function resolveTemplatePlaceholders(
  subject: string,
  bodyText: string,
  bodyHtml: string | null,
  creatorId: string | null,
  recipientEmail: string,
): Promise<ResolvedTemplate> {
  const variables = await buildVariableMap(creatorId, recipientEmail)

  return {
    subject: interpolate(subject, variables),
    body_text: interpolate(bodyText, variables),
    body_html: bodyHtml ? interpolate(bodyHtml, variables) : undefined,
  }
}

function interpolate(text: string, vars: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

async function buildVariableMap(
  creatorId: string | null,
  recipientEmail: string,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    recipient_email: recipientEmail,
  }

  if (!creatorId) {
    vars.first_name = ''
    vars.last_name = ''
    vars.full_name = ''
    vars.niche = ''
    vars.platform = ''
    vars.onboarding_link = `${ONBOARDING_BASE}/creator-onboarding`
    return vars
  }

  try {
    const client = getCPClient()
    const { data: creator } = await client
      .from('outreach_creators')
      .select('name, niche, raw_signals')
      .eq('id', creatorId)
      .single()

    if (creator) {
      const name = creator.name || ''
      const parts = name.split(/\s+/).filter(Boolean)
      vars.first_name = parts[0] || ''
      vars.last_name = parts.slice(1).join(' ') || ''
      vars.full_name = name
      vars.niche = creator.niche || ''

      const signals = creator.raw_signals as Record<string, unknown> | null
      vars.platform = (signals?.platform as string) || ''
    }
  } catch (err) {
    console.error('[templateResolver] creator lookup fallback:', (err as Error).message)
  }

  vars.onboarding_link = `${ONBOARDING_BASE}/creator-onboarding`

  try {
    vars.onboarding_link = await getOrCreateOnboardingLink(creatorId, recipientEmail)
  } catch (err) {
    console.error('[templateResolver] onboarding link fallback:', (err as Error).message)
  }

  return vars
}

async function getOrCreateOnboardingLink(creatorId: string, email: string): Promise<string> {
  const client = getCPClient()

  // Check if there's already a session for this creator
  const { data: existingSession } = await client
    .from('creator_onboarding_sessions')
    .select('token, status')
    .eq('outreach_creator_id', creatorId)
    .in('status', ['pending', 'in_progress', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existingSession) {
    return `${ONBOARDING_BASE}/creator-onboarding?token=${existingSession.token}`
  }

  // Create new session
  const session = await createOnboardingSession(email, undefined, creatorId)
  return `${ONBOARDING_BASE}/creator-onboarding?token=${session.token}`
}
