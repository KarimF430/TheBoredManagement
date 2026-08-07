import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from './supabase'
import { ProjectRole } from './permissions'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sov_dashboard_secret_key_minimum_32_characters'
)

// Uses Web Crypto API (available in Edge Runtime) instead of Node.js crypto
// to avoid Edge bundler errors while keeping strong password hashing.

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = bytesToHex(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-512' },
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

  // Constant-time comparison (same length, byte-by-byte)
  if (computedHex.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

export async function signToken(payload: { id: string; email: string; role: 'admin' | 'brand'; campaign_id?: string | null; brand_name?: string | null }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { id: string; email: string; role: 'admin' | 'brand'; campaign_id?: string | null; brand_name?: string | null }
  } catch {
    return null
  }
}

export async function getSession(req: NextRequest) {
  const token = req.cookies.get('sov_session')?.value
  if (!token) return null
  return verifyToken(token)
}

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
}

/**
 * Look up the user's project-level role from project_members.
 * Returns null if the user has no membership in this project.
 */
export async function getProjectRole(
  userId: string,
  campaignId: string
): Promise<ProjectRole | null> {
  const row = await queryOne<{ role: ProjectRole }>(
    `SELECT role FROM project_members WHERE user_id = $1 AND campaign_id = $2`,
    [userId, campaignId]
  )
  return row?.role ?? null
}

/**
 * Authorize campaign access AND optionally enforce a minimum project role.
 *
 * - Global admins bypass all checks.
 * - If `requiredRole` is provided, the user must have at least that role
 *   in the project_members table.
 */
export async function authorizeCampaignAccess(
  req: NextRequest,
  campaignId: string | null,
  requiredRole?: ProjectRole
): Promise<{ authorized: boolean; error?: NextResponse; role?: ProjectRole | null }> {
  if (!campaignId) {
    return { authorized: false, error: NextResponse.json({ error: 'campaign_id required' }, { status: 400 }) }
  }

  const session = await getSession(req)
  if (!session) {
    return { authorized: false, error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  // Global admin bypasses everything
  if (session.role === 'admin') {
    return { authorized: true, role: 'owner' }
  }

  // Check project membership
  const projectRole = await getProjectRole(session.id, campaignId)

  if (!projectRole) {
    return { authorized: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Enforce minimum role if specified
  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[projectRole] ?? -1
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999
    if (userLevel < requiredLevel) {
      return {
        authorized: false,
        error: NextResponse.json({ error: `Requires ${requiredRole} role or higher` }, { status: 403 }),
        role: projectRole,
      }
    }
  }

  return { authorized: true, role: projectRole }
}
