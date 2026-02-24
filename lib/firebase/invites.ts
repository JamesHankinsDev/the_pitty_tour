import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Invite } from '../types'

export const INVITES_COLLECTION = 'invites'

// ─── Token Generation ────────────────────────────────────────────────────────

/** Generates a URL-safe cryptographically random token (~28 chars). */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(21))
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 28)
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a single invite by token.
 * Allowed without auth (Firestore rules allow `get` publicly).
 */
export async function getInvite(token: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, INVITES_COLLECTION, token))
  return snap.exists() ? (snap.data() as Invite) : null
}

/** Fetch all invites — admin only (enforced by Firestore rules). */
export async function getAllInvites(): Promise<Invite[]> {
  const q = query(
    collection(db, INVITES_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Invite)
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Admin creates a new invite link.
 * Returns the token (which forms the invite URL).
 */
export async function createInvite(
  createdByUid: string,
  note: string,
  expiryDays = 7
): Promise<string> {
  const token = generateToken()
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + expiryDays * 24 * 60 * 60 * 1000
  )

  await setDoc(doc(db, INVITES_COLLECTION, token), {
    token,
    createdAt: serverTimestamp(),
    createdByUid,
    expiresAt,
    usedAt: null,
    usedByUid: null,
    usedByEmail: null,
    note: note.trim(),
    status: 'pending',
  })

  return token
}

// ─── Claim ────────────────────────────────────────────────────────────────────

/**
 * Atomically mark an invite as used during first sign-in.
 * Throws a descriptive error string if the invite is invalid.
 */
export async function claimInvite(
  token: string,
  uid: string,
  email: string
): Promise<void> {
  const inviteRef = doc(db, INVITES_COLLECTION, token)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(inviteRef)

    if (!snap.exists()) throw new Error('INVITE_NOT_FOUND')

    const invite = snap.data() as Invite
    const now = Timestamp.now()

    if (invite.status !== 'pending') throw new Error('INVITE_ALREADY_USED')
    if (invite.expiresAt.toMillis() < now.toMillis()) throw new Error('INVITE_EXPIRED')

    tx.update(inviteRef, {
      status: 'used',
      usedAt: serverTimestamp(),
      usedByUid: uid,
      usedByEmail: email,
    })
  })
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/** Admin revokes an unused invite (marks it expired). */
export async function revokeInvite(token: string): Promise<void> {
  await updateDoc(doc(db, INVITES_COLLECTION, token), {
    status: 'expired',
  })
}
