import { Timestamp } from 'firebase/firestore'
import type {
  UserProfile,
  Season,
  Registration,
  Round,
  LeaderboardEntry,
} from '@/lib/types'

// ─── Helpers ────────────────────────────────────────────────────────────────
const ts = (dateStr: string) => Timestamp.fromDate(new Date(dateStr))

// ─── Demo Profile (the "logged in" user) ────────────────────────────────────
export const DEMO_PROFILE: UserProfile = {
  uid: 'demo-user',
  displayName: 'Demo Player',
  email: 'demo@pitytour.com',
  photoURL: '',
  handicapIndex: 14.2,
  ghinNumber: '0000000',
  venmoHandle: 'DemoPlayer',
  qrCode: 'demo-user',
  memberSince: ts('2026-01-15'),
  totalPoints: 285,
  isAdmin: false,
  inviteToken: '',
}

// ─── Demo Season ────────────────────────────────────────────────────────────
export const DEMO_SEASON: Season = {
  id: 'demo-season',
  year: 2026,
  startMonth: 4,
  endMonth: 11,
  registrationFee: 100,
  monthlyDue: 50,
  isActive: true,
}

// ─── Demo Players ───────────────────────────────────────────────────────────
const demoPlayers = [
  { uid: 'demo-user', name: 'Demo Player', hcp: 14.2, photo: '' },
  { uid: 'demo-p1', name: 'Mike Sullivan', hcp: 8.4, photo: '' },
  { uid: 'demo-p2', name: 'Chris Park', hcp: 18.7, photo: '' },
  { uid: 'demo-p3', name: 'Jake Torres', hcp: 5.1, photo: '' },
  { uid: 'demo-p4', name: 'Brian Lee', hcp: 22.3, photo: '' },
  { uid: 'demo-p5', name: 'Tyler Knox', hcp: 11.6, photo: '' },
  { uid: 'demo-p6', name: 'Sam Patel', hcp: 16.0, photo: '' },
  { uid: 'demo-p7', name: 'Drew Collins', hcp: 9.8, photo: '' },
]

// ─── Demo Rounds (for Demo Player) ─────────────────────────────────────────
export const DEMO_PLAYER_ROUNDS: Round[] = [
  {
    id: 'demo-r1',
    uid: 'demo-user',
    seasonId: 'demo-season',
    month: '2026-04',
    holeCount: 18,
    courseName: 'Pine Valley Golf Club',
    courseRating: 72.4,
    slopeRating: 139,
    grossScore: 88,
    netScore: 74,
    differentialScore: 10.1,
    sandSaves: 2, par3Pars: 1, selectedForScoring: true,
    attestations: [
      { attestorUid: 'demo-p1', attestorName: 'Mike Sullivan', attestedAt: ts('2026-04-12'), method: 'qr_scan' },
    ],
    isValid: true,
    submittedAt: ts('2026-04-12'),
    notes: 'Great day on the course!',
  },
  {
    id: 'demo-r2',
    uid: 'demo-user',
    seasonId: 'demo-season',
    month: '2026-05',
    holeCount: 18,
    courseName: 'Bethpage Black',
    courseRating: 73.1,
    slopeRating: 144,
    grossScore: 91,
    netScore: 77,
    differentialScore: 11.2,
    sandSaves: 0, par3Pars: 2, selectedForScoring: true,
    attestations: [
      { attestorUid: 'demo-p3', attestorName: 'Jake Torres', attestedAt: ts('2026-05-08'), method: 'qr_scan' },
    ],
    isValid: true,
    submittedAt: ts('2026-05-08'),
    notes: '',
  },
  {
    id: 'demo-r3',
    uid: 'demo-user',
    seasonId: 'demo-season',
    month: '2026-06',
    holeCount: 18,
    courseName: 'Torrey Pines South',
    courseRating: 74.6,
    slopeRating: 136,
    grossScore: 85,
    netScore: 71,
    differentialScore: 6.9,
    sandSaves: 1, par3Pars: 0, selectedForScoring: false,
    attestations: [],
    isValid: false,
    submittedAt: ts('2026-06-15'),
    notes: 'Need attestation still',
  },
]

// ─── Demo All Rounds (for leaderboard) ──────────────────────────────────────
export const DEMO_ALL_ROUNDS: Round[] = [
  ...DEMO_PLAYER_ROUNDS,
  {
    id: 'demo-r10', uid: 'demo-p1', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Winged Foot West', courseRating: 73.8, slopeRating: 142,
    grossScore: 79, netScore: 71, differentialScore: 3.3, sandSaves: 3, par3Pars: 2,
    attestations: [{ attestorUid: 'demo-p3', attestorName: 'Jake Torres', attestedAt: ts('2026-04-10'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-10'), notes: '',
  },
  {
    id: 'demo-r11', uid: 'demo-p2', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Pebble Beach', courseRating: 72.2, slopeRating: 138,
    grossScore: 94, netScore: 76, differentialScore: 14.2, sandSaves: 0, par3Pars: 1,
    attestations: [{ attestorUid: 'demo-p4', attestorName: 'Brian Lee', attestedAt: ts('2026-04-14'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-14'), notes: '',
  },
  {
    id: 'demo-r12', uid: 'demo-p3', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Augusta National', courseRating: 72.0, slopeRating: 137,
    grossScore: 74, netScore: 69, differentialScore: 1.3, sandSaves: 4, par3Pars: 3,
    attestations: [{ attestorUid: 'demo-p1', attestorName: 'Mike Sullivan', attestedAt: ts('2026-04-18'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-18'), notes: '',
  },
  {
    id: 'demo-r13', uid: 'demo-p4', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'TPC Sawgrass', courseRating: 72.5, slopeRating: 135,
    grossScore: 99, netScore: 77, differentialScore: 17.6, sandSaves: 1, par3Pars: 0,
    attestations: [{ attestorUid: 'demo-p2', attestorName: 'Chris Park', attestedAt: ts('2026-04-20'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-20'), notes: '',
  },
  {
    id: 'demo-r14', uid: 'demo-p5', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Merion Golf Club', courseRating: 71.8, slopeRating: 140,
    grossScore: 83, netScore: 71, differentialScore: 7.2, sandSaves: 2, par3Pars: 1,
    attestations: [{ attestorUid: 'demo-p6', attestorName: 'Sam Patel', attestedAt: ts('2026-04-22'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-22'), notes: '',
  },
  {
    id: 'demo-r15', uid: 'demo-p6', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Shinnecock Hills', courseRating: 73.2, slopeRating: 141,
    grossScore: 92, netScore: 76, differentialScore: 11.9, sandSaves: 0, par3Pars: 0,
    attestations: [{ attestorUid: 'demo-p5', attestorName: 'Tyler Knox', attestedAt: ts('2026-04-25'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-25'), notes: '',
  },
  {
    id: 'demo-r16', uid: 'demo-p7', seasonId: 'demo-season', month: '2026-04',
    holeCount: 18, courseName: 'Oakmont CC', courseRating: 73.5, slopeRating: 145,
    grossScore: 81, netScore: 71, differentialScore: 4.6, sandSaves: 1, par3Pars: 2,
    attestations: [{ attestorUid: 'demo-p1', attestorName: 'Mike Sullivan', attestedAt: ts('2026-04-28'), method: 'qr_scan' }],
    selectedForScoring: true, isValid: true, submittedAt: ts('2026-04-28'), notes: '',
  },
]

// ─── Demo Leaderboard ───────────────────────────────────────────────────────
function buildLeaderboard(rounds: Round[]): { grossStandings: LeaderboardEntry[]; netStandings: LeaderboardEntry[] } {
  const valid = rounds.filter((r) => r.isValid)
  const bestByPlayer = new Map<string, Round>()
  for (const r of valid) {
    const ex = bestByPlayer.get(r.uid)
    if (!ex || r.grossScore < ex.grossScore) bestByPlayer.set(r.uid, r)
  }

  const playerMap = new Map(demoPlayers.map((p) => [p.uid, p]))
  const entries = Array.from(bestByPlayer.values())

  const grossSorted = [...entries].sort((a, b) => a.grossScore - b.grossScore)
  const netSorted = [...entries].sort((a, b) => a.netScore - b.netScore)

  const pointsByRank = [100, 85, 75, 65, 55, 50, 45, 40]

  const makeEntry = (r: Round, rank: number, points: number): LeaderboardEntry => {
    const p = playerMap.get(r.uid)
    return {
      uid: r.uid,
      displayName: p?.name ?? 'Unknown',
      photoURL: p?.photo ?? '',
      grossScore: r.grossScore,
      netScore: r.netScore,
      grossPoints: 0,
      netPoints: 0,
      totalPoints: points,
      roundsPlayed: 1,
      rank,
    }
  }

  return {
    grossStandings: grossSorted.map((r, i) => makeEntry(r, i + 1, pointsByRank[i] ?? 20)),
    netStandings: netSorted.map((r, i) => makeEntry(r, i + 1, pointsByRank[i] ?? 20)),
  }
}

const aprilRounds = DEMO_ALL_ROUNDS.filter((r) => r.month === '2026-04')
export const DEMO_LEADERBOARD = buildLeaderboard(aprilRounds)

// ─── Demo Registration ──────────────────────────────────────────────────────
export const DEMO_REGISTRATION: Registration = {
  id: 'demo-reg',
  uid: 'demo-user',
  seasonId: 'demo-season',
  registeredAt: ts('2026-03-15'),
  hasPaidRegistration: true,
  monthlyPayments: { '2026-04': true, '2026-05': true },
  forfeitedMonths: [],
  totalForfeited: 0,
}

export const DEMO_REGISTRATIONS: Registration[] = demoPlayers.map((p, i) => ({
  id: `demo-reg-${i}`,
  uid: p.uid,
  seasonId: 'demo-season',
  registeredAt: ts('2026-03-15'),
  hasPaidRegistration: true,
  monthlyPayments: { '2026-04': true, '2026-05': i < 5 },
  forfeitedMonths: [],
  totalForfeited: 0,
}))
