import { queryAll, queryOne } from './supabase'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 5
const MAX_OTP_SENDS_PER_WINDOW = 3
const RATE_LIMIT_WINDOW_MINUTES = 10
const MAX_VERIFY_ATTEMPTS = 5

export function generateOTP(): string {
  const digits = '0123456789'
  let code = ''
  const values = crypto.getRandomValues(new Uint8Array(OTP_LENGTH))
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[values[i] % 10]
  }
  return code
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const row = await queryOne<{ email: string }>(
    'SELECT email FROM allowed_emails WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return row !== null
}

export async function getAllowedEmailRole(email: string): Promise<string | null> {
  const row = await queryOne<{ role: string }>(
    'SELECT role FROM allowed_emails WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return row?.role ?? null
}

export async function createOTP(email: string): Promise<{ code: string; error?: string }> {
  // Rate limit: check how many OTPs were sent in the last window
  const recent = await queryAll<{ id: string }>(
    `SELECT id FROM otp_codes
     WHERE LOWER(email) = LOWER($1)
       AND created_at > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'`,
    [email]
  )
  if (recent.length >= MAX_OTP_SENDS_PER_WINDOW) {
    return { code: '', error: `Too many requests. Try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.` }
  }

  // Invalidate any unused OTPs for this email
  await queryAll(
    `UPDATE otp_codes SET used = TRUE WHERE LOWER(email) = LOWER($1) AND used = FALSE`,
    [email]
  )

  const code = generateOTP()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  await queryAll(
    `INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
    [email, code, expiresAt]
  )

  return { code }
}

export async function verifyOTP(
  email: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  // Find the most recent unused OTP for this email
  const otp = await queryOne<{
    id: string
    code: string
    expires_at: string
    used: boolean
    attempts: number
  }>(
    `SELECT id, code, expires_at, used, attempts
     FROM otp_codes
     WHERE LOWER(email) = LOWER($1) AND used = FALSE
     ORDER BY created_at DESC
     LIMIT 1`,
    [email]
  )

  if (!otp) {
    return { valid: false, error: 'No OTP found. Please request a new code.' }
  }

  if (otp.used) {
    return { valid: false, error: 'OTP already used. Please request a new code.' }
  }

  if (new Date(otp.expires_at) < new Date()) {
    return { valid: false, error: 'OTP expired. Please request a new code.' }
  }

  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    // Mark as used to prevent further attempts
    await queryAll(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [otp.id])
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' }
  }

  // Increment attempts
  await queryAll(
    `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`,
    [otp.id]
  )

  // Constant-time comparison
  if (otp.code.length !== code.length) {
    return { valid: false, error: 'Invalid OTP.' }
  }
  let diff = 0
  for (let i = 0; i < otp.code.length; i++) {
    diff |= otp.code.charCodeAt(i) ^ code.charCodeAt(i)
  }
  if (diff !== 0) {
    return { valid: false, error: 'Invalid OTP.' }
  }

  // Mark as used
  await queryAll(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [otp.id])

  return { valid: true }
}
