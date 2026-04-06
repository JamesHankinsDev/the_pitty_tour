import { NextResponse } from 'next/server'

/**
 * Simple in-memory sliding-window rate limiter for API routes.
 *
 * Each limiter tracks requests per key (typically the caller's UID or IP)
 * using a sliding window. Stale entries are garbage-collected periodically.
 *
 * Limits are per function instance — in serverless environments each cold
 * start gets a fresh map. This is fine for stopping rapid abuse; it won't
 * enforce strict global limits across concurrent instances.
 */

interface WindowEntry {
  timestamps: number[]
}

interface RateLimitConfig {
  /** Max requests allowed within the window */
  max: number
  /** Window size in milliseconds */
  windowMs: number
}

const GC_INTERVAL = 60_000 // clean up stale entries every 60s

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, WindowEntry>()
  let lastGc = Date.now()

  function gc() {
    const now = Date.now()
    if (now - lastGc < GC_INTERVAL) return
    lastGc = now
    const cutoff = now - config.windowMs
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
      if (entry.timestamps.length === 0) store.delete(key)
    }
  }

  /**
   * Check if a request should be allowed.
   * Returns null if allowed, or a 429 NextResponse if rate-limited.
   */
  function check(key: string): NextResponse | null {
    gc()

    const now = Date.now()
    const cutoff = now - config.windowMs
    const entry = store.get(key) ?? { timestamps: [] }

    // Drop timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

    if (entry.timestamps.length >= config.max) {
      const retryAfter = Math.ceil(
        (entry.timestamps[0] + config.windowMs - now) / 1000
      )
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.max),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    entry.timestamps.push(now)
    store.set(key, entry)
    return null
  }

  return { check }
}
