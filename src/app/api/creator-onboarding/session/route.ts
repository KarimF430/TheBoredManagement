import { NextRequest, NextResponse } from 'next/server'
import { createOnboardingSession, getOnboardingSession } from '@/lib/creator-onboarding'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, outreachCreatorId } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if session already exists for this email
    const client = (await import('@/lib/cp-db')).getCPClient()
    const { data: existing } = await client
      .from('creator_onboarding_sessions')
      .select('*')
      .eq('creator_email', email)
      .in('status', ['pending', 'in_progress'])
      .single()

    if (existing) {
      return NextResponse.json({ session: existing })
    }

    // Create new session
    const session = await createOnboardingSession(email, name, outreachCreatorId)
    return NextResponse.json({ session })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const session = await getOnboardingSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 })
    }

    return NextResponse.json({ session })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
