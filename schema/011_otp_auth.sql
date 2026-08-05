-- Migration 011: Email OTP Login System
-- Replaces password-based auth with passwordless email OTP.
-- Only pre-approved emails (allowed_emails) can log in.

-- ── 1. Allowed emails table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS allowed_emails (
  email       TEXT PRIMARY KEY,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. OTP codes table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  attempts   INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes (email, created_at DESC);

-- ── 3. Make password_hash nullable in users ───────────────────────
-- (safe: existing rows keep their hash, new OTP users get NULL)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- ── 4. Seed allowed_emails with the master email ──────────────────
INSERT INTO allowed_emails (email, role)
VALUES ('Haji.karim@theboredmonkey.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ── 5. Auto-cleanup function for expired OTPs ─────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
