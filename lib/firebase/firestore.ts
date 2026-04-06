import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  increment,
  limit,
  collectionGroup,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from './config'

// ─── Demo Mode Guard ────────────────────────────────────────────────────────
let _demoMode = false
export function setDemoMode(active: boolean) { _demoMode = active }
export function isDemoMode() { return _demoMode }

function guardDemoWrite(action: string): boolean {
  if (_demoMode) {
    toast.info(`${action} is disabled in demo mode. Sign in to use this feature!`)
    return true
  }
  return false
}
import type {
  HandicapSnapshot,
  CourseReview,
  Poll,
  PollOption as PollOptionType,
  PollVote,
  PollComment,
  Election,
  Candidate,
  CurrentOfficer,
  FlaggedRound,
  Announcement,
  ScheduledRound,
  ExhibitionSession,
  ExhibitionPlayer,
  ExhibitionCardLogEntry,
  CachedCourse,
  Feedback,
  UserProfile,
  Season,
  Registration,
  Round,
  Points,
  Attestation,
  Message,
  Notification,
  NotificationType,
  Course,
  Payout,
  MonthClose,
} from '../types'

// ─── Collections ─────────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  SEASONS: 'seasons',
  REGISTRATIONS: 'registrations',
  ROUNDS: 'rounds',
  POINTS: 'points',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_READS: 'notificationReads',
  COURSES: 'courses',
  POLLS: 'polls',
  CURRENT_OFFICERS: 'currentOfficers',
  FLAGGED_ROUNDS: 'flaggedRounds',
  ANNOUNCEMENTS: 'announcements',
  SCHEDULED_ROUNDS: 'scheduledRounds',
  EXHIBITION_SESSIONS: 'exhibitionSessions',
  CACHED_COURSES: 'cachedCourses',
  PAYOUTS: 'payouts',
  MONTH_CLOSES: 'monthCloses',
  FEEDBACK: 'feedback',
} as const

// ─── User Operations ─────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  const snap = await getDoc(docRef)
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function createUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (guardDemoWrite('Creating profiles')) return;
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await setDoc(docRef, {
    ...data,
    uid,
    memberSince: serverTimestamp(),
    totalPoints: 0,
    isAdmin: false,
    qrCode: uid,
  })
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (guardDemoWrite('Updating profiles')) return;
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(docRef, data as Record<string, unknown>)

  // If displayName or photoURL changed, cascade to denormalized copies
  if (data.displayName !== undefined || data.photoURL !== undefined) {
    syncDenormalizedUserData(uid, data.displayName, data.photoURL).catch((err) =>
      console.warn('Denormalized sync failed (non-critical):', err)
    )
  }
}

/**
 * After a user updates their profile, cascade the new displayName / photoURL
 * to every collection that stores denormalized copies. Runs as a fire-and-forget
 * background task — failures are logged but don't block the profile save.
 *
 * Firestore batches are limited to 500 writes, so we chunk if needed.
 */
async function syncDenormalizedUserData(
  uid: string,
  displayName?: string,
  photoURL?: string
): Promise<void> {
  if (!displayName && photoURL === undefined) return

  // Collect all document refs + updates to apply
  const updates: Array<{
    ref: ReturnType<typeof doc>
    data: Record<string, unknown>
  }> = []

  // Helper: query a top-level collection for docs owned by this uid
  async function collectFromCollection(
    collectionName: string,
    uidField: string,
    fields: Record<string, unknown>
  ) {
    const q = query(
      collection(db, collectionName),
      where(uidField, '==', uid)
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      updates.push({ ref: d.ref, data: fields })
    }
  }

  // Build the field map for each collection type
  const nameAndPhoto: Record<string, unknown> = {}
  if (displayName !== undefined) nameAndPhoto.displayName = displayName
  if (photoURL !== undefined) nameAndPhoto.photoURL = photoURL

  // 1. Messages — uid, displayName, photoURL
  await collectFromCollection(COLLECTIONS.MESSAGES, 'uid', nameAndPhoto)

  // 2. Feedback — uid, displayName, photoURL
  await collectFromCollection(COLLECTIONS.FEEDBACK, 'uid', nameAndPhoto)

  // 3. Announcements — postedBy (uid field), postedByName (name field)
  if (displayName !== undefined) {
    const q = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      where('postedBy', '==', uid)
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      updates.push({ ref: d.ref, data: { postedByName: displayName } })
    }
  }

  // 4. Notifications — actorUid, actorName, actorPhotoURL
  const notifFields: Record<string, unknown> = {}
  if (displayName !== undefined) notifFields.actorName = displayName
  if (photoURL !== undefined) notifFields.actorPhotoURL = photoURL
  if (Object.keys(notifFields).length > 0) {
    await collectFromCollection(COLLECTIONS.NOTIFICATIONS, 'actorUid', notifFields)
  }

  // 5. Course reviews (subcollection: courses/{id}/reviews) — uid, displayName, photoURL
  if (Object.keys(nameAndPhoto).length > 0) {
    const reviewsQuery = query(
      collectionGroup(db, 'reviews'),
      where('uid', '==', uid)
    )
    const reviewSnap = await getDocs(reviewsQuery)
    for (const d of reviewSnap.docs) {
      updates.push({ ref: d.ref, data: nameAndPhoto })
    }
  }

  // 6. Exhibition players (subcollection: exhibitionSessions/{id}/players/{uid})
  //    Doc ID = userId, so we use collectionGroup + doc ID match
  const playerFields: Record<string, unknown> = {}
  if (displayName !== undefined) playerFields.displayName = displayName
  if (photoURL !== undefined) playerFields.photoURL = photoURL
  if (Object.keys(playerFields).length > 0) {
    const playersQuery = query(
      collectionGroup(db, 'players'),
      where('userId', '==', uid)
    )
    const playerSnap = await getDocs(playersQuery)
    for (const d of playerSnap.docs) {
      updates.push({ ref: d.ref, data: playerFields })
    }
  }

  // Apply all updates in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const chunk = updates.slice(i, i + BATCH_SIZE)
    for (const { ref, data } of chunk) {
      batch.update(ref, data)
    }
    await batch.commit()
  }
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
) {
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  return onSnapshot(docRef, (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null)
  })
}

// Module-level cache for getAllUsers — avoids re-reading the entire
// collection on every admin page navigation.
let _usersCache: UserProfile[] | null = null
let _usersCacheTime = 0
const USERS_CACHE_TTL = 5 * 60_000 // 5 minutes

export async function getAllUsers(): Promise<UserProfile[]> {
  if (_usersCache && Date.now() - _usersCacheTime < USERS_CACHE_TTL) {
    return _usersCache
  }
  const q = query(collection(db, COLLECTIONS.USERS), orderBy('displayName'))
  const snap = await getDocs(q)
  _usersCache = snap.docs.map((d) => d.data() as UserProfile)
  _usersCacheTime = Date.now()
  return _usersCache
}

/**
 * Real-time subscription to the users collection.
 * Used by UsersContext so new players appear automatically.
 */
export function subscribeToUsers(
  callback: (users: UserProfile[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy('displayName')
  )
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => d.data() as UserProfile)
    // Keep module cache in sync with the real-time data
    _usersCache = users
    _usersCacheTime = Date.now()
    callback(users)
  }, (err) => {
    console.warn('Users subscription error:', err.message)
    callback([])
  })
}

export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  return getUserProfile(uid)
}

// ─── Handicap History ────────────────────────────────────────────────────────

/**
 * Record a handicap snapshot. Called whenever handicap changes
 * (GHIN refresh, manual profile edit, initial setup).
 */
export async function recordHandicapSnapshot(
  uid: string,
  handicapIndex: number,
  source: 'ghin' | 'manual' | 'initial'
): Promise<void> {
  if (guardDemoWrite('Recording handicap')) return
  await addDoc(
    collection(db, COLLECTIONS.USERS, uid, 'handicapHistory'),
    {
      handicapIndex,
      source,
      recordedAt: serverTimestamp(),
    }
  )
}

/**
 * Get all handicap snapshots for a player, ordered by date.
 */
export async function getHandicapHistory(
  uid: string
): Promise<HandicapSnapshot[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS, uid, 'handicapHistory'),
    orderBy('recordedAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HandicapSnapshot))
}

// ─── Season Operations ────────────────────────────────────────────────────────
export async function getActiveSeason(): Promise<Season | null> {
  const q = query(
    collection(db, COLLECTIONS.SEASONS),
    where('isActive', '==', true),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Season
}

export async function getAllSeasons(): Promise<Season[]> {
  const q = query(
    collection(db, COLLECTIONS.SEASONS),
    orderBy('year', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Season))
}

export async function createSeason(data: Omit<Season, 'id'>): Promise<string> {
  if (guardDemoWrite('Creating seasons')) return '';
  const ref = await addDoc(collection(db, COLLECTIONS.SEASONS), data)
  return ref.id
}

export async function updateSeason(
  id: string,
  data: Partial<Season>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SEASONS, id), data as Record<string, unknown>)
}

// ─── Registration Operations ──────────────────────────────────────────────────
export async function getRegistration(
  uid: string,
  seasonId: string
): Promise<Registration | null> {
  const q = query(
    collection(db, COLLECTIONS.REGISTRATIONS),
    where('uid', '==', uid),
    where('seasonId', '==', seasonId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Registration
}

export async function createRegistration(
  data: Omit<Registration, 'id'>
): Promise<string> {
  if (guardDemoWrite('Creating registrations')) return '';
  const ref = await addDoc(collection(db, COLLECTIONS.REGISTRATIONS), {
    ...data,
    registeredAt: serverTimestamp(),
    hasPaidRegistration: false,
    monthlyPayments: {},
    forfeitedMonths: [],
    totalForfeited: 0,
  })
  return ref.id
}

export async function updateRegistration(
  id: string,
  data: Partial<Registration>
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTIONS.REGISTRATIONS, id),
    data as Record<string, unknown>
  )
}

export async function getSeasonRegistrations(
  seasonId: string
): Promise<Registration[]> {
  const q = query(
    collection(db, COLLECTIONS.REGISTRATIONS),
    where('seasonId', '==', seasonId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration))
}

// ─── Round Operations ─────────────────────────────────────────────────────────
export async function submitRound(
  data: Omit<Round, 'id' | 'submittedAt' | 'attestations' | 'isValid' | 'selectedForScoring'>
): Promise<string> {
  if (guardDemoWrite('Submitting rounds')) return '';
  // 9-hole rounds are auto-valid (practice/handicap only, no attestation needed)
  const is9Hole = data.holeCount === 9
  const ref = await addDoc(collection(db, COLLECTIONS.ROUNDS), {
    ...data,
    submittedAt: serverTimestamp(),
    attestations: [],
    isValid: is9Hole,
    selectedForScoring: false,
    notes: data.notes ?? '',
  })
  return ref.id
}

/**
 * Select a round for monthly scoring. Deselects any previously selected
 * round for the same player+month.
 */
export async function selectRoundForScoring(
  roundId: string,
  uid: string,
  month: string
): Promise<void> {
  if (guardDemoWrite('Selecting rounds')) return;

  // Deselect any currently selected round for this player+month
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('uid', '==', uid),
    where('month', '==', month)
  )
  const snap = await getDocs(q)

  let seasonId = ''
  const batch = writeBatch(db)
  for (const d of snap.docs) {
    if (!seasonId) seasonId = (d.data() as Round).seasonId
    if (d.id === roundId) {
      batch.update(d.ref, { selectedForScoring: true })
    } else if (d.data().selectedForScoring) {
      batch.update(d.ref, { selectedForScoring: false })
    }
  }
  await batch.commit()

  // Recalculate points since the selected round may have a different score
  if (seasonId && month) {
    recalculateMonthPoints(seasonId, month).catch((err) =>
      console.warn('Points recalc failed (non-critical):', err)
    )
  }
}

export async function getRoundById(id: string): Promise<Round | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.ROUNDS, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Round) : null
}

export async function getPlayerRounds(uid: string): Promise<Round[]> {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('uid', '==', uid),
    orderBy('submittedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round))
}

export async function getPlayerRoundsForMonth(
  uid: string,
  month: string
): Promise<Round[]> {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('uid', '==', uid),
    where('month', '==', month)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round))
}

export async function getSeasonRounds(seasonId: string): Promise<Round[]> {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('seasonId', '==', seasonId),
    orderBy('submittedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round))
}

export async function getMonthRounds(
  seasonId: string,
  month: string
): Promise<Round[]> {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('seasonId', '==', seasonId),
    where('month', '==', month),
    where('isValid', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round))
}

export function subscribeToPlayerRounds(
  uid: string,
  callback: (rounds: Round[]) => void,
  roundLimit = 100
) {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('uid', '==', uid),
    orderBy('submittedAt', 'desc'),
    limit(roundLimit)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round)))
  })
}

export function subscribeToMonthRounds(
  seasonId: string,
  month: string,
  callback: (rounds: Round[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('seasonId', '==', seasonId),
    where('month', '==', month),
    limit(500)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round)))
  })
}

export async function addAttestation(
  roundId: string,
  attestation: Attestation
): Promise<void> {
  if (guardDemoWrite('Attesting rounds')) return;
  const roundRef = doc(db, COLLECTIONS.ROUNDS, roundId)
  const roundSnap = await getDoc(roundRef)

  if (!roundSnap.exists()) throw new Error('Round not found')

  const round = roundSnap.data() as Round

  // Validate: can't attest own round
  if (attestation.attestorUid === round.uid) {
    throw new Error('Cannot attest your own round')
  }

  // Validate: can't attest twice
  const alreadyAttested = round.attestations.some(
    (a) => a.attestorUid === attestation.attestorUid
  )
  if (alreadyAttested) {
    throw new Error('You have already attested this round')
  }

  // Can't edit after attestation — handled by security rules too
  const newAttestations = [...round.attestations, attestation]
  const isValid = newAttestations.length >= 1
  const wasValid = round.isValid

  await updateDoc(roundRef, {
    attestations: arrayUnion(attestation),
    isValid,
  })

  // If this attestation made the round valid, recalculate month points
  if (isValid && !wasValid && round.seasonId && round.month) {
    recalculateMonthPoints(round.seasonId, round.month).catch((err) =>
      console.warn('Points recalc failed (non-critical):', err)
    )
  }
}

export async function adminOverrideRound(
  roundId: string,
  isValid: boolean,
  note: string
): Promise<void> {
  const roundSnap = await getDoc(doc(db, COLLECTIONS.ROUNDS, roundId))
  await updateDoc(doc(db, COLLECTIONS.ROUNDS, roundId), {
    isValid,
    adminOverride: true,
    adminOverrideNote: note,
  })

  // Recalculate points since validity changed
  if (roundSnap.exists()) {
    const round = roundSnap.data() as Round
    if (round.seasonId && round.month) {
      recalculateMonthPoints(round.seasonId, round.month).catch((err) =>
        console.warn('Points recalc failed (non-critical):', err)
      )
    }
  }
}

// ─── Points Operations ────────────────────────────────────────────────────────
export async function upsertPoints(
  uid: string,
  seasonId: string,
  month: string,
  data: Partial<Points>
): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.POINTS),
    where('uid', '==', uid),
    where('seasonId', '==', seasonId),
    where('month', '==', month)
  )
  const snap = await getDocs(q)

  if (snap.empty) {
    await addDoc(collection(db, COLLECTIONS.POINTS), {
      uid,
      seasonId,
      month,
      grossPoints: 0,
      netPoints: 0,
      totalMonthlyPoints: 0,
      cumulativePoints: 0,
      ...data,
    })
  } else {
    await updateDoc(snap.docs[0].ref, data as Record<string, unknown>)
  }
}

/**
 * Recalculate and persist monthly points for all players in a given month.
 *
 * Reads all valid 18-hole rounds for the month, computes net-based rankings
 * and points, then upserts a Points doc for every player who has a valid round.
 *
 * Called automatically when:
 * - A round becomes valid (attestation)
 * - A player changes their selected scoring round
 * - An admin overrides a round's validity
 *
 * Fire-and-forget — callers catch errors and log them.
 */
export async function recalculateMonthPoints(
  seasonId: string,
  month: string
): Promise<void> {
  if (guardDemoWrite('Recalculating points')) return

  const { calculateMonthlyPoints } = await import('@/lib/utils/scoring')

  // Fetch all rounds for this season + month
  const roundsSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.ROUNDS),
      where('seasonId', '==', seasonId),
      where('month', '==', month)
    )
  )
  const rounds = roundsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Round))

  // Compute points (only valid 18-hole rounds count)
  const pointsMap = calculateMonthlyPoints(rounds)

  // Batch-upsert points for every player
  // First, read existing points docs so we can update rather than duplicate
  const existingSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.POINTS),
      where('seasonId', '==', seasonId),
      where('month', '==', month)
    )
  )
  const existingByUid = new Map<string, string>() // uid → doc id
  for (const d of existingSnap.docs) {
    existingByUid.set((d.data() as Points).uid, d.id)
  }

  const batch = writeBatch(db)

  for (const [uid, pts] of pointsMap) {
    const docId = existingByUid.get(uid)
    const data = {
      uid,
      seasonId,
      month,
      grossPoints: pts.grossPoints,
      netPoints: pts.netPoints,
      totalMonthlyPoints: pts.totalMonthlyPoints,
      cumulativePoints: 0, // cumulative is recomputed by the season leaderboard
    }

    if (docId) {
      batch.update(doc(db, COLLECTIONS.POINTS, docId), data)
    } else {
      batch.set(doc(collection(db, COLLECTIONS.POINTS)), data)
    }
    existingByUid.delete(uid) // mark as processed
  }

  // Remove points docs for players who no longer have valid rounds this month
  // (e.g., admin invalidated their round)
  for (const [, docId] of existingByUid) {
    batch.delete(doc(db, COLLECTIONS.POINTS, docId))
  }

  await batch.commit()
}

export async function getSeasonPoints(seasonId: string): Promise<Points[]> {
  const q = query(
    collection(db, COLLECTIONS.POINTS),
    where('seasonId', '==', seasonId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Points)
}

export function subscribeToSeasonPoints(
  seasonId: string,
  callback: (points: Points[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.POINTS),
    where('seasonId', '==', seasonId),
    limit(500)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Points))
  })
}

// ─── Message Board ──────────────────────────────────────────────────────────

export async function sendMessage(
  uid: string,
  displayName: string,
  photoURL: string,
  text: string,
  type: 'chat' | 'lfg' = 'chat',
  mentions: string[] = []
): Promise<void> {
  if (guardDemoWrite('Sending messages')) return
  await addDoc(collection(db, COLLECTIONS.MESSAGES), {
    uid,
    displayName,
    photoURL,
    text: text.trim(),
    type,
    mentions,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToMessages(
  callback: (messages: Message[]) => void,
  messageLimit = 50
) {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    orderBy('createdAt', 'desc'),
    limit(messageLimit)
  )
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
    callback(msgs.reverse()) // oldest first for chat display
  }, (err) => {
    console.warn('Messages subscription error:', err.message)
    callback([])
  })
}

export async function deleteMessage(messageId: string): Promise<void> {
  if (guardDemoWrite('Deleting messages')) return
  await deleteDoc(doc(db, COLLECTIONS.MESSAGES, messageId))
}

/**
 * Toggle a reaction on a message. Returns the author's uid and whether
 * the reaction was newly added (vs. removed) so callers can notify the author.
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  uid: string
): Promise<{ added: boolean; authorUid: string } | null> {
  if (guardDemoWrite('Reacting to messages')) return null
  const ref = doc(db, COLLECTIONS.MESSAGES, messageId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as Message
  const existing = data.reactions ?? {}
  const list = existing[emoji] ?? []
  const hasReacted = list.includes(uid)
  const nextList = hasReacted ? list.filter((u) => u !== uid) : [...list, uid]

  const nextReactions: Record<string, string[]> = { ...existing }
  if (nextList.length === 0) {
    delete nextReactions[emoji]
  } else {
    nextReactions[emoji] = nextList
  }

  await updateDoc(ref, { reactions: nextReactions })
  return { added: !hasReacted, authorUid: data.uid }
}

// ─── Looking For Partner ────────────────────────────────────────────────────

export async function setLookingForPartner(
  uid: string,
  looking: boolean,
  note = ''
): Promise<void> {
  if (guardDemoWrite('Updating LFG status')) return
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    lookingForPartner: looking,
    lookingForPartnerNote: looking ? note.trim() : '',
    lookingForPartnerAt: looking ? serverTimestamp() : null,
  })
}

export function subscribeToLFGPlayers(
  callback: (players: UserProfile[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('lookingForPartner', '==', true)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as UserProfile))
  }, (err) => {
    console.warn('LFG subscription error:', err.message)
    callback([])
  })
}

// ─── Notifications ──────────────────────────────────────────────────────────

/**
 * Create a notification. Use recipientUid='all' for broadcasts.
 */
export async function createNotification(data: {
  recipientUid: string
  type: NotificationType
  title: string
  body: string
  link?: string
  actorUid?: string
  actorName?: string
  actorPhotoURL?: string
}): Promise<void> {
  if (guardDemoWrite('Notifications')) return
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

/**
 * Send a notification to every registered user (individual docs, not broadcast).
 * This ensures per-user read tracking works cleanly.
 */
export async function notifyAllPlayers(
  data: {
    type: NotificationType
    title: string
    body: string
    link?: string
    actorUid?: string
    actorName?: string
    actorPhotoURL?: string
  },
  excludeUid?: string
): Promise<void> {
  if (guardDemoWrite('Notifications')) return
  const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS))
  const batch = writeBatch(db)
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id
    if (uid === excludeUid) continue
    const ref = doc(collection(db, COLLECTIONS.NOTIFICATIONS))
    batch.set(ref, {
      ...data,
      recipientUid: uid,
      createdAt: Timestamp.now(),
    })
  }
  await batch.commit()
}

/**
 * Subscribe to notifications for a specific user.
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void,
  notifLimit = 30
) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('recipientUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(notifLimit)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)))
  }, (err) => {
    console.warn('Notification subscription error:', err.message)
    callback([])
  })
}

/**
 * Mark all notifications as read by updating the user's read cursor.
 */
export async function markNotificationsRead(uid: string): Promise<void> {
  if (guardDemoWrite('Marking notifications read')) return
  await setDoc(doc(db, COLLECTIONS.NOTIFICATION_READS, uid), {
    lastReadAt: serverTimestamp(),
  })
}

export async function dismissNotification(notifId: string): Promise<void> {
  if (guardDemoWrite('Dismissing notification')) return
  await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId))
}

/**
 * Subscribe to the user's read cursor.
 */
export function subscribeToReadCursor(
  uid: string,
  callback: (lastReadAt: Date | null) => void
) {
  return onSnapshot(doc(db, COLLECTIONS.NOTIFICATION_READS, uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      const ts = data.lastReadAt as Timestamp | null
      callback(ts ? ts.toDate() : null)
    } else {
      callback(null)
    }
  }, (err) => {
    console.warn('Read cursor subscription error:', err.message)
    callback(null)
  })
}

// ─── Payouts & Month Closes ──────────────────────────────────────────────────

import type { PayoutPreview, MonthPayoutResult } from '../utils/payouts'

/**
 * Check if a month has already been closed.
 */
export async function getMonthClose(
  seasonId: string,
  month: string
): Promise<MonthClose | null> {
  const q = query(
    collection(db, COLLECTIONS.MONTH_CLOSES),
    where('seasonId', '==', seasonId),
    where('month', '==', month),
    limit(1)
  )
  const snap = await getDocs(q)
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as MonthClose)
}

/**
 * Close a month: batch-write all payouts and the month close record atomically.
 */
export async function closeMonth(
  seasonId: string,
  month: string,
  closedByUid: string,
  result: MonthPayoutResult
): Promise<void> {
  if (guardDemoWrite('Closing months')) return

  // Check not already closed
  const existing = await getMonthClose(seasonId, month)
  if (existing) throw new Error('MONTH_ALREADY_CLOSED')

  const batch = writeBatch(db)
  const now = Timestamp.now()

  // Write each player payout
  for (const p of result.payouts) {
    const ref = doc(collection(db, COLLECTIONS.PAYOUTS))
    batch.set(ref, {
      uid: p.uid,
      seasonId,
      month,
      grossPayout: p.grossPayout,
      netPayout: p.netPayout,
      savesPayout: p.savesPayout,
      par3Payout: p.par3Payout,
      totalPayout: p.totalPayout,
      grossRank: p.grossRank,
      netRank: p.netRank,
      sandSaves: p.sandSaves,
      par3Pars: p.par3Pars,
      doubleDipResolution: p.doubleDipResolution,
      closedAt: now,
      closedByUid,
    })
  }

  // Write month close record
  const closeRef = doc(collection(db, COLLECTIONS.MONTH_CLOSES))
  batch.set(closeRef, {
    seasonId,
    month,
    totalDuesCollected: result.totalDuesCollected,
    seasonContribution: result.seasonContribution,
    performancePurse: result.performancePurse,
    netPool: result.netPool,
    grossPool: result.grossPool,
    savesPool: result.savesPool,
    par3Pool: result.par3Pool,
    perSaveValue: result.perSaveValue,
    perPar3Value: result.perPar3Value,
    totalSaves: result.totalSaves,
    totalPar3Pars: result.totalPar3Pars,
    playerCount: result.playerCount,
    closedAt: now,
    closedByUid,
  })

  await batch.commit()
}

/**
 * Get all payouts for a player in a season.
 */
export function subscribeToPlayerPayouts(
  uid: string,
  seasonId: string,
  callback: (payouts: Payout[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.PAYOUTS),
    where('uid', '==', uid),
    where('seasonId', '==', seasonId)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payout)))
  }, (err) => {
    console.warn('Payouts subscription error:', err.message)
    callback([])
  })
}

/**
 * Get all payouts for a month (admin view).
 */
export async function getMonthPayouts(
  seasonId: string,
  month: string
): Promise<Payout[]> {
  const q = query(
    collection(db, COLLECTIONS.PAYOUTS),
    where('seasonId', '==', seasonId),
    where('month', '==', month)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payout))
}

/**
 * Get all month closes for a season (to show which months are finalized).
 */
export async function getSeasonMonthCloses(
  seasonId: string
): Promise<MonthClose[]> {
  const q = query(
    collection(db, COLLECTIONS.MONTH_CLOSES),
    where('seasonId', '==', seasonId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MonthClose))
}

// ─── Course Directory ───────────────────────────────────────────────────────

export async function addCourse(
  data: Omit<Course, 'id' | 'addedAt' | 'favoritedBy'>
): Promise<string> {
  if (guardDemoWrite('Adding courses')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.COURSES), {
    ...data,
    addedAt: serverTimestamp(),
    favoritedBy: [],
  })
  return ref.id
}

export function subscribeToCourses(
  callback: (courses: Course[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.COURSES),
    orderBy('name', 'asc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)))
  }, (err) => {
    console.warn('Courses subscription error:', err.message)
    callback([])
  })
}

export async function toggleCourseFavorite(
  courseId: string,
  uid: string,
  isFavorited: boolean
): Promise<void> {
  if (guardDemoWrite('Favoriting courses')) return
  const ref = doc(db, COLLECTIONS.COURSES, courseId)
  if (isFavorited) {
    await updateDoc(ref, { favoritedBy: arrayUnion(uid) })
  } else {
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const course = snap.data() as Course
    await updateDoc(ref, {
      favoritedBy: course.favoritedBy.filter((id) => id !== uid),
    })
  }
}

export async function deleteCourse(courseId: string): Promise<void> {
  if (guardDemoWrite('Deleting courses')) return
  await deleteDoc(doc(db, COLLECTIONS.COURSES, courseId))
}

// ─── Course Reviews ─────────────────────────────────────────────────────────

export async function addCourseReview(
  data: Omit<CourseReview, 'id' | 'createdAt'>
): Promise<void> {
  if (guardDemoWrite('Adding reviews')) return
  await addDoc(
    collection(db, COLLECTIONS.COURSES, data.courseId, 'reviews'),
    { ...data, createdAt: serverTimestamp() }
  )
}

export function subscribeToCourseReviews(
  courseId: string,
  callback: (reviews: CourseReview[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.COURSES, courseId, 'reviews'),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseReview)))
  }, (err) => {
    console.warn('Reviews subscription error:', err.message)
    callback([])
  })
}

export async function deleteCourseReview(
  courseId: string,
  reviewId: string
): Promise<void> {
  if (guardDemoWrite('Deleting reviews')) return
  await deleteDoc(doc(db, COLLECTIONS.COURSES, courseId, 'reviews', reviewId))
}

// ─── Polls ──────────────────────────────────────────────────────────────────

// Admin: create a poll + initial options
export async function createPoll(
  data: Omit<Poll, 'id' | 'createdAt'>,
  initialOptions: string[]
): Promise<string> {
  if (guardDemoWrite('Creating polls')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.POLLS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Write initial options
  for (const text of initialOptions) {
    await addDoc(collection(db, COLLECTIONS.POLLS, ref.id, 'options'), {
      text,
      submittedBy: data.createdBy,
      createdAt: serverTimestamp(),
    })
  }
  return ref.id
}

// Admin: close a poll
export async function closePoll(pollId: string): Promise<void> {
  if (guardDemoWrite('Closing polls')) return
  await updateDoc(doc(db, COLLECTIONS.POLLS, pollId), { status: 'closed' })
}

// Subscribe to all polls
export function subscribeToPolls(callback: (polls: Poll[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.POLLS),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Poll)))
  }, (err) => {
    console.warn('Polls subscription error:', err.message)
    callback([])
  })
}

// Subscribe to poll options
export function subscribeToPollOptions(
  pollId: string,
  callback: (options: PollOptionType[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.POLLS, pollId, 'options'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PollOptionType)))
  }, (err) => {
    console.warn('Poll options error:', err.message)
    callback([])
  })
}

// Subscribe to poll votes
export function subscribeToPollVotes(
  pollId: string,
  callback: (votes: Map<string, PollVote>) => void
) {
  return onSnapshot(
    collection(db, COLLECTIONS.POLLS, pollId, 'votes'),
    (snap) => {
      const map = new Map<string, PollVote>()
      snap.docs.forEach((d) => map.set(d.id, d.data() as PollVote))
      callback(map)
    },
    (err) => {
      console.warn('Poll votes error:', err.message)
      callback(new Map())
    }
  )
}

// Cast a vote (doc ID = uid for one-vote-per-member)
export async function castVote(
  pollId: string,
  uid: string,
  optionId: string
): Promise<void> {
  if (guardDemoWrite('Voting')) return
  await setDoc(doc(db, COLLECTIONS.POLLS, pollId, 'votes', uid), {
    optionId,
    castAt: serverTimestamp(),
  })
}

// Add a member-suggested option
export async function addPollOption(
  pollId: string,
  text: string,
  submittedBy: string
): Promise<void> {
  if (guardDemoWrite('Adding poll options')) return
  await addDoc(collection(db, COLLECTIONS.POLLS, pollId, 'options'), {
    text: text.trim(),
    submittedBy,
    createdAt: serverTimestamp(),
  })
}

// Subscribe to poll comments
export function subscribeToPollComments(
  pollId: string,
  callback: (comments: PollComment[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.POLLS, pollId, 'comments'),
    orderBy('createdAt', 'desc'),
    limit(100)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PollComment)))
  }, (err) => {
    console.warn('Poll comments error:', err.message)
    callback([])
  })
}

// Add a comment
export async function addPollComment(
  pollId: string,
  userId: string,
  text: string
): Promise<void> {
  if (guardDemoWrite('Commenting')) return
  await addDoc(collection(db, COLLECTIONS.POLLS, pollId, 'comments'), {
    userId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
}


// ─── Elections ──────────────────────────────────────────────────────────────

export async function createElection(
  data: Omit<Election, 'id' | 'createdAt'>
): Promise<string> {
  if (guardDemoWrite('Creating elections')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.POLLS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToElections(callback: (elections: Election[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.POLLS),
    where('type', '==', 'election'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Election)))
  }, (err) => {
    console.warn('Elections subscription error:', err.message)
    callback([])
  })
}

export async function updateElectionStatus(
  pollId: string,
  status: 'nomination' | 'active' | 'closed'
): Promise<void> {
  if (guardDemoWrite('Updating elections')) return
  await updateDoc(doc(db, COLLECTIONS.POLLS, pollId), { status })
}

// Candidates subcollection
export function subscribeToCandidates(
  pollId: string,
  callback: (candidates: Candidate[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.POLLS, pollId, 'candidates'),
    orderBy('nominatedAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Candidate)))
  }, (err) => {
    console.warn('Candidates error:', err.message)
    callback([])
  })
}

export async function nominateCandidate(
  pollId: string,
  userId: string,
  nominatedBy: string
): Promise<void> {
  if (guardDemoWrite('Nominating')) return
  await addDoc(collection(db, COLLECTIONS.POLLS, pollId, 'candidates'), {
    userId,
    nominatedBy,
    acceptedNomination: false,
    nominatedAt: serverTimestamp(),
    acceptedAt: null,
    declinedAt: null,
  })
}

export async function respondToNomination(
  pollId: string,
  candidateId: string,
  accept: boolean
): Promise<void> {
  if (guardDemoWrite('Responding to nomination')) return
  await updateDoc(
    doc(db, COLLECTIONS.POLLS, pollId, 'candidates', candidateId),
    {
      acceptedNomination: accept,
      ...(accept
        ? { acceptedAt: serverTimestamp(), declinedAt: null }
        : { declinedAt: serverTimestamp(), acceptedAt: null }),
    }
  )
}

// Election votes (reuses same votes subcollection as polls)
export async function castElectionVote(
  pollId: string,
  uid: string,
  candidateId: string
): Promise<void> {
  if (guardDemoWrite('Voting')) return
  await setDoc(doc(db, COLLECTIONS.POLLS, pollId, 'votes', uid), {
    optionId: candidateId,
    castAt: serverTimestamp(),
  })
}

// Current Officers
export function subscribeToCurrentOfficers(
  callback: (officers: CurrentOfficer[]) => void
) {
  return onSnapshot(
    collection(db, COLLECTIONS.CURRENT_OFFICERS),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CurrentOfficer)))
    },
    (err) => {
      console.warn('Officers error:', err.message)
      callback([])
    }
  )
}

// Close election: tally votes, assign role, write officer record
export async function closeElection(
  election: Election,
  closedByUid: string
): Promise<{ winnerId: string; winnerName: string } | null> {
  if (guardDemoWrite('Closing elections')) return null

  // 1. Get all votes
  const votesSnap = await getDocs(
    collection(db, COLLECTIONS.POLLS, election.id, 'votes')
  )
  if (votesSnap.empty) return null

  // 2. Tally votes by candidate
  const tally = new Map<string, number>()
  votesSnap.docs.forEach((d) => {
    const v = d.data() as PollVote
    tally.set(v.optionId, (tally.get(v.optionId) ?? 0) + 1)
  })

  // 3. Find winner (most votes)
  let winnerId = ''
  let maxVotes = 0
  for (const [candidateId, count] of tally) {
    if (count > maxVotes) {
      maxVotes = count
      winnerId = candidateId
    }
  }

  // 4. Get the candidate doc to find the userId
  const candidateSnap = await getDoc(
    doc(db, COLLECTIONS.POLLS, election.id, 'candidates', winnerId)
  )
  if (!candidateSnap.exists()) return null
  const winnerUserId = (candidateSnap.data() as Candidate).userId

  // 5. Get winner's name
  const winnerProfile = await getUserProfile(winnerUserId)
  const winnerName = winnerProfile?.displayName ?? 'Unknown'

  const batch = writeBatch(db)
  const now = Timestamp.now()

  // 6. Remove role from previous holder
  const officersSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.CURRENT_OFFICERS),
      where('officeKey', '==', election.officeKey)
    )
  )
  for (const od of officersSnap.docs) {
    const prevUserId = (od.data() as CurrentOfficer).userId
    // Remove role from previous holder's user doc
    const prevProfile = await getUserProfile(prevUserId)
    if (prevProfile?.roles?.includes(election.officeKey)) {
      batch.update(doc(db, COLLECTIONS.USERS, prevUserId), {
        roles: (prevProfile.roles ?? []).filter((r) => r !== election.officeKey),
      })
    }
    batch.delete(od.ref)
  }

  // 7. Add role to winner's user doc
  const winnerRoles = winnerProfile?.roles ?? []
  if (!winnerRoles.includes(election.officeKey)) {
    batch.update(doc(db, COLLECTIONS.USERS, winnerUserId), {
      roles: [...winnerRoles, election.officeKey],
    })
  }

  // 8. Write currentOfficers record
  batch.set(doc(collection(db, COLLECTIONS.CURRENT_OFFICERS)), {
    officeKey: election.officeKey,
    officeTitle: election.officeTitle,
    userId: winnerUserId,
    termStartedAt: now,
    electionId: election.id,
  })

  // 9. Mark election as closed
  batch.update(doc(db, COLLECTIONS.POLLS, election.id), { status: 'closed' })

  await batch.commit()

  return { winnerId: winnerUserId, winnerName }
}

// ─── Flagged Rounds ─────────────────────────────────────────────────────────

export async function flagRound(
  roundId: string,
  flaggedBy: string,
  reason: string
): Promise<void> {
  if (guardDemoWrite('Flagging rounds')) return
  await addDoc(collection(db, COLLECTIONS.FLAGGED_ROUNDS), {
    roundId,
    flaggedBy,
    reason: reason.trim(),
    flaggedAt: serverTimestamp(),
  })
}

export function subscribeToFlaggedRounds(
  callback: (flags: FlaggedRound[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.FLAGGED_ROUNDS),
    orderBy('flaggedAt', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FlaggedRound)))
  }, (err) => {
    console.warn('Flagged rounds error:', err.message)
    callback([])
  })
}

export async function dismissFlag(flagId: string): Promise<void> {
  if (guardDemoWrite('Dismissing flags')) return
  await deleteDoc(doc(db, COLLECTIONS.FLAGGED_ROUNDS, flagId))
}

// ─── Announcements ──────────────────────────────────────────────────────────

export async function postAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt'>
): Promise<void> {
  if (guardDemoWrite('Posting announcements')) return
  await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Announcement>
): Promise<void> {
  if (guardDemoWrite('Updating announcements')) return
  await updateDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id), data as Record<string, unknown>)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (guardDemoWrite('Deleting announcements')) return
  await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id))
}

export function subscribeToAnnouncements(
  callback: (announcements: Announcement[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.ANNOUNCEMENTS),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)))
  }, (err) => {
    console.warn('Announcements error:', err.message)
    callback([])
  })
}

// ─── Scheduled Rounds ───────────────────────────────────────────────────────

export async function createScheduledRound(
  data: Omit<ScheduledRound, 'id' | 'createdAt'>
): Promise<string> {
  if (guardDemoWrite('Scheduling rounds')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.SCHEDULED_ROUNDS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToScheduledRounds(
  callback: (rounds: ScheduledRound[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.SCHEDULED_ROUNDS),
    orderBy('date', 'asc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduledRound)))
  }, (err) => {
    console.warn('Scheduled rounds error:', err.message)
    callback([])
  })
}

export async function joinScheduledRound(
  roundId: string,
  uid: string
): Promise<void> {
  if (guardDemoWrite('Joining rounds')) return
  const ref = doc(db, COLLECTIONS.SCHEDULED_ROUNDS, roundId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as ScheduledRound
  if (data.players.includes(uid)) return
  if (data.players.length >= data.spots) return
  await updateDoc(ref, { players: [...data.players, uid] })
}

export async function leaveScheduledRound(
  roundId: string,
  uid: string
): Promise<void> {
  if (guardDemoWrite('Leaving rounds')) return
  const ref = doc(db, COLLECTIONS.SCHEDULED_ROUNDS, roundId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as ScheduledRound
  await updateDoc(ref, { players: data.players.filter((id) => id !== uid) })
}

export async function deleteScheduledRound(id: string): Promise<void> {
  if (guardDemoWrite('Deleting scheduled rounds')) return
  await deleteDoc(doc(db, COLLECTIONS.SCHEDULED_ROUNDS, id))
}

// ─── Exhibition Sessions ────────────────────────────────────────────────────

export async function createExhibitionSession(
  data: Omit<ExhibitionSession, 'id' | 'createdAt' | 'startedAt' | 'completedAt'>
): Promise<string> {
  if (guardDemoWrite('Creating exhibition')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.EXHIBITION_SESSIONS), {
    ...data,
    createdAt: serverTimestamp(),
    startedAt: null,
    completedAt: null,
  })
  return ref.id
}

export async function getExhibitionSession(
  sessionId: string
): Promise<ExhibitionSession | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as ExhibitionSession) : null
}

export async function findSessionByInviteCode(
  inviteCode: string
): Promise<ExhibitionSession | null> {
  const q = query(
    collection(db, COLLECTIONS.EXHIBITION_SESSIONS),
    where('inviteCode', '==', inviteCode.toUpperCase()),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as ExhibitionSession
}

export function subscribeToExhibitionSession(
  sessionId: string,
  callback: (session: ExhibitionSession | null) => void
) {
  return onSnapshot(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId),
    (snap) => {
      callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as ExhibitionSession) : null)
    },
    (err) => {
      console.warn('Exhibition session subscription error:', err.message)
      callback(null)
    }
  )
}

export async function updateExhibitionSession(
  sessionId: string,
  data: Partial<ExhibitionSession>
): Promise<void> {
  if (guardDemoWrite('Updating exhibition')) return
  await updateDoc(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId),
    data as Record<string, unknown>
  )
}

export async function deleteExhibitionSession(sessionId: string): Promise<void> {
  if (guardDemoWrite('Deleting exhibition')) return
  await deleteDoc(doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId))
}

/**
 * List sessions a user is part of (host or player).
 * Client filters: returns all sessions where user is host OR has a player doc.
 */
export async function getUserExhibitionSessions(
  uid: string
): Promise<ExhibitionSession[]> {
  // Sessions I host
  const hostedQ = query(
    collection(db, COLLECTIONS.EXHIBITION_SESSIONS),
    where('hostId', '==', uid)
  )
  const hostedSnap = await getDocs(hostedQ)
  const hosted = hostedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ExhibitionSession))
  // Simpler: just return hosted for now; joined sessions are accessed via invite/share
  return hosted
}

// ─── Exhibition Players (subcollection) ────────────────────────────────────

export async function joinExhibitionSession(
  sessionId: string,
  player: Omit<ExhibitionPlayer, 'joinedAt'>
): Promise<void> {
  if (guardDemoWrite('Joining exhibition')) return
  await setDoc(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'players', player.userId),
    { ...player, joinedAt: serverTimestamp() }
  )
}

export async function updateExhibitionPlayer(
  sessionId: string,
  userId: string,
  data: Partial<ExhibitionPlayer>
): Promise<void> {
  if (guardDemoWrite('Updating exhibition player')) return
  await updateDoc(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'players', userId),
    data as Record<string, unknown>
  )
}

export async function removeExhibitionPlayer(
  sessionId: string,
  userId: string
): Promise<void> {
  if (guardDemoWrite('Removing exhibition player')) return
  await deleteDoc(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'players', userId)
  )
}

export function subscribeToExhibitionPlayers(
  sessionId: string,
  callback: (players: ExhibitionPlayer[]) => void
) {
  return onSnapshot(
    collection(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'players'),
    (snap) => {
      callback(snap.docs.map((d) => d.data() as ExhibitionPlayer))
    },
    (err) => {
      console.warn('Exhibition players error:', err.message)
      callback([])
    }
  )
}

// ─── Exhibition Card Log (subcollection) ────────────────────────────────────

export async function logCardEvent(
  sessionId: string,
  entry: Omit<ExhibitionCardLogEntry, 'id'>
): Promise<void> {
  if (guardDemoWrite('Logging card')) return
  await addDoc(
    collection(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'cardLog'),
    entry
  )
}

export function subscribeToCardLog(
  sessionId: string,
  callback: (entries: ExhibitionCardLogEntry[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'cardLog'),
    orderBy('hole', 'asc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExhibitionCardLogEntry)))
  }, (err) => {
    console.warn('Card log error:', err.message)
    callback([])
  })
}

export async function overrideCardEvent(
  sessionId: string,
  entryId: string
): Promise<void> {
  if (guardDemoWrite('Overriding card')) return
  await updateDoc(
    doc(db, COLLECTIONS.EXHIBITION_SESSIONS, sessionId, 'cardLog', entryId),
    { overriddenByHost: true, resolvedAt: serverTimestamp() }
  )
}

// ─── Cached Courses (GolfCourseAPI hole-by-hole data) ──────────────────────

export async function findCachedCourseByApiId(
  apiId: number
): Promise<CachedCourse | null> {
  const q = query(
    collection(db, COLLECTIONS.CACHED_COURSES),
    where('golfcourseapi_id', '==', apiId),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as CachedCourse
}

export async function getCachedCourse(courseId: string): Promise<CachedCourse | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CACHED_COURSES, courseId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CachedCourse) : null
}

export async function importCachedCourse(
  data: Omit<CachedCourse, 'id' | 'importedAt' | 'lastRefreshedAt'>
): Promise<string> {
  if (guardDemoWrite('Importing course')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.CACHED_COURSES), {
    ...data,
    importedAt: serverTimestamp(),
    lastRefreshedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCachedCourse(
  courseId: string,
  data: Partial<CachedCourse>
): Promise<void> {
  if (guardDemoWrite('Updating cached course')) return
  await updateDoc(
    doc(db, COLLECTIONS.CACHED_COURSES, courseId),
    { ...data, lastRefreshedAt: serverTimestamp() } as Record<string, unknown>
  )
}

export async function searchCachedCourses(queryStr: string): Promise<CachedCourse[]> {
  // Firestore doesn't support case-insensitive contains natively.
  // We fetch all courses and filter client-side. For a small cache (<500) this is fine.
  const snap = await getDocs(collection(db, COLLECTIONS.CACHED_COURSES))
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CachedCourse))
  const q = queryStr.toLowerCase().trim()
  return all
    .filter((c) =>
      c.courseName.toLowerCase().includes(q) ||
      c.clubName.toLowerCase().includes(q)
    )
    .slice(0, 10)
}

// ─── Feedback ───────────────────────────────────────────────────────────────

export async function createFeedback(
  data: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'respondedAt' | 'adminResponse' | 'status'>
): Promise<string> {
  if (guardDemoWrite('Submitting feedback')) return ''
  const ref = await addDoc(collection(db, COLLECTIONS.FEEDBACK), {
    ...data,
    status: 'new',
    adminResponse: '',
    respondedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateFeedback(
  id: string,
  data: Partial<Feedback>
): Promise<void> {
  if (guardDemoWrite('Updating feedback')) return
  await updateDoc(doc(db, COLLECTIONS.FEEDBACK, id), {
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>)
}

export async function deleteFeedback(id: string): Promise<void> {
  if (guardDemoWrite('Deleting feedback')) return
  await deleteDoc(doc(db, COLLECTIONS.FEEDBACK, id))
}

export async function respondToFeedback(
  id: string,
  adminResponse: string,
  status: Feedback['status']
): Promise<void> {
  if (guardDemoWrite('Responding to feedback')) return
  await updateDoc(doc(db, COLLECTIONS.FEEDBACK, id), {
    adminResponse,
    status,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToAllFeedback(
  callback: (items: Feedback[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.FEEDBACK),
    orderBy('createdAt', 'desc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Feedback)))
  }, (err) => {
    console.warn('Feedback error:', err.message)
    callback([])
  })
}

export function subscribeToUserFeedback(
  uid: string,
  callback: (items: Feedback[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.FEEDBACK),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Feedback)))
  }, (err) => {
    console.warn('User feedback error:', err.message)
    callback([])
  })
}
