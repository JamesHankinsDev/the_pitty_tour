'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  subscribeToMonthRounds,
  subscribeToSeasonPoints,
  getAllUsers,
} from '@/lib/firebase/firestore'
import { calculateMonthlyPoints } from '@/lib/utils/scoring'
import type { Round, Points, LeaderboardEntry, UserProfile } from '@/lib/types'

export function useMonthLeaderboard(
  seasonId: string | undefined,
  month: string
) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  useEffect(() => {
    if (!seasonId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToMonthRounds(seasonId, month, (r) => {
      setRounds(r)
      setLoading(false)
    })
    return unsub
  }, [seasonId, month])

  const { grossStandings, netStandings } = useMemo(() => {
    const validRounds = rounds.filter((r) => r.isValid)

    // Best round per player
    const bestByPlayer = new Map<string, Round>()
    for (const round of validRounds) {
      const existing = bestByPlayer.get(round.uid)
      if (!existing || round.grossScore < existing.grossScore) {
        bestByPlayer.set(round.uid, round)
      }
    }

    const playerRounds = Array.from(bestByPlayer.values())
    const userMap = new Map(users.map((u) => [u.uid, u]))

    const grossSorted = [...playerRounds].sort(
      (a, b) => a.grossScore - b.grossScore
    )
    const netSorted = [...playerRounds].sort((a, b) => a.netScore - b.netScore)

    const pointsMap = calculateMonthlyPoints(rounds)

    const makeEntry = (round: Round, rank: number): LeaderboardEntry => {
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
        totalPoints: (pts?.grossPoints ?? 0) + (pts?.netPoints ?? 0),
        roundsPlayed: 1,
        rank,
      }
    }

    return {
      grossStandings: grossSorted.map((r, i) => makeEntry(r, i + 1)),
      netStandings: netSorted.map((r, i) => makeEntry(r, i + 1)),
    }
  }, [rounds, users])

  return { grossStandings, netStandings, loading }
}

export function useSeasonLeaderboard(seasonId: string | undefined) {
  const [allPoints, setAllPoints] = useState<Points[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllUsers().then(setUsers)
  }, [])

  useEffect(() => {
    if (!seasonId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToSeasonPoints(seasonId, (pts) => {
      setAllPoints(pts)
      setLoading(false)
    })
    return unsub
  }, [seasonId])

  const { grossStandings, netStandings } = useMemo(() => {
    const userMap = new Map(users.map((u) => [u.uid, u]))

    // Aggregate points by player
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

    const grossSorted = [...entries]
      .sort((a, b) => b.grossPoints - a.grossPoints)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    const netSorted = [...entries]
      .sort((a, b) => b.netPoints - a.netPoints)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    return { grossStandings: grossSorted, netStandings: netSorted }
  }, [allPoints, users])

  return { grossStandings, netStandings, loading }
}
