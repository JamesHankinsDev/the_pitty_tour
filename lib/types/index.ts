import { Timestamp } from 'firebase/firestore'

// ─── User ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  handicapIndex: number
  venmoHandle: string
  qrCode: string // their uid encoded as QR
  memberSince: Timestamp
  totalPoints: number
  isAdmin: boolean
  inviteToken: string // token used at registration; '' for seed/legacy users
}

// ─── Invite ───────────────────────────────────────────────────────────────────
export interface Invite {
  token: string           // same as the Firestore document ID
  createdAt: Timestamp
  createdByUid: string
  expiresAt: Timestamp
  usedAt: Timestamp | null
  usedByUid: string | null
  usedByEmail: string | null
  note: string            // optional label, e.g. "For James H."
  status: 'pending' | 'used' | 'expired'
}

// ─── Season ──────────────────────────────────────────────────────────────────
export interface Season {
  id: string
  year: number
  startMonth: number // April = 4
  endMonth: number   // November = 11
  registrationFee: number  // e.g. 100
  monthlyDue: number       // e.g. 50
  isActive: boolean
}

// ─── Registration ────────────────────────────────────────────────────────────
export interface Registration {
  id: string
  uid: string
  seasonId: string
  registeredAt: Timestamp
  hasPaidRegistration: boolean
  monthlyPayments: { [month: string]: boolean } // e.g. { "2024-04": true }
  forfeitedMonths: string[] // months where player didn't submit a score
  totalForfeited: number    // dollar amount forfeited to prize pool
}

// ─── Attestation ─────────────────────────────────────────────────────────────
export interface Attestation {
  attestorUid: string
  attestorName: string
  attestedAt: Timestamp
  method: 'qr_scan'
}

// ─── Round ───────────────────────────────────────────────────────────────────
export interface Round {
  id: string
  uid: string           // player who submitted
  seasonId: string
  month: string         // "2024-05"
  courseName: string
  courseRating: number
  slopeRating: number
  grossScore: number
  netScore: number      // auto-calculated
  differentialScore: number // auto-calculated
  attestations: Attestation[]
  isValid: boolean      // true when 2+ attestations from different members
  submittedAt: Timestamp
  notes: string
  // Admin override
  adminOverride?: boolean
  adminOverrideNote?: string
}

// ─── Points ──────────────────────────────────────────────────────────────────
export interface Points {
  uid: string
  seasonId: string
  month: string
  grossPoints: number
  netPoints: number
  totalMonthlyPoints: number
  cumulativePoints: number
}

// ─── Leaderboard Entry ───────────────────────────────────────────────────────
export interface LeaderboardEntry {
  uid: string
  displayName: string
  photoURL: string
  grossScore?: number
  netScore?: number
  grossPoints: number
  netPoints: number
  totalPoints: number
  roundsPlayed: number
  rank?: number
}

// ─── Monthly Leaderboard ─────────────────────────────────────────────────────
export interface MonthlyLeaderboard {
  month: string
  grossStandings: LeaderboardEntry[]
  netStandings: LeaderboardEntry[]
  prizePool: number
}

// ─── Prize Pool ──────────────────────────────────────────────────────────────
export interface PrizePoolSummary {
  seasonId: string
  totalRegistrationFees: number
  totalMonthlyDues: number
  totalForfeits: number
  totalPool: number
  monthlyPools: { [month: string]: MonthlyPrizePool }
  championshipPool: number
}

export interface MonthlyPrizePool {
  month: string
  totalPaid: number
  totalForfeited: number
  totalPool: number
  breakdown: PrizeBreakdown[]
}

export interface PrizeBreakdown {
  position: string  // e.g. "1st Gross"
  percentage: number
  amount: number
  winnerUid?: string
  winnerName?: string
}

// ─── Scoring Constants ───────────────────────────────────────────────────────
export const MONTHLY_PRIZE_PERCENTAGES = {
  grossFirst: 0.35,
  grossSecond: 0.15,
  grossThird: 0.10,
  netFirst: 0.25,
  netSecond: 0.10,
  netThird: 0.05,
}

export const CHAMPIONSHIP_PRIZE_PERCENTAGES = {
  grossFirst: 0.30,
  grossSecond: 0.15,
  grossThird: 0.10,
  netFirst: 0.25,
  netSecond: 0.12,
  netThird: 0.08,
}

export const POINTS_BY_RANK: Record<number, number> = {
  1: 100,
  2: 85,
  3: 75,
  4: 65,
  5: 55,
  6: 50,
  7: 45,
  8: 40,
  9: 35,
  10: 30,
}

export const POINTS_DEFAULT = 20 // 11th place and beyond
