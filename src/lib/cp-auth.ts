/**
 * Campaign Panel — Authentication
 *
 * Fresh auth system for 5 roles:
 * brand_solutions, campaign_manager, ir_manager, ir_executive, client
 *
 * Uses PBKDF2 + Web Crypto API (Edge Runtime compatible).
 * JWT via jose library. Cookie: cp_session.
 */

import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import type { CampaignRole } from './campaign-permissions'

const JWT_SECRET = new TextEncoder().encode(
  process.env.CAMPAIGN_JWT_SECRET || 'cmp_panel_secret_key_min_32_chars'
)

const COOKIE_NAME = 'cp_session'

// ── Crypto Helpers (Web Crypto API, Edge-safe) ────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = bytesToHex(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-512' },
    keyMaterial, 512
  )

  return `${saltHex}:${bytesToHex(new Uint8Array(hash))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(':')) return false
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const salt = hexToBytes(saltHex)

  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-512' },
    keyMaterial, 512
  )

  const computedHex = bytesToHex(new Uint8Array(hash))

  if (computedHex.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

// ── JWT ────────────────────────────────────────────────────────────

export interface CampaignSession {
  id: string
  email: string
  name: string
  role: CampaignRole
  campaign_ids: string[]    // campaigns this user has access to
  brand_name?: string       // for client role
}

export async function signCampaignToken(payload: CampaignSession) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyCampaignToken(token: string): Promise<CampaignSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as CampaignSession
  } catch {
    return null
  }
}

export async function getCampaignSession(req: NextRequest): Promise<CampaignSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyCampaignToken(token)
}

// ── Auth Helpers ───────────────────────────────────────────────────

export function setCampaignSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
  return res
}

export function clearCampaignSession(res: NextResponse): NextResponse {
  res.cookies.delete(COOKIE_NAME)
  return res
}

export function createLoginRedirect(): NextResponse {
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

// ── Authorization ──────────────────────────────────────────────────

export async function authorizeCampaign(
  req: NextRequest,
  campaignId: string
): Promise<{ authorized: boolean; session?: CampaignSession; error?: NextResponse }> {
  const session = await getCampaignSession(req)
  if (!session) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // Client can only access their assigned campaign
  if (session.role === 'client') {
    if (!session.campaign_ids.includes(campaignId)) {
      return {
        authorized: false,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      }
    }
    return { authorized: true, session }
  }

  // Internal roles: check if they have access to this campaign
  // brand_solutions and campaign_manager have access to all campaigns
  if (session.role === 'brand_solutions' || session.role === 'campaign_manager') {
    return { authorized: true, session }
  }

  // ir_manager and ir_executive: check campaign_ids list
  if (!session.campaign_ids.includes(campaignId)) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { authorized: true, session }
}
