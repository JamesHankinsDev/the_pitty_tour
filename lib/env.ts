/**
 * Validate that required environment variables are set.
 *
 * Client-side vars (NEXT_PUBLIC_*) are checked at import time.
 * Server-side vars are checked lazily via `getServerEnv()` so
 * they only fail when an API route actually needs them.
 */

// ─── Client-side (checked at build/startup) ─────────────────────────────────

const REQUIRED_CLIENT_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const

// Only warn (don't throw) for client vars — placeholders exist for build time
if (typeof window !== 'undefined') {
  for (const key of REQUIRED_CLIENT_VARS) {
    const val = process.env[key]
    if (!val || val === 'placeholder' || val.startsWith('placeholder')) {
      console.warn(`[env] Missing or placeholder: ${key}`)
    }
  }
}

// ─── Server-side (checked on first use) ─────────────────────────────────────

interface ServerEnv {
  GHIN_USERNAME: string
  GHIN_PASSWORD: string
  GHIN_GOOGLE_API_KEY: string
  GOLF_COURSE_API_KEY: string
  FIREBASE_SERVICE_ACCOUNT_KEY: string
}

let _serverEnvCache: ServerEnv | null = null

/**
 * Returns validated server-side env vars. Throws on first call
 * if any required var is missing — this surfaces the error immediately
 * in the API route that needs it, with a clear message.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnvCache) return _serverEnvCache

  const required: Record<keyof ServerEnv, string | undefined> = {
    GHIN_USERNAME: process.env.GHIN_USERNAME,
    GHIN_PASSWORD: process.env.GHIN_PASSWORD,
    GHIN_GOOGLE_API_KEY: process.env.GHIN_GOOGLE_API_KEY,
    GOLF_COURSE_API_KEY: process.env.GOLF_COURSE_API_KEY,
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  }

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(', ')}. ` +
      'Check your .env.local file.'
    )
  }

  _serverEnvCache = required as ServerEnv
  return _serverEnvCache
}
