/**
 * Template placeholder resolver.
 *
 * Resolves {{variable}} placeholders in email templates.
 * Currently supports:
 *   {{onboarding_link}} — Per-creator onboarding URL (creates session if needed)
 */

import { getCPClient } from '@/lib/cp-db'
import { createOnboardingSession, getOnboardingSession } from '@/lib/creator-onboarding'

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
  const needsOnboardingLink =
    subject.includes('{{onboarding_link}}') ||
    bodyText.includes('{{onboarding_link}}') ||
    (bodyHtml && bodyHtml.includes('{{onboarding_link}}'))

  let onboardingUrl = ''

  if (needsOnboardingLink && creatorId) {
    onboardingUrl = await getOrCreateOnboardingLink(creatorId, recipientEmail)
  } else if (needsOnboardingLink) {
    // No creator_id — generate a generic placeholder (won't work but won't crash)
    onboardingUrl = `${ONBOARDING_BASE}/creator-onboarding`
  }

  return {
    subject: subject.replaceAll('{{onboarding_link}}', onboardingUrl),
    body_text: bodyText.replaceAll('{{onboarding_link}}', onboardingUrl),
    body_html: bodyHtml?.replaceAll('{{onboarding_link}}', onboardingUrl) ?? undefined,
  }
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
