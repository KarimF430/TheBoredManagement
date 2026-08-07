import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/auth'

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('sov_session')?.value
  const path = req.nextUrl.pathname

  // Public assets / api routes are excluded
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/tbm-logo') ||
    path.startsWith('/login') ||
    path.startsWith('/privacy-policy') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/init') ||
    path.startsWith('/api/brands/analyze') ||
    path.startsWith('/api/videos/ids') ||
    path.startsWith('/api/warm') ||
    path.startsWith('/api/cron') ||
    path.startsWith('/api/creators')
  ) {
    return NextResponse.next()
  }

  // Token verify
  const session = token ? await verifyToken(token) : null

  if (!session) {
    // API routes must return JSON — redirecting to /login yields HTML and breaks fetch().json()
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Role permissions routing
  if (path.startsWith('/client')) {
    return NextResponse.next()
  }

  // Workspace hub is accessible by all authenticated users
  if (path.startsWith('/workspace')) {
    return NextResponse.next()
  }

  // Dashboard / main page accessible by all authenticated users
  if (path === '/') {
    return NextResponse.next()
  }

  // Admin-only pages: settings, control
  const isAdminOnly = path.startsWith('/settings') || path.startsWith('/control')
  const isAdminOnlyApi = path.startsWith('/api/users') || path.startsWith('/api/workspace/members') || path.startsWith('/api/settings')

  if ((isAdminOnly || isAdminOnlyApi) && session.role !== 'admin') {
    const workspaceUrl = new URL('/workspace', req.url)
    return NextResponse.redirect(workspaceUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/cron (cron jobs can bypass or authenticate via query secret)
     */
    '/((?!api/cron).*)',
  ],
}
