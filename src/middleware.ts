import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession, type CampaignSession } from '@/lib/cp-auth'

const COOKIE_NAME = 'cp_session'

// Routes that don't need authentication
const PUBLIC_ROUTES = [
  '/login',
  '/client/login',
  '/client/accept',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/client/accept-invite',
  '/api/setup-campaign',
  '/creator-onboarding',
  '/api/creator-onboarding/session',
  '/api/creator-onboarding/sessions',
  '/api/creator-onboarding/otp',
  '/api/creator-onboarding/niches',
  '/api/creator-onboarding/prefill',
  '/api/creator-onboarding/save-step',
  '/api/creator-onboarding/complete',
  '/api/creator-onboarding/verify-handle'
]

// Campaign panel internal routes (require internal role)
const INTERNAL_PREFIXES = ['/campaigns', '/api/campaigns', '/admin', '/api/admin']

// Client panel routes
const CLIENT_PREFIXES = ['/client']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip public routes
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    if (pathname === '/api/creator-onboarding/session' && req.method !== 'GET') {
      // POST/DELETE session actions are admin-only, do not skip auth
    } else {
      return NextResponse.next()
    }
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  // No token → redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verify token
  let session: CampaignSession | null
  try {
    const { verifyCampaignToken } = await import('@/lib/cp-auth')
    session = await verifyCampaignToken(token)
  } catch {
    session = null
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  // Client role: only allow /client routes
  if (session.role === 'client') {
    if (!pathname.startsWith('/client') && !pathname.startsWith('/api/client')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/client', req.url))
    }
    return NextResponse.next()
  }

  // Internal role trying to access /client routes → redirect to /campaigns
  if (pathname.startsWith('/client')) {
    return NextResponse.redirect(new URL('/campaigns', req.url))
  }

  // Attach session to headers for downstream use
  const res = NextResponse.next()
  res.headers.set('x-cp-user-id', session.id)
  res.headers.set('x-cp-user-email', session.email)
  res.headers.set('x-cp-user-name', session.name)
  res.headers.set('x-cp-user-role', session.role)

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
