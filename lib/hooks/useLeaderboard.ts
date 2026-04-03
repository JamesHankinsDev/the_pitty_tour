'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  subscribeToMonthRounds,
  subscribeToSeasonPoints,
} from '@/lib/firebase/firestore'
import { calculateMonthlyPoints, assignRanks } from '@/lib/utils/scoring'
import { isPastMonth } from '@/lib/utils/dates'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { DEMO_LEADERBOARD } from '@/lib/demo/data'
import type { Round, Points, LeaderboardEntry } from '@/lib/types'

export function useMonthLeaderboard(
  seasonId: string | undefined,
  month: string
) {
  const { isDemo } = useAuth()
  const { users } = useUsers()
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !seasonId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToMonthRounds(seasonId, month, (r) => {
      setRounds(r)
      setLoading(false)
    })
    return unsub
  }, [seasonId, month, isDemo])

  // Is this month finalized (past) or still in progress?
  const isOfficial = useMemo(() => isPastMonth(month), [month])

  const { grossStandings, netStandings } = useMemo(() => {
    if (isDemo) return DEMO_LEADERBOARD

    // Only 18-hole valid rounds count for monthly events
    const validRounds = rounds.filter((r) => r.isValid && (r.holeCount ?? 18) === 18)

    // Pick one round per player:
    // - Past months (official): use the player's selectedForScoring round,
    //   falling back to best gross if none selected
    // - Current/future months (unofficial): use best gross as a running preview
    const roundByPlayer = new Map<string, Round>()
    for (const round of validRounds) {
      const existing = roundByPlayer.get(round.uid)

      if (isOfficial) {
        // Prefer the explicitly selected round
        if (round.selectedForScoring) {
          roundByPlayer.set(round.uid, round)
        } else if (!existing || (!existing.selectedForScoring && round.grossScore < existing.grossScore)) {
          roundByPlayer.set(round.uid, round)
        }
      } else {
        // Unofficial: always take the best gross score
        if (!existing || round.grossScore < existing.grossScore) {
          roundByPlayer.set(round.uid, round)
        }
      }
    }

    const playerRounds = Array.from(roundByPlayer.values())
    const userMap = new Map(users.map((u) => [u.uid, u]))

    // Rank with tie handling
    const grossRanked = assignRanks(playerRounds, (r) => r.grossScore)
    const netRanked = assignRanks(playerRounds, (r) => r.netScore)

    const pointsMap = calculateMonthlyPoints(rounds)

    const makeEntry = (round: Round & { rank: number }): LeaderboardEntry => {
      const user = userMap.get(round.uid)
      const pts = pointsMap.get(round.uid)
      return {
        uid: round.uid,
        displayName: user?.displayName ?? 'Unknown',
        photoURL: user?.photoURL ?? '',
        grossScore: round.grossScore,
        netScore: round.netScore,
        grossPoints: pts?.grossPoints ?? 0,
        netPoints: pts?.netPoints ?? 0,
        totalPoints: pts?.totalMonthlyPoints ?? 0,
        roundsPlayed: 1,
        rank: round.rank,
      }
    }

    return {
      grossStandings: grossRanked.map(makeEntry),
      netStandings: netRanked.map(makeEntry),
    }
  }, [rounds, users, isDemo, isOfficial])

  if (isDemo) return { grossStandings: DEMO_LEADERBOARD.grossStandings, netStandings: DEMO_LEADERBOARD.netStandings, loading: false, isOfficial: false }
  return { grossStandings, netStandings, loading, isOfficial }
}

export function useSeasonLeaderboard(seasonId: string | undefined) {
  const { isDemo } = useAuth()
  const { users } = useUsers()
  const [allPoints, setAllPoints] = useState<Points[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !seasonId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToSeasonPoints(seasonId, (pts) => {
      setAllPoints(pts)
      setLoading(false)
    })
    return unsub
  }, [seasonId, isDemo])

  const { grossStandings, netStandings } = useMemo(() => {
    if (isDemo) return DEMO_LEADERBOARD

    const userMap = new Map(users.map((u) => [u.uid, u]))

    const aggregated = new Map<
      string,
      { grossPoints: number; netPoints: number; totalPoints: number; months: number }
    >()

    for (const pts of allPoints) {
      const existing = aggregated.get(pts.uid) ?? {
        grossPoints: 0,
        netPoints: 0,
        totalPoints: 0,
        months: 0,
      }
      existing.grossPoints += pts.grossPoints
      existing.netPoints += pts.netPoints
      existing.totalPoints += pts.totalMonthlyPoints
      existing.months += 1
      aggregated.set(pts.uid, existing)
    }

    const entries: LeaderboardEntry[] = Array.from(aggregated.entries()).map(
      ([uid, agg]) => {
        const user = userMap.get(uid)
        return {
          uid,
          displayName: user?.displayName ?? 'Unknown',
          photoURL: user?.photoURL ?? '',
          grossPoints: agg.grossPoints,
          netPoints: agg.netPoints,
          totalPoints: agg.totalPoints,
          roundsPlayed: agg.months,
        }
      }
    )

    // Rank with tie handling (higher points = better, so negate for ascending sort)
    const grossSorted = assignRanks(entries, (e) => -e.grossPoints)
    const netSorted = assignRanks(entries, (e) => -e.netPoints)

    return { grossStandings: grossSorted, netStandings: netSorted }
  }, [allPoints, users, isDemo])

  if (isDemo) return { grossStandings: DEMO_LEADERBOARD.grossStandings, netStandings: DEMO_LEADERBOARD.netStandings, loading: false }
  return { grossStandings, netStandings, loading }
}
