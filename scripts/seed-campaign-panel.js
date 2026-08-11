/**
 * Campaign Panel — Database Seed Script
 * Run: node scripts/seed-campaign-panel.js
 *
 * Creates:
 * 1. All cp_* tables (runs 001_campaign_panel.sql)
 * 2. First admin user (brand_solutions role)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// PBKDF2 password hashing (matches cp-auth.ts)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const saltHex = salt.toString('hex')

  const keyMaterial = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })

  return `${saltHex}:${keyMaterial.toString('hex')}`
}

async function runSchema() {
  console.log('1. Running schema migration...')

  const schemaPath = path.join(__dirname, '..', 'schema', '001_campaign_panel.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  // Split by semicolons and run each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let success = 0
  let errors = 0

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' })
      if (error) {
        // Try direct query if exec_sql doesn't exist
        console.log(`  ⚠ Statement may need manual execution: ${stmt.substring(0, 60)}...`)
        errors++
      } else {
        success++
      }
    } catch (e) {
      console.log(`  ⚠ ${e.message.substring(0, 80)}`)
      errors++
    }
  }

  console.log(`  Schema: ${success} OK, ${errors} need manual check`)
}

async function createFirstUser() {
  console.log('\n2. Creating first user...')

  const email = 'haji.karim@theboredmonkey.com'
  const password = 'Tbm@2026' // User should change this
  const name = 'Haji Karim'
  const role = 'brand_solutions'

  const passwordHash = await hashPassword(password)

  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    console.log(`  User ${email} already exists (id: ${existing.id})`)
    return existing.id
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email,
      name,
      password_hash: passwordHash,
      role,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`  Failed to create user: ${error.message}`)
    console.log('\n  The users table may not exist yet. Run the schema first.')
    console.log('  If using a fresh Supabase project, create the users table manually:')
    console.log(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ir_executive',
      campaign_id UUID,
      brand_name TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    `)
    return null
  }

  console.log(`  User created: ${email} (${role})`)
  console.log(`  Password: ${password}`)
  console.log(`  ID: ${user.id}`)
  return user.id
}

async function main() {
  console.log('=== Campaign Panel Seed ===\n')

  // Check if exec_sql RPC exists
  try {
    const { error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' })
    if (error && error.message.includes('function')) {
      console.log('exec_sql RPC not found. Creating it...')
      const { error: rpcErr } = await supabase.rpc('exec_sql', {
        query: `CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS VOID AS $$ BEGIN EXECUTE query; END; $$ LANGUAGE plpgsql;`
      })
      if (rpcErr) {
        console.log('Could not create exec_sql. Run schema manually in Supabase SQL Editor.')
        console.log('Paste: schema/001_campaign_panel.sql')
      }
    }
  } catch {
    // exec_sql might not exist yet
  }

  await runSchema()
  await createFirstUser()

  console.log('\n=== Done ===')
  console.log('Login at: http://localhost:3000/login')
}

main().catch(console.error)
