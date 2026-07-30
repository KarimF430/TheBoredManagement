export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> & { onRetry?: (attempt: number, error: Error, delayMs: number) => void } = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  onRetry: undefined,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error

      if (attempt < opts.maxRetries) {
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(opts.backoffFactor, attempt),
          opts.maxDelayMs
        )
        // Add jitter to prevent thundering herd
        const jitter = delay * 0.2 * Math.random()
        const totalDelay = delay + jitter

        opts.onRetry?.(attempt + 1, lastError, totalDelay)
        await sleep(totalDelay)
      }
    }
  }

  throw lastError!
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Rate-limited sequential executor.
 * Ensures at most `concurrent` operations run at once,
 * with a minimum delay between starts.
 */
export class RateLimiter {
  private queue: Array<() => void> = []
  private running = 0

  constructor(
    private concurrent: number = 1,
    private delayMs: number = 0
  ) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  private async acquire(): Promise<void> {
    if (this.running < this.concurrent) {
      this.running++
      return
    }

    return new Promise<void>(resolve => {
      this.queue.push(() => {
        this.running++
        resolve()
      })
    })
  }

  private release(): void {
    this.running--
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      setTimeout(() => next(), this.delayMs)
    }
  }
}
