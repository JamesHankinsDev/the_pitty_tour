import { getAuth } from 'firebase-admin/auth'
import { getApps, initializeApp, cert } from 'firebase-admin/app'

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded UID on success, or null if missing/invalid.
 *
 * Usage in API routes:
 *   const uid = await verifyAuthHeader(req)
 *   if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function verifyAuthHeader(
  req: Request
): Promise<string | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  // Ensure admin SDK is initialized
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (serviceAccount) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccount)),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  }

  try {
    const token = header.slice(7)
    const decoded = await getAuth().verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}
