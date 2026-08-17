import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { signCampaignToken, setCampaignSessionCookie, type CampaignSession } from '@/lib/cp-auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const client = getCPClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Check internal users
    const { data: user } = await client
      .from('users')
      .select('id, email, name, role')
      .eq('email', normalizedEmail)
      .single()

    if (user) {
      const { data: campaignRoles } = await client
        .from('campaign_roles')
        .select('campaign_id')
        .eq('user_id', user.id)

      const campaignIds = campaignRoles?.map(r => r.campaign_id) || []

      const session: CampaignSession = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as CampaignSession['role'],
        campaign_ids: campaignIds,
      }

      const token = await signCampaignToken(session)
      const res = NextResponse.json({ session, redirect: '/campaigns' })
      return setCampaignSessionCookie(res, token)
    }

    // Check client users
    const { data: clientUser } = await client
      .from('cp_client_users')
      .select('id, email, name, brand_name, campaign_id')
      .eq('email', normalizedEmail)
      .single()

    if (clientUser) {
      const session: CampaignSession = {
        id: clientUser.id,
        email: clientUser.email,
        name: clientUser.name,
        role: 'client',
        campaign_ids: [clientUser.campaign_id],
        brand_name: clientUser.brand_name,
      }

      const token = await signCampaignToken(session)
      const res = NextResponse.json({ session, redirect: '/client' })
      return setCampaignSessionCookie(res, token)
    }

    // Unknown email — create a temporary session with admin role
    const tempSession: CampaignSession = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'brand_solutions',
      campaign_ids: [],
    }

    const token = await signCampaignToken(tempSession)
    const res = NextResponse.json({ session: tempSession, redirect: '/campaigns' })
    return setCampaignSessionCookie(res, token)
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
