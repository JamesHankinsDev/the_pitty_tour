import { authHeaders } from './authFetch'

/**
 * Send push notifications via the server-side API route.
 * This is a fire-and-forget helper — failures are logged but don't throw.
 */
export async function sendPush(data: {
  recipientUids: string[]
  title: string
  body: string
  link?: string
}): Promise<void> {
  try {
    const headers = await authHeaders()
    await fetch('/api/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
  } catch (err) {
    console.warn('Push notification failed:', err)
  }
}

/**
 * Send push to all users except the actor.
 * Fetches UIDs from the users collection client-side,
 * then calls the push API.
 */
export async function sendPushToAll(
  excludeUid: string,
  data: { title: string; body: string; link?: string }
): Promise<void> {
  try {
    const { getAllUsers } = await import('./firestore')
    const users = await getAllUsers()
    const recipientUids = users.map((u) => u.uid).filter((u) => u !== excludeUid)
    if (recipientUids.length === 0) return
    await sendPush({ recipientUids, ...data })
  } catch (err) {
    console.warn('Push to all failed:', err)
  }
}
