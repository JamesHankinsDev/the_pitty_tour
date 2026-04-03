import type { Round, Registration, Season } from '../types'
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

// ─── Double-dip resolution ──────────────────────────────────────────────────

/**
 * If a player qualifies for both gross and net payouts, they keep whichever
 * is higher and the other is zeroed out. The vacated slot is NOT cascaded.
 */
function resolveDoubleDip(previews: PayoutPreview[]): PayoutPreview[] {
  return previews.map((p) => {
    if (p.grossPayout > 0 && p.netPayout > 0) {
      if (p.grossPayout >= p.netPayout) {
        return {
          ...p,
          netPayout: 0,
          doubleDipResolution: 'gross' as const,
          totalPayout: p.grossPayout + p.savesPayout + p.par3Payout,
        }
      } else {
        return {
          ...p,
          grossPayout: 0,
          doubleDipResolution: 'net' as const,
          totalPayout: p.netPayout + p.savesPayout + p.par3Payout,
        }
      }
    }
    return p
  })
}

// ─── Main calculation ───────────────────────────────────────────────────────

/**
 * Calculate all payouts for a month. This is the main orchestrator.
 *
 * @param rounds - all rounds for the month (we'll filter to valid 18-hole)
 * @param registrations - all registrations for the season
 * @param season - the active season
 * @param month - month key e.g. "2026-05"
 */
export function calculateMonthPayouts(
  rounds: Round[],
  registrations: Registration[],
  season: Season,
  month: string
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
  const perf = calculatePerformancePurse(poolSplit.performancePurse)

  // 3. Rank players (with tie handling)
  const grossRanked = rankByGross(players)
  const netRanked = rankByNet(players)

  // Count how many players share each rank for tie-splitting
  function countTied(ranked: RankedPlayer[], rank: number): number {
    return ranked.filter((p) => p.rank === rank).length
  }

  // 4. Build gross rank map (top 2 get paid, ties split)
  const grossPayoutMap = new Map<string, { rank: number; payout: number }>()
  for (const p of grossRanked) {
    const payout = p.rank <= GROSS_PAYOUTS.length
      ? tieSplitPayout(p.rank, countTied(grossRanked, p.rank), perf.grossPool, GROSS_PAYOUTS)
      : 0
    grossPayoutMap.set(p.uid, { rank: p.rank, payout })
  }

  // 5. Build net rank map (top 3 get paid, ties split)
  const netPayoutMap = new Map<string, { rank: number; payout: number }>()
  for (const p of netRanked) {
    const payout = p.rank <= NET_PAYOUTS.length
      ? tieSplitPayout(p.rank, countTied(netRanked, p.rank), perf.netPool, NET_PAYOUTS)
      : 0
    netPayoutMap.set(p.uid, { rank: p.rank, payout })
  }

  // 6. Calculate skill payouts
  const totalSaves = players.reduce((s, p) => s + p.sandSaves, 0)
  const totalPar3Pars = players.reduce((s, p) => s + p.par3Pars, 0)
  const perSaveValue = totalSaves > 0
    ? Math.round(perf.savesPool / totalSaves * 100) / 100
    : 0
  const perPar3Value = totalPar3Pars > 0
    ? Math.round(perf.par3Pool / totalPar3Pars * 100) / 100
    : 0

  // 7. Assemble previews
  let previews: PayoutPreview[] = players.map((p) => {
    const gross = grossPayoutMap.get(p.uid) ?? { rank: null, payout: 0 }
    const net = netPayoutMap.get(p.uid) ?? { rank: null, payout: 0 }
    const savesPayout = Math.round(p.sandSaves * perSaveValue * 100) / 100
    const par3Payout = Math.round(p.par3Pars * perPar3Value * 100) / 100

    return {
      uid: p.uid,
      grossRank: gross.rank ?? null,
      netRank: net.rank ?? null,
      grossPayout: gross.payout,
      netPayout: net.payout,
      savesPayout,
      par3Payout,
      totalPayout: gross.payout + net.payout + savesPayout + par3Payout,
      doubleDipResolution: 'none' as const,
      sandSaves: p.sandSaves,
      par3Pars: p.par3Pars,
    }
  })

  // 8. Resolve double-dip
  previews = resolveDoubleDip(previews)

  // Sort by total payout descending for display
  previews.sort((a, b) => b.totalPayout - a.totalPayout)

  return {
    payouts: previews,
    totalDuesCollected,
    seasonContribution: poolSplit.seasonContribution,
    performancePurse: poolSplit.performancePurse,
    netPool: perf.netPool,
    grossPool: perf.grossPool,
    savesPool: perf.savesPool,
    par3Pool: perf.par3Pool,
    perSaveValue,
    perPar3Value,
    totalSaves,
    totalPar3Pars,
    playerCount,
  }
}
