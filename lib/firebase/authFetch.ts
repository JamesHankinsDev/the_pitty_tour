import { getAuth } from 'firebase/auth'

/**
 * Returns an Authorization header with the current user's Firebase ID token.
 * Use this when calling authenticated API routes.
 *
 * Usage:
 *   const headers = await authHeaders()
 *   fetch('/api/foo', { headers })
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const user = getAuth().currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}
