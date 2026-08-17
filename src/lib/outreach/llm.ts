/**
 * GPT-4o mini wrapper for reply classification.
 *
 * LLM output is UNTRUSTED INPUT. Strict JSON, timeout, retry, parse-or-fallback.
 */

import { outreachConfig } from './config'

interface ClassifyResult {
  ok: true
  data: Record<string, unknown>
  raw: string
}

interface ClassifyError {
  ok: false
  error: string
  raw: string | null
}

export async function classifyJson(
  system: string,
  user: string,
  maxTokens = 300
): Promise<ClassifyResult | ClassifyError> {
  const attempts = outreachConfig.llm.maxRetries
  let lastErr: Error | null = null
  let lastRaw: string | null = null

  for (let i = 1; i <= attempts; i++) {
    try {
      const raw = await callOpenAI({ system, user, maxTokens })
      lastRaw = raw
      const data = safeParse(raw)
      if (data === null) throw new Error('model returned non-JSON or empty content')
      return { ok: true, data, raw }
    } catch (err) {
      lastErr = err as Error
      if (isRetryable(err as Error) && i < attempts) {
        await sleep(backoffMs(i))
      } else if (!isRetryable(err as Error)) {
        break
      }
    }
  }

  return { ok: false, error: lastErr?.message || 'unknown', raw: lastRaw }
}

async function callOpenAI({
  system,
  user,
  maxTokens,
}: {
  system: string
  user: string
  maxTokens: number
}): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), outreachConfig.llm.timeoutMs)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${outreachConfig.llm.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: outreachConfig.llm.model,
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`OpenAI ${res.status} (retryable): ${text.slice(0, 200)}`)
      }
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`)
    }

    const json = await res.json()
    return json?.choices?.[0]?.message?.content ?? ''
  } finally {
    clearTimeout(timer)
  }
}

export function safeParse(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function isRetryable(err: Error): boolean {
  if (!err || !err.message) return false
  return (
    err.message.includes('retryable') ||
    err.message.includes('ETIMEDOUT') ||
    err.message.includes('ECONNRESET') ||
    err.message.includes('abort') ||
    err.message.includes('429') ||
    err.message.includes('5')
  )
}

function backoffMs(attempt: number): number {
  const base = 500 * 2 ** (attempt - 1)
  const jitter = Math.random() * 250
  return Math.min(base + jitter, 8000)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
