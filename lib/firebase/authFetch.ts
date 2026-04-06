import { getAuth, type User } from 'firebase/auth'

/**
 * Returns an Authorization header with the current user's Firebase ID token.
 * Use this when calling authenticated API routes.
 *
 * Optionally pass a User object directly (e.g. during onAuthStateChanged
 * when getAuth().currentUser may not be set yet).
 *
 * Usage:
 *   const headers = await authHeaders()
 *   fetch('/api/foo', { headers })
 */
export async function authHeaders(currentUser?: User | null): Promise<Record<string, string>> {
  const user = currentUser ?? getAuth().currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}
