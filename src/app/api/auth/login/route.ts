import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { verifyPassword, signCampaignToken, setCampaignSessionCookie, type CampaignSession } from '@/lib/cp-auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const client = getCPClient()

    // Check internal users first
    const { data: user } = await client
      .from('users')
      .select('id, email, name, password_hash, role')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (user) {
      const valid = await verifyPassword(password, user.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      // Get campaigns this user has access to
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
      .select('id, email, name, password_hash, brand_name, campaign_id, invite_accepted_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (clientUser) {
      if (!clientUser.invite_accepted_at) {
        return NextResponse.json({ error: 'Please accept your invitation first' }, { status: 403 })
      }

      const valid = await verifyPassword(password, clientUser.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

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

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
