import { startAllWorkers, initializeScheduledJobs } from './src/lib/worker'

const shutdown = async () => {
  console.log('Shutting down worker...')
  const { closeAllQueues } = await import('./src/lib/queue')
  await closeAllQueues()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

async function main() {
  console.log('=== SOV Panel Worker Starting ===')
  console.log('Time:', new Date().toISOString())

  startAllWorkers()
  await initializeScheduledJobs()

  console.log('=== Worker running — waiting for jobs ===')

  // Keep process alive
  await new Promise(() => {})
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
