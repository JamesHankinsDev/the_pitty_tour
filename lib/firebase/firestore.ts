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
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type {
  UserProfile,
  Season,
  Registration,
  Round,
  Points,
  Attestation,
} from '../types'

// ─── Collections ─────────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  SEASONS: 'seasons',
  REGISTRATIONS: 'registrations',
  ROUNDS: 'rounds',
  POINTS: 'points',
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
  const docRef = doc(db, COLLECTIONS.USERS, uid)
  await updateDoc(docRef, data as Record<string, unknown>)
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

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, COLLECTIONS.USERS), orderBy('displayName'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as UserProfile)
}

export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  return getUserProfile(uid)
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
  data: Omit<Round, 'id' | 'submittedAt' | 'attestations' | 'isValid'>
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.ROUNDS), {
    ...data,
    submittedAt: serverTimestamp(),
    attestations: [],
    isValid: false,
    notes: data.notes ?? '',
  })
  return ref.id
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
  callback: (rounds: Round[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.ROUNDS),
    where('uid', '==', uid),
    orderBy('submittedAt', 'desc')
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
    where('month', '==', month)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Round)))
  })
}

export async function addAttestation(
  roundId: string,
  attestation: Attestation
): Promise<void> {
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
  const isValid = newAttestations.length >= 2

  await updateDoc(roundRef, {
    attestations: arrayUnion(attestation),
    isValid,
  })
}

export async function adminOverrideRound(
  roundId: string,
  isValid: boolean,
  note: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.ROUNDS, roundId), {
    isValid,
    adminOverride: true,
    adminOverrideNote: note,
  })
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
    where('seasonId', '==', seasonId)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Points))
  })
}
