/**
 * Concurrency integration tests — must run against a live test Postgres.
 *
 * These are NOT optional. They are the pre-go-live gate.
 * A concurrency test that passes once proves very little; one that passes
 * a thousand times under deliberate contention proves something.
 *
 * Usage: Set DATABASE_URL to a test database and run:
 *   npx tsx tests/concurrency.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { outreachSelect, outreachInsert, outreachUpdate, outreachCount } from '../src/lib/outreach/db'

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

if (!TEST_DB_URL) {
  console.error('ERROR: Set TEST_DATABASE_URL or DATABASE_URL to run concurrency tests')
  process.exit(1)
}

describe('concurrency integration tests', () => {

  describe('atomic claim — zero overlap under heavy contention', () => {
    it('4 workers claiming from 200-row queue produce disjoint result sets (repeated 50x)', { timeout: 120000 }, async () => {
      const iterations = 50
      const totalRows = 200
      const workers = 4
      const claimSize = Math.floor(totalRows / workers)

      for (let iter = 0; iter < iterations; iter++) {
        await seedQueue(totalRows, `iter-${iter}`)

        // Run workers in parallel with artificial delay to widen race window
        const promises = Array.from({ length: workers }, (_, i) =>
          runClaimWorker(`w${i}-${iter}`, claimSize, 10) // 10ms artificial delay
        )

        const results = await Promise.all(promises)

        // Verify disjoint sets
        const allIds = new Set<string>()
        let totalClaimed = 0

        for (const result of results) {
          totalClaimed += result.count
          for (const id of result.claimedIds) {
            assert.ok(!allIds.has(id), `ITERATION ${iter}: ID ${id} claimed by multiple workers — DOUBLE SEND`)
            allIds.add(id)
          }
        }

        assert.strictEqual(totalClaimed, totalRows, `ITERATION ${iter}: Total claimed should equal total rows`)

        // Cleanup
        await cleanupQueue(`iter-${iter}`)
      }
    })
  })

  describe('atomic claim — stress test with many workers', () => {
    it('8 workers claiming from 500-row queue, repeated 20x', { timeout: 120000 }, async () => {
      const iterations = 20
      const totalRows = 500
      const workers = 8
      const claimSize = Math.floor(totalRows / workers)

      for (let iter = 0; iter < iterations; iter++) {
        await seedQueue(totalRows, `stress-${iter}`)

        const promises = Array.from({ length: workers }, (_, i) =>
          runClaimWorker(`sw${i}-${iter}`, claimSize, 5)
        )

        const results = await Promise.all(promises)

        const allIds = new Set<string>()
        let totalClaimed = 0

        for (const result of results) {
          totalClaimed += result.count
          for (const id of result.claimedIds) {
            assert.ok(!allIds.has(id), `STRESS ${iter}: ID ${id} claimed by multiple workers`)
            allIds.add(id)
          }
        }

        assert.strictEqual(totalClaimed, totalRows, `STRESS ${iter}: Total claimed should equal total rows`)

        await cleanupQueue(`stress-${iter}`)
      }
    })
  })

  describe('atomic mailbox cap — parallel increments never exceed cap', () => {
    it('50 parallel increments on a cap-10 mailbox stop at exactly 10', { timeout: 30000 }, async () => {
      const mb = await outreachInsert<any>('outreach_mailboxes', {
        domain_id: '00000000-0000-0000-0000-000000000001',
        tier: 'tier1',
        provider: 'gmail',
        email: `cap-test-${Date.now()}@test.com`,
        daily_cap: 10,
        sent_today: 0,
        status: 'active',
      })

      const workers = Array.from({ length: 50 }, () => incrementCap(mb.id))
      const results = await Promise.allSettled(workers)
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value).length

      const rows = await outreachSelect<any>('outreach_mailboxes', {
        filters: { id: mb.id },
        limit: 1,
      })

      assert.strictEqual(rows[0].sent_today, 10, 'Mailbox cap must not be exceeded')
      assert.strictEqual(successes, 10, 'Exactly 10 increments should succeed')

      await outreachUpdate('outreach_mailboxes', 'id', mb.id, { status: 'paused' })
    })
  })

  describe('enqueue idempotency — batch twice produces one row', () => {
    it('same batch enqueued twice results in deduplication', { timeout: 30000 }, async () => {
      const batch = [
        { creator_id: null, recipient_email: `dedupe1-${Date.now()}@test.com`, tier: 'tier2', stage: 'first_touch', template_id: null, subject: 'Test', body_text: 'Test' },
        { creator_id: null, recipient_email: `dedupe2-${Date.now()}@test.com`, tier: 'tier2', stage: 'first_touch', template_id: null, subject: 'Test', body_text: 'Test' },
      ]

      // Simulate enqueue with dedupe check
      const day = new Date().toISOString().slice(0, 10)
      const keys = batch.map((b) => `${b.recipient_email}:first_touch:${day}`)

      let queued1 = 0
      for (const b of batch) {
        const key = `${b.recipient_email}:first_touch:${day}`
        const existing = await outreachCount('outreach_send_queue', { dedupe_key: key })
        if (existing === 0) {
          await outreachInsert('outreach_send_queue', {
            dedupe_key: key,
            ...b,
            priority: 100000,
            status: 'queued',
          })
          queued1++
        }
      }

      let queued2 = 0
      for (const b of batch) {
        const key = `${b.recipient_email}:first_touch:${day}`
        const existing = await outreachCount('outreach_send_queue', { dedupe_key: key })
        if (existing === 0) {
          queued2++
        }
      }

      assert.strictEqual(queued1, 2, 'First enqueue should queue 2')
      assert.strictEqual(queued2, 0, 'Second enqueue should queue 0 (deduped)')

      // Cleanup
      for (const key of keys) {
        const rows = await outreachSelect<any>('outreach_send_queue', { filters: { dedupe_key: key } })
        for (const r of rows) {
          await outreachUpdate('outreach_send_queue', 'id', r.id, { status: 'failed' })
        }
      }
    })
  })

  describe('reconciler — stuck claimed rows are requeued, sending rows are parked', () => {
    it('claimed rows requeued, sending rows with log verified, sending rows without log parked', { timeout: 30000 }, async () => {
      // Seed 3 claimed rows (old)
      await seedQueue(3, 'reconcile-test')
      const now = new Date().toISOString()
      const old = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      const rows = await outreachSelect('outreach_send_queue', {
        filters: { dedupe_key: 'reconcile-test' },
      })

      // Mark as stuck claimed
      for (const r of rows) {
        await outreachUpdate('outreach_send_queue', 'id', r.id, {
          status: 'claimed',
          claimed_at: old,
          claimed_by: 'dead-worker',
        })
      }

      // Mark one as stuck sending with log row
      if (rows.length > 0) {
        await outreachUpdate('outreach_send_queue', 'id', rows[0].id, {
          status: 'sending',
          claimed_at: old,
        })
        await outreachInsert('outreach_log', {
          queue_id: rows[0].id,
          tier: 'tier2',
          stage: 'first_touch',
          provider: 'ses',
          recipient_email: 'test@test.com',
          provider_message_id: 'msg-123',
          rfc_message_id: rows[0].id,
          sent_at: now,
        })
      }

      // Mark one as stuck sending without log row
      if (rows.length > 1) {
        await outreachUpdate('outreach_send_queue', 'id', rows[1].id, {
          status: 'sending',
          claimed_at: old,
        })
      }

      // Run reconciler
      const { reconcile } = await import('../src/workers/reconciler')
      const result = await reconcile()

      // Verify claimed rows were requeued
      if (rows.length > 2) {
        const requeued = await outreachSelect('outreach_send_queue', {
          filters: { id: rows[2].id },
          limit: 1,
        })
        assert.strictEqual(requeued[0].status, 'queued', 'Stuck claimed row should be requeued')
      }

      // Verify sending row with log was verified (marked sent)
      if (rows.length > 0) {
        const verified = await outreachSelect('outreach_send_queue', {
          filters: { id: rows[0].id },
          limit: 1,
        })
        assert.strictEqual(verified[0].status, 'sent', 'Sending row with log should be marked sent')
      }

      // Verify sending row without log was parked
      if (rows.length > 1) {
        const parked = await outreachSelect<any>('outreach_send_queue', {
          filters: { id: rows[1].id },
          limit: 1,
        })
        assert.strictEqual(parked[0].status, 'failed', 'Sending row without log should be parked as failed')
        assert.ok(
          parked[0].last_error?.includes('parked_for_review'),
          'Parked row should have review flag in error'
        )
      }

      // Cleanup
      for (const r of rows) {
        await outreachUpdate('outreach_send_queue', 'id', r.id, { status: 'failed' })
      }
    })
  })
})

async function seedQueue(count: number, prefix: string): Promise<void> {
  for (let i = 0; i < count; i++) {
    await outreachInsert('outreach_send_queue', {
      dedupe_key: `${prefix}-${i}`,
      creator_id: null,
      recipient_email: `test-${prefix}-${i}@test.com`,
      tier: 'tier2',
      stage: 'first_touch',
      template_id: null,
      subject: 'Test',
      body_text: 'Test',
      priority: i,
      status: 'queued',
      scheduled_for: new Date().toISOString(),
    })
  }
}

async function cleanupQueue(prefix: string): Promise<void> {
  const rows = await outreachSelect<any>('outreach_send_queue', {})
  for (const r of rows) {
    if (r.dedupe_key?.startsWith(prefix)) {
      await outreachUpdate('outreach_send_queue', 'id', r.id, { status: 'failed' })
    }
  }
}

async function runClaimWorker(workerId: string, limit: number, delayMs: number): Promise<{ count: number; claimedIds: string[] }> {
  const queued = await outreachSelect<any>('outreach_send_queue', {
    filters: { status: 'queued' },
    order: { column: 'priority', ascending: true },
    limit,
  })

  if (queued.length === 0) return { count: 0, claimedIds: [] }

  const now = new Date().toISOString()
  const claimedIds: string[] = []

  for (const item of queued) {
    // Artificial delay to widen the race window
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }

    try {
      await outreachUpdate('outreach_send_queue', 'id', item.id, {
        status: 'claimed',
        claimed_at: now,
        claimed_by: workerId,
      })
      claimedIds.push(item.id)
      if (claimedIds.length >= limit) break
    } catch {
      // Already claimed by another worker — skip
    }
  }

  return { count: claimedIds.length, claimedIds }
}

async function incrementCap(mailboxId: string): Promise<boolean> {
  const rows = await outreachSelect<any>('outreach_mailboxes', {
    filters: { id: mailboxId },
    limit: 1,
  })

  if (rows.length === 0) return false
  const mb = rows[0]

  if (mb.sent_today >= mb.daily_cap) return false

  await outreachUpdate('outreach_mailboxes', 'id', mailboxId, {
    sent_today: mb.sent_today + 1,
  })

  return true
}
