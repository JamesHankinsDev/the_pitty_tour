import type { Round, Registration, Season } from '../types'

// ─── Forfeit split ──────────────────────────────────────────────────────────

/**
 * When a player forfeits (no valid round for the month), their dues are split:
 * - 50% goes to this month's prize pool (boosts the performance purse)
 * - 50% rolls forward to next month's pool
 *
 * Returns the amounts for a single player's forfeit.
 */
export function calculateForfeitSplit(monthlyDue: number): {
  toCurrentPool: number
  toNextMonth: number
} {
  const half = Math.round(monthlyDue * 0.5 * 100) / 100
  return {
    toCurrentPool: half,
    toNextMonth: monthlyDue - half, // handles odd cents
  }
}

/**
 * Calculate the total forfeit contribution to this month's pool.
 * @param forfeitCount - number of players who forfeited this month
 * @param monthlyDue - the season's monthly due amount
 * @param priorMonthRollover - forfeit rollover from the previous month (50% of last month's forfeits)
 */
export function calculateForfeitPoolContribution(
  forfeitCount: number,
  monthlyDue: number,
  priorMonthRollover = 0
): { thisMonthForfeitToPool: number; rolloverToNext: number; totalAddedToPool: number } {
  const { toCurrentPool, toNextMonth } = calculateForfeitSplit(monthlyDue)
  const thisMonthForfeitToPool = forfeitCount * toCurrentPool
  const rolloverToNext = forfeitCount * toNextMonth
  return {
    thisMonthForfeitToPool,
    rolloverToNext,
    totalAddedToPool: thisMonthForfeitToPool + priorMonthRollover,
  }
}
import {
  calculateMonthlyPoolSplit,
  calculatePerformancePurse,
  assignRanks,
} from './scoring'
import {
  NET_PAYOUTS,
  GROSS_PAYOUTS,
} from '../types'

// ─── Types internal to this module ──────────────────────────────────────────

export interface PlayerMonthData {
  uid: string
  round: Round            // their selected (or best) round for the month
  grossScore: number
  netScore: number
  sandSaves: number
  par3Pars: number
}

export interface PayoutPreview {
  uid: string
  grossRank: number | null
  netRank: number | null
  grossPayout: number
  netPayout: number
  savesPayout: number
  par3Payout: number
  totalPayout: number
  doubleDipResolution: 'gross' | 'net' | 'none'
  sandSaves: number
  par3Pars: number
}

export interface MonthPayoutResult {
  payouts: PayoutPreview[]
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
  isChampionship: boolean
}

// ─── Pick one round per player ──────────────────────────────────────────────

/**
 * For each player, pick their scoring round for the month:
 * - If a round is marked `selectedForScoring`, use that
 * - Otherwise, fall back to their best gross score
 * - Only valid 18-hole rounds qualify
 */
export function pickScoringRounds(rounds: Round[]): PlayerMonthData[] {
  const eligible = rounds.filter(
    (r) => r.isValid && (r.holeCount ?? 18) === 18
  )

  const byPlayer = new Map<string, Round>()

  for (const round of eligible) {
    const existing = byPlayer.get(round.uid)

    if (round.selectedForScoring) {
      // Explicit selection always wins
      byPlayer.set(round.uid, round)
    } else if (!existing || (!existing.selectedForScoring && round.grossScore < existing.grossScore)) {
      byPlayer.set(round.uid, round)
    }
  }

  return Array.from(byPlayer.values()).map((r) => ({
    uid: r.uid,
    round: r,
    grossScore: r.grossScore,
    netScore: r.netScore,
    sandSaves: r.sandSaves ?? 0,
    par3Pars: r.par3Pars ?? 0,
  }))
}

// ─── Rank players (with ties) ────────────────────────────────────────────────

type RankedPlayer = PlayerMonthData & { rank: number }

function rankByGross(players: PlayerMonthData[]): RankedPlayer[] {
  return assignRanks(players, (p) => p.grossScore)
}

function rankByNet(players: PlayerMonthData[]): RankedPlayer[] {
  return assignRanks(players, (p) => p.netScore)
}

/**
 * Calculate payout for a position, handling ties.
 * If N players tie at rank R, they split the combined payouts for
 * positions R through R+N-1.
 *
 * e.g. two players tie at 2nd in net (positions 2 & 3):
 *   combined = pool * (NET_PAYOUTS[1] + NET_PAYOUTS[2])
 *   each gets combined / 2
 */
function tieSplitPayout(
  rank: number,
  tiedCount: number,
  pool: number,
  payoutPcts: number[]
): number {
  let combined = 0
  for (let i = rank - 1; i < rank - 1 + tiedCount && i < payoutPcts.length; i++) {
    combined += pool * payoutPcts[i]
  }
  return Math.round((combined / tiedCount) * 100) / 100
}

// ─── Double-dip resolution with cascading ──────────────────────────────────

/**
 * Build a payout map for a ranked list, paying the top N positions.
 * Handles ties by splitting combined payouts for shared positions.
 * `excludeUids` are removed from the ranking before payout assignment
 * (this is how cascading works — double-dip players vacate a slot,
 * the next player slides up).
 */
function buildPayoutMap(
  allPlayers: PlayerMonthData[],
  rankFn: (players: PlayerMonthData[]) => RankedPlayer[],
  pool: number,
  payoutPcts: number[],
  excludeUids: Set<string>
): Map<string, { rank: number; payout: number }> {
  const eligible = allPlayers.filter((p) => !excludeUids.has(p.uid))
  const ranked = rankFn(eligible)

  function countTied(rank: number): number {
    return ranked.filter((p) => p.rank === rank).length
  }

  const map = new Map<string, { rank: number; payout: number }>()
  for (const p of ranked) {
    const payout = p.rank <= payoutPcts.length
      ? tieSplitPayout(p.rank, countTied(p.rank), pool, payoutPcts)
      : 0
    map.set(p.uid, { rank: p.rank, payout })
  }
  return map
}

/**
 * Resolve double-dipping with cascading:
 *
 * 1. First pass: compute gross + net payouts for all players.
 * 2. Identify players who place in both — they keep the higher payout.
 * 3. Remove those players from the OTHER ranking and re-rank.
 *    The remaining players cascade up into the vacated slots.
 * 4. Repeat until no new double-dips appear (usually 1–2 iterations).
 */
function resolvePayoutsWithCascade(
  players: PlayerMonthData[],
  grossPool: number,
  netPool: number,
): { grossMap: Map<string, { rank: number; payout: number }>; netMap: Map<string, { rank: number; payout: number }> } {
  const grossExclude = new Set<string>()
  const netExclude = new Set<string>()

  // Iterate until stable (typically 1–2 rounds)
  for (let i = 0; i < 10; i++) {
    const grossMap = buildPayoutMap(players, rankByGross, grossPool, GROSS_PAYOUTS, grossExclude)
    const netMap = buildPayoutMap(players, rankByNet, netPool, NET_PAYOUTS, netExclude)

    let changed = false
    for (const p of players) {
      const g = grossMap.get(p.uid)
      const n = netMap.get(p.uid)
      if (g && g.payout > 0 && n && n.payout > 0) {
        // Double-dip: keep higher, vacate other
        if (g.payout >= n.payout) {
          if (!netExclude.has(p.uid)) { netExclude.add(p.uid); changed = true }
        } else {
          if (!grossExclude.has(p.uid)) { grossExclude.add(p.uid); changed = true }
        }
      }
    }

    if (!changed) {
      return { grossMap, netMap }
    }
  }

  // Fallback (shouldn't reach here)
  return {
    grossMap: buildPayoutMap(players, rankByGross, grossPool, GROSS_PAYOUTS, grossExclude),
    netMap: buildPayoutMap(players, rankByNet, netPool, NET_PAYOUTS, netExclude),
  }
}

// ─── Main calculation ───────────────────────────────────────────────────────

/**
 * Calculate all payouts for a month. This is the main orchestrator.
 *
 * @param rounds - all rounds for the month (we'll filter to valid 18-hole)
 * @param registrations - all registrations for the season
 * @param season - the active season
 * @param month - month key e.g. "2026-05"
 * @param isChampionship - if true, double the performance purse (Tour Championship)
 */
export function calculateMonthPayouts(
  rounds: Round[],
  registrations: Registration[],
  season: Season,
  month: string,
  isChampionship = false
): MonthPayoutResult {
  // 1. Pick one round per player
  const players = pickScoringRounds(rounds)
  const playerCount = players.length

  // 2. Calculate pool sizes based on who paid their monthly due
  const paidCount = registrations.filter(
    (r) => r.monthlyPayments[month]
  ).length
  const totalDuesCollected = paidCount * season.monthlyDue
  const poolSplit = calculateMonthlyPoolSplit(totalDuesCollected)

  // Tour Championship: double the performance purse
  const effectivePurse = isChampionship
    ? poolSplit.performancePurse * 2
    : poolSplit.performancePurse
  const perf = calculatePerformancePurse(effectivePurse)

  // 3. Resolve gross/net payouts with double-dip cascading
  //    Also compute the "original" (pre-cascade) maps to show double-dip indicators
  const originalGrossMap = buildPayoutMap(players, rankByGross, perf.grossPool, GROSS_PAYOUTS, new Set())
  const originalNetMap = buildPayoutMap(players, rankByNet, perf.netPool, NET_PAYOUTS, new Set())
  const { grossMap, netMap } = resolvePayoutsWithCascade(
    players, perf.grossPool, perf.netPool
  )

  // 4. Calculate skill payouts
  const totalSaves = players.reduce((s, p) => s + p.sandSaves, 0)
  const totalPar3Pars = players.reduce((s, p) => s + p.par3Pars, 0)
  const perSaveValue = totalSaves > 0
    ? Math.round(perf.savesPool / totalSaves * 100) / 100
    : 0
  const perPar3Value = totalPar3Pars > 0
    ? Math.round(perf.par3Pool / totalPar3Pars * 100) / 100
    : 0

  // 5. Assemble previews
  const previews: PayoutPreview[] = players.map((p) => {
    const gross = grossMap.get(p.uid) ?? { rank: null, payout: 0 }
    const net = netMap.get(p.uid) ?? { rank: null, payout: 0 }
    const savesPayout = Math.round(p.sandSaves * perSaveValue * 100) / 100
    const par3Payout = Math.round(p.par3Pars * perPar3Value * 100) / 100

    // Determine double-dip resolution for display
    let doubleDipResolution: 'gross' | 'net' | 'none' = 'none'
    const origG = originalGrossMap.get(p.uid)
    const origN = originalNetMap.get(p.uid)
    if (origG && origG.payout > 0 && origN && origN.payout > 0) {
      doubleDipResolution = origG.payout >= origN.payout ? 'gross' : 'net'
    }

    return {
      uid: p.uid,
      grossRank: gross.rank ?? null,
      netRank: net.rank ?? null,
      grossPayout: gross.payout,
      netPayout: net.payout,
      savesPayout,
      par3Payout,
      totalPayout: gross.payout + net.payout + savesPayout + par3Payout,
      doubleDipResolution,
      sandSaves: p.sandSaves,
      par3Pars: p.par3Pars,
    }
  })

  // Sort by total payout descending for display
  previews.sort((a, b) => b.totalPayout - a.totalPayout)

  return {
    payouts: previews,
    totalDuesCollected,
    seasonContribution: poolSplit.seasonContribution,
    performancePurse: effectivePurse,
    netPool: perf.netPool,
    grossPool: perf.grossPool,
    savesPool: perf.savesPool,
    par3Pool: perf.par3Pool,
    perSaveValue,
    perPar3Value,
    totalSaves,
    totalPar3Pars,
    playerCount,
    isChampionship,
  }
}
