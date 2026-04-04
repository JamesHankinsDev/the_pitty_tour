import { Timestamp } from 'firebase/firestore'

// ─── Handicap History ────────────────────────────────────────────────────────
export interface HandicapSnapshot {
  id: string
  handicapIndex: number
  source: 'ghin' | 'manual' | 'initial'
  recordedAt: Timestamp
}

// ─── User ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  handicapIndex: number
  ghinNumber: string // GHIN member ID for automatic handicap lookup; '' if not linked
  venmoHandle: string
  qrCode: string // their uid encoded as QR
  memberSince: Timestamp
  totalPoints: number
  isAdmin: boolean
  inviteToken: string // token used at registration; '' for seed/legacy users
  roles?: string[]   // e.g. ['treasurer', 'master_at_arms']
  lookingForPartner?: boolean        // true = actively seeking a playing partner
  lookingForPartnerNote?: string     // optional context e.g. "Saturday AM at Bethpage"
  lookingForPartnerAt?: Timestamp    // when the flag was set
}

// ─── Message Board ──────────────────────────────────────────────────────────
export interface Message {
  id: string
  uid: string
  displayName: string
  photoURL: string
  text: string
  createdAt: Timestamp
  type: 'chat' | 'lfg'  // lfg = looking-for-group announcement
}

// ─── Notifications ──────────────────────────────────────────────────────────
export type NotificationType =
  | 'round_submitted'    // a player submitted a new round
  | 'round_attested'     // your round was attested
  | 'round_validated'    // your round is now valid
  | 'lfg'               // someone is looking for a partner
  | 'leaderboard_change' // your rank changed
  | 'admin'             // admin announcement

export interface Notification {
  id: string
  recipientUid: string    // specific uid, or 'all' for broadcast
  type: NotificationType
  title: string
  body: string
  link?: string           // optional deep link, e.g. '/dashboard/leaderboard'
  actorUid?: string       // who triggered it
  actorName?: string
  actorPhotoURL?: string
  createdAt: Timestamp
}

/** Per-user read cursor — stored in notificationReads/{uid} */
export interface NotificationReadCursor {
  lastReadAt: Timestamp
}

// ─── Payouts ────────────────────────────────────────────────────────────────
export interface Payout {
  id: string
  uid: string
  seasonId: string
  month: string
  grossPayout: number
  netPayout: number
  savesPayout: number
  par3Payout: number
  totalPayout: number
  grossRank: number | null
  netRank: number | null
  sandSaves: number
  par3Pars: number
  doubleDipResolution: 'gross' | 'net' | 'none'
  closedAt: Timestamp
  closedByUid: string
}

export interface MonthClose {
  id: string
  seasonId: string
  month: string
  totalDuesCollected: number
  seasonContribution: number
  performancePurse: number
  netPool: number
  grossPool: number
  savesPool: number
  par3Pool: number
  perSaveValue: number
  perPar3Value: number
  totalSaves: number
  totalPar3Pars: number
  playerCount: number
  closedAt: Timestamp
  closedByUid: string
}

// ─── Course Directory ───────────────────────────────────────────────────────
export interface Course {
  id: string
  name: string
  city: string
  state: string
  holes: 9 | 18 | 27 | 36
  greenFeeMin: number       // typical low end, e.g. 35
  greenFeeMax: number       // typical high end, e.g. 75
  courseRating?: number
  slopeRating?: number
  bookingUrl?: string       // link to book tee times
  websiteUrl?: string
  notes: string
  addedByUid: string
  addedByName: string
  addedAt: Timestamp
  favoritedBy: string[]     // uids of players who favorited
}

// ─── Polls ──────────────────────────────────────────────────────────────────
export interface Poll {
  id: string
  type: 'content'
  title: string
  description: string
  status: 'active' | 'closed'
  allowMemberOptions: boolean
  opensAt: Timestamp
  closesAt: Timestamp
  createdBy: string
  createdAt: Timestamp
}

export interface PollOption {
  id: string
  text: string
  submittedBy: string
  createdAt: Timestamp
}

export interface PollVote {
  optionId: string
  castAt: Timestamp
}

export interface PollComment {
  id: string
  userId: string
  text: string
  createdAt: Timestamp
}

// ─── Elections ──────────────────────────────────────────────────────────────
export interface Election extends Omit<Poll, 'type' | 'status'> {
  type: 'election'
  officeTitle: string        // e.g. 'Treasurer'
  officeKey: string          // e.g. 'treasurer'
  status: 'nomination' | 'active' | 'closed'
  nominationsOpenAt: Timestamp
  nominationsCloseAt: Timestamp
  votingOpenAt: Timestamp
  votingCloseAt: Timestamp
}

export interface Candidate {
  id: string
  userId: string
  nominatedBy: string
  acceptedNomination: boolean
  nominatedAt: Timestamp
  acceptedAt: Timestamp | null
  declinedAt: Timestamp | null
}

export interface CurrentOfficer {
  id: string
  officeKey: string
  officeTitle: string
  userId: string
  termStartedAt: Timestamp
  electionId: string
}

export interface FlaggedRound {
  id: string
  roundId: string
  flaggedBy: string
  reason: string
  flaggedAt: Timestamp
}

// ─── Course Reviews ─────────────────────────────────────────────────────────
export interface CourseReview {
  id: string
  courseId: string
  uid: string
  displayName: string
  photoURL: string
  rating: number       // 1–5 stars
  text: string
  createdAt: Timestamp
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
  holeCount: 9 | 18    // 9-hole rounds are for practice/handicap only, not tour events
  courseName: string
  courseRating: number
  slopeRating: number
  grossScore: number
  netScore: number      // auto-calculated
  differentialScore: number // auto-calculated
  attestations: Attestation[]
  isValid: boolean      // true when 1+ attestation from a different member
  submittedAt: Timestamp
  sandSaves: number    // holes where a bunker shot was taken and par+ was made
  par3Pars: number     // par-3 holes played at par or better
  selectedForScoring: boolean // player's chosen round for monthly scoring
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

/** How monthly dues are split each month */
export interface MonthlyPoolSplit {
  totalDues: number            // total collected that month
  seasonContribution: number   // 40% → goes to season purse
  performancePurse: number     // 60% → distributed that month
}

/** Breakdown of the monthly performance purse */
export interface MonthlyPerformancePurse {
  netPool: number      // 40% of performance purse → top 3 net
  grossPool: number    // 30% of performance purse → top 2 gross
  skillPool: number    // 30% of performance purse → sand saves + par-3 pars
  savesPool: number    // 50% of skill pool
  par3Pool: number     // 50% of skill pool
}

/** Individual monthly payout for a player */
export interface MonthlyPlayerPayout {
  uid: string
  grossPayout: number
  netPayout: number
  savesPayout: number
  par3Payout: number
  totalPayout: number
}

/** Season purse allocation */
export interface SeasonPurseBreakdown {
  totalPurse: number
  top3Pool: number       // 65%
  swagPool: number       // 10%
  bonusPool: number      // 15%
  partyPool: number      // 10%
}

/** Season top-3 payouts */
export interface SeasonTop3Payouts {
  first: number    // 50% of top3Pool
  second: number   // 30% of top3Pool
  third: number    // 20% of top3Pool
}

/** Season bonus categories (each 20% of bonus pool) */
export interface SeasonBonusPayouts {
  mostSaves: number
  mostPar3Pars: number
  mostTourCards: number
  mostEventsPlayed: number
  mrIrrelevant: number
}

// ─── Payout Constants ────────────────────────────────────────────────────────

/** Monthly dues split */
export const MONTHLY_SEASON_CONTRIBUTION_PCT = 0.40
export const MONTHLY_PERFORMANCE_PCT = 0.60

/** Monthly performance purse split */
export const MONTHLY_NET_PCT = 0.40    // of performance purse
export const MONTHLY_GROSS_PCT = 0.30  // of performance purse
export const MONTHLY_SKILL_PCT = 0.30  // of performance purse

/** Monthly net payouts (% of net pool) */
export const NET_PAYOUTS = [0.50, 0.30, 0.20] // 1st, 2nd, 3rd

/** Monthly gross payouts (% of gross pool) */
export const GROSS_PAYOUTS = [0.60, 0.40] // 1st, 2nd

/** Season purse allocation */
export const SEASON_TOP3_PCT = 0.65
export const SEASON_SWAG_PCT = 0.10
export const SEASON_BONUS_PCT = 0.15
export const SEASON_PARTY_PCT = 0.10

/** Season top-3 split (of the 65% top3 pool) */
export const SEASON_1ST_PCT = 0.50
export const SEASON_2ND_PCT = 0.30
export const SEASON_3RD_PCT = 0.20

/** Points awarded by net-score rank */

export const POINTS_BY_RANK: Record<number, number> = {
  1: 500,
  2: 450,
  3: 375,
  4: 350,
  5: 275,
  6: 200,
  7: 150,
  8: 100,
  9: 75,
  10: 50,
}

export const POINTS_DEFAULT = 25 // 11th place and beyond

/** Bonus points */
export const POINTS_PARTICIPATION_BONUS = 25   // for showing up
export const POINTS_AFFILIATE_PAIR_BONUS = 50  // for playing with affiliate pair
export const POINTS_SKILL_POOL = 100           // shared pool for sand saves + par-3 pars
