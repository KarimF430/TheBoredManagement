/**
 * Outreach Worker Runner
 *
 * Usage: npx tsx scripts/outreach/run-worker.ts <worker-name>
 *
 * Available workers:
 *   processor        — claim and send queued emails
 *   replyCapture     — pull inbound replies via Gmail History
 *   replyClassifier  — classify unclassified replies with GPT-4o mini
 *   followupEngine   — schedule follow-ups for non-responders
 *   monitor          — daily Postmaster metrics, health rollup, threshold actions
 *   rampGovernor     — evaluate health, advance/cut budget
 *   scorer           — rank creators, update contactability
 *   reconciler       — resolve stuck queue rows
 *   seedTester       — test seed placement across providers
 */

import { processBatch } from '../../src/workers/processor'
import { captureAllReplies } from '../../src/workers/replyCapture'
import { classifyPending } from '../../src/workers/replyClassifier'
import { runFollowups } from '../../src/workers/followupEngine'
import { runDailyMonitor } from '../../src/workers/monitor'
import { evaluateAndAdvance } from '../../src/workers/rampGovernor'
import { rankCreators, updateContactability } from '../../src/workers/scorer'
import { reconcile } from '../../src/workers/reconciler'
import { runSeedTests } from '../../src/workers/seedTester'

const workerName = process.argv[2]

if (!workerName) {
  console.error('Usage: npx tsx scripts/outreach/run-worker.ts <worker-name>')
  console.error('Available: processor, replyCapture, replyClassifier, followupEngine, monitor, rampGovernor, scorer, reconciler, seedTester')
  process.exit(1)
}

const workers: Record<string, () => Promise<unknown>> = {
  processor: () => processBatch(),
  replyCapture: () => captureAllReplies(),
  replyClassifier: () => classifyPending(),
  followupEngine: () => runFollowups(),
  monitor: () => runDailyMonitor(),
  rampGovernor: () => evaluateAndAdvance(),
  scorer: () => rankCreators().then(() => updateContactability()),
  reconciler: () => reconcile(),
  seedTester: () => runSeedTests(),
}

const worker = workers[workerName]

if (!worker) {
  console.error(`Unknown worker: ${workerName}`)
  console.error(`Available: ${Object.keys(workers).join(', ')}`)
  process.exit(1)
}

worker()
  .then((result) => {
    console.log(`[worker] ${workerName} complete:`, JSON.stringify(result))
    process.exit(0)
  })
  .catch((err) => {
    console.error(`[worker] ${workerName} failed:`, err.message)
    process.exit(1)
  })
