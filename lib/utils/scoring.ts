import type {
  Round,
  Points,
  MonthlyPoolSplit,
  MonthlyPerformancePurse,
  SeasonPurseBreakdown,
  SeasonTop3Payouts,
  SeasonBonusPayouts,
} from '../types'
import {
  POINTS_BY_RANK,
  POINTS_DEFAULT,
  MONTHLY_SEASON_CONTRIBUTION_PCT,
  MONTHLY_PERFORMANCE_PCT,
  MONTHLY_NET_PCT,
  MONTHLY_GROSS_PCT,
  MONTHLY_SKILL_PCT,
  NET_PAYOUTS,
  GROSS_PAYOUTS,
  SEASON_TOP3_PCT,
  SEASON_SWAG_PCT,
  SEASON_BONUS_PCT,
  SEASON_PARTY_PCT,
  SEASON_1ST_PCT,
  SEASON_2ND_PCT,
  SEASON_3RD_PCT,
} from '../types'

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
 * Calculate and assign monthly points for all valid rounds.
 * Tour Points are based on NET scoring only — gross rank is used
 * for payouts but not for season points.
 *
 * Returns a map of uid → { grossPoints (always 0), netPoints, totalMonthlyPoints }
 */
export function calculateMonthlyPoints(
  rounds: Round[]
): Map<string, { grossPoints: number; netPoints: number; totalMonthlyPoints: number }> {
  // Only count valid 18-hole rounds; one per player (best net score for points)
  const bestByPlayer = new Map<string, Round>()

  for (const round of rounds) {
    if (!round.isValid || (round.holeCount ?? 18) !== 18) continue
    const existing = bestByPlayer.get(round.uid)
    // For points, pick the round with the best net score
    if (!existing || round.netScore < existing.netScore) {
      bestByPlayer.set(round.uid, round)
    }
  }

  const validRounds = Array.from(bestByPlayer.values())

  // Rank by net score with tie handling
  const netRanked = assignRanks(validRounds, (r) => r.netScore)

  // For ties, split the combined points of the shared positions.
  // e.g. two tied at 2nd: (450 + 400) / 2 = 425 each
  const tiedCountByRank = new Map<number, number>()
  for (const entry of netRanked) {
    tiedCountByRank.set(entry.rank, (tiedCountByRank.get(entry.rank) ?? 0) + 1)
  }

  function getSplitPoints(rank: number): number {
    const count = tiedCountByRank.get(rank) ?? 1
    let total = 0
    for (let i = rank; i < rank + count; i++) {
      total += getPointsForRank(i)
    }
    return Math.round((total / count) * 10) / 10 // one decimal
  }

  const result = new Map<
    string,
    { grossPoints: number; netPoints: number; totalMonthlyPoints: number }
  >()

  for (const entry of netRanked) {
    const netPoints = getSplitPoints(entry.rank)
    result.set(entry.uid, {
      grossPoints: 0,
      netPoints,
      totalMonthlyPoints: netPoints,
    })
  }

  return result
}

// ─── Monthly Pool Split ──────────────────────────────────────────────────────

/**
 * Split monthly dues into season contribution (40%) and performance purse (60%)
 */
export function calculateMonthlyPoolSplit(totalDues: number): MonthlyPoolSplit {
  const seasonContribution = Math.round(totalDues * MONTHLY_SEASON_CONTRIBUTION_PCT * 100) / 100
  const performancePurse = Math.round((totalDues - seasonContribution) * 100) / 100
  return { totalDues, seasonContribution, performancePurse }
}

/**
 * Break the performance purse into Net (40%), Gross (30%), and Skill (30%) pools
 */
export function calculatePerformancePurse(performancePurse: number): MonthlyPerformancePurse {
  const netPool = Math.round(performancePurse * MONTHLY_NET_PCT * 100) / 100
  const grossPool = Math.round(performancePurse * MONTHLY_GROSS_PCT * 100) / 100
  const skillPool = Math.round(performancePurse * MONTHLY_SKILL_PCT * 100) / 100
  const savesPool = Math.round(skillPool * 0.5 * 100) / 100
  const par3Pool = Math.round(skillPool * 0.5 * 100) / 100
  return { netPool, grossPool, skillPool, savesPool, par3Pool }
}

/**
 * Calculate net payouts for top 3 net performers
 */
export function calculateNetPayouts(netPool: number): number[] {
  return NET_PAYOUTS.map((pct) => Math.round(netPool * pct * 100) / 100)
}

/**
 * Calculate gross payouts for top 2 gross performers
 */
export function calculateGrossPayouts(grossPool: number): number[] {
  return GROSS_PAYOUTS.map((pct) => Math.round(grossPool * pct * 100) / 100)
}

/**
 * Calculate per-occurrence skill bonus payouts
 */
export function calculateSkillPayouts(
  savesPool: number,
  par3Pool: number,
  totalSaves: number,
  totalPar3Pars: number
): { perSave: number; perPar3: number } {
  return {
    perSave: totalSaves > 0 ? Math.round((savesPool / totalSaves) * 100) / 100 : 0,
    perPar3: totalPar3Pars > 0 ? Math.round((par3Pool / totalPar3Pars) * 100) / 100 : 0,
  }
}

// ─── Season Purse ────────────────────────────────────────────────────────────

/**
 * Calculate season purse breakdown from total season pool
 * Season pool = sum of monthly season contributions + registration fees
 */
export function calculateSeasonPurse(totalPurse: number): SeasonPurseBreakdown {
  return {
    totalPurse,
    top3Pool: Math.round(totalPurse * SEASON_TOP3_PCT * 100) / 100,
    swagPool: Math.round(totalPurse * SEASON_SWAG_PCT * 100) / 100,
    bonusPool: Math.round(totalPurse * SEASON_BONUS_PCT * 100) / 100,
    partyPool: Math.round(totalPurse * SEASON_PARTY_PCT * 100) / 100,
  }
}

/**
 * Calculate season top-3 payouts from the top3 pool (65% of season purse)
 */
export function calculateSeasonTop3(top3Pool: number): SeasonTop3Payouts {
  return {
    first: Math.round(top3Pool * SEASON_1ST_PCT * 100) / 100,
    second: Math.round(top3Pool * SEASON_2ND_PCT * 100) / 100,
    third: Math.round(top3Pool * SEASON_3RD_PCT * 100) / 100,
  }
}

/**
 * Calculate season bonus payouts (5 categories, each 20% of bonus pool)
 */
export function calculateSeasonBonuses(bonusPool: number): SeasonBonusPayouts {
  const each = Math.round(bonusPool * 0.20 * 100) / 100
  return {
    mostSaves: each,
    mostPar3Pars: each,
    mostTourCards: each,
    mostEventsPlayed: each,
    mrIrrelevant: each,
  }
}

// ─── Rank Helpers ─────────────────────────────────────────────────────────────

/**
 * Assign ranks to a sorted array, handling ties.
 * Players with the same score share a rank; the next rank skips.
 * e.g. scores [70, 72, 72, 75] → ranks [1, 2, 2, 4]
 */
export function assignRanks<T>(
  items: T[],
  getScore: (item: T) => number
): Array<T & { rank: number }> {
  const sorted = [...items].sort((a, b) => getScore(a) - getScore(b))
  let currentRank = 1
  return sorted.map((item, i) => {
    if (i > 0 && getScore(sorted[i]) !== getScore(sorted[i - 1])) {
      currentRank = i + 1
    }
    return { ...item, rank: currentRank }
  })
}

/**
 * Rank gross scores for a list of rounds (lower is better), with ties
 */
export function rankGrossScores(
  rounds: Round[]
): Array<Round & { rank: number }> {
  return assignRanks(rounds, (r) => r.grossScore)
}

/**
 * Rank net scores for a list of rounds (lower is better), with ties
 */
export function rankNetScores(
  rounds: Round[]
): Array<Round & { rank: number }> {
  return assignRanks(rounds, (r) => r.netScore)
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
