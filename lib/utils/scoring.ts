import type { Round, Points } from '../types'
import { POINTS_BY_RANK, POINTS_DEFAULT } from '../types'

// ─── Score Calculations ───────────────────────────────────────────────────────

/**
 * Calculate Course Handicap
 * Formula: Handicap Index × (Slope / 113)
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number
): number {
  return Math.round(handicapIndex * (slopeRating / 113))
}

/**
 * Calculate Net Score
 * Formula: Gross Score − Course Handicap
 */
export function calculateNetScore(
  grossScore: number,
  handicapIndex: number,
  slopeRating: number
): number {
  const courseHandicap = calculateCourseHandicap(handicapIndex, slopeRating)
  return grossScore - courseHandicap
}

/**
 * Calculate Handicap Differential
 * Formula: (Gross Score − Course Rating) × (113 / Slope Rating)
 */
export function calculateDifferential(
  grossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  return parseFloat(
    (((grossScore - courseRating) * 113) / slopeRating).toFixed(1)
  )
}

// ─── Points Assignment ────────────────────────────────────────────────────────

/**
 * Get points for a given rank
 */
export function getPointsForRank(rank: number): number {
  return POINTS_BY_RANK[rank] ?? POINTS_DEFAULT
}

/**
 * Calculate and assign monthly points for all valid rounds
 * Returns a map of uid → { grossPoints, netPoints, totalMonthlyPoints }
 */
export function calculateMonthlyPoints(
  rounds: Round[]
): Map<string, { grossPoints: number; netPoints: number; totalMonthlyPoints: number }> {
  // Only count valid rounds; one per player (best gross score)
  const bestByPlayer = new Map<string, Round>()

  for (const round of rounds) {
    if (!round.isValid) continue
    const existing = bestByPlayer.get(round.uid)
    if (!existing || round.grossScore < existing.grossScore) {
      bestByPlayer.set(round.uid, round)
    }
  }

  const validRounds = Array.from(bestByPlayer.values())

  // Sort by gross score (ascending = lower is better in golf)
  const grossSorted = [...validRounds].sort((a, b) => a.grossScore - b.grossScore)
  // Sort by net score (ascending)
  const netSorted = [...validRounds].sort((a, b) => a.netScore - b.netScore)

  const result = new Map<
    string,
    { grossPoints: number; netPoints: number; totalMonthlyPoints: number }
  >()

  grossSorted.forEach((round, idx) => {
    const grossPoints = getPointsForRank(idx + 1)
    const entry = result.get(round.uid) ?? {
      grossPoints: 0,
      netPoints: 0,
      totalMonthlyPoints: 0,
    }
    entry.grossPoints = grossPoints
    result.set(round.uid, entry)
  })

  netSorted.forEach((round, idx) => {
    const netPoints = getPointsForRank(idx + 1)
    const entry = result.get(round.uid) ?? {
      grossPoints: 0,
      netPoints: 0,
      totalMonthlyPoints: 0,
    }
    entry.netPoints = netPoints
    entry.totalMonthlyPoints = entry.grossPoints + netPoints
    result.set(round.uid, entry)
  })

  // Ensure totalMonthlyPoints is set for all
  for (const [uid, entry] of result) {
    entry.totalMonthlyPoints = entry.grossPoints + entry.netPoints
    result.set(uid, entry)
  }

  return result
}

// ─── Prize Money ──────────────────────────────────────────────────────────────

export function calculateMonthlyPrizes(totalPool: number) {
  return {
    grossFirst: Math.floor(totalPool * 0.35),
    grossSecond: Math.floor(totalPool * 0.15),
    grossThird: Math.floor(totalPool * 0.10),
    netFirst: Math.floor(totalPool * 0.25),
    netSecond: Math.floor(totalPool * 0.10),
    netThird: Math.floor(totalPool * 0.05),
  }
}

export function calculateChampionshipPrizes(totalPool: number) {
  return {
    grossFirst: Math.floor(totalPool * 0.30),
    grossSecond: Math.floor(totalPool * 0.15),
    grossThird: Math.floor(totalPool * 0.10),
    netFirst: Math.floor(totalPool * 0.25),
    netSecond: Math.floor(totalPool * 0.12),
    netThird: Math.floor(totalPool * 0.08),
  }
}

// ─── Rank Helpers ─────────────────────────────────────────────────────────────

/**
 * Rank gross scores for a list of rounds (lower is better)
 */
export function rankGrossScores(
  rounds: Round[]
): Array<Round & { rank: number }> {
  const sorted = [...rounds].sort((a, b) => a.grossScore - b.grossScore)
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }))
}

/**
 * Rank net scores for a list of rounds (lower is better)
 */
export function rankNetScores(
  rounds: Round[]
): Array<Round & { rank: number }> {
  const sorted = [...rounds].sort((a, b) => a.netScore - b.netScore)
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }))
}

// ─── Medal helpers ────────────────────────────────────────────────────────────

export function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

export function getRankSuffix(rank: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = rank % 100
  return rank + (s[(v - 20) % 10] || s[v] || s[0])
}
