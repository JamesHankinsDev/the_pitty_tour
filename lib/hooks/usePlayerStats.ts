'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from './useSeason'
import {
  subscribeToSeasonPoints,
  subscribeToPlayerPayouts,
} from '@/lib/firebase/firestore'
import type { Points, Payout } from '@/lib/types'

interface PlayerStats {
  rank: number | null
  totalPoints: number
  totalEarnings: number
  loading: boolean
}

export function usePlayerStats(): PlayerStats {
  const { profile, user, isDemo } = useAuth()
  const { season } = useActiveSeason()
  const [allPoints, setAllPoints] = useState<Points[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to season points
  useEffect(() => {
    if (isDemo || !season) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const unsub = subscribeToSeasonPoints(season.id, (pts) => {
        setAllPoints(pts)
        setLoading(false)
      })
      return unsub
    } catch {
      setLoading(false)
    }
  }, [season, isDemo])

  // Subscribe to player's payouts
  useEffect(() => {
    if (isDemo || !season || !user) return
    const unsub = subscribeToPlayerPayouts(user.uid, season.id, setPayouts)
    return unsub
  }, [season, user, isDemo])

  const stats = useMemo<PlayerStats>(() => {
    if (isDemo) {
      return {
        rank: 3,
        totalPoints: profile?.totalPoints ?? 1250,
        totalEarnings: 0,
        loading: false,
      }
    }

    if (!profile) {
      return { rank: null, totalPoints: 0, totalEarnings: 0, loading }
    }

    // Aggregate points by player
    const totals = new Map<string, number>()
    for (const pts of allPoints) {
      totals.set(pts.uid, (totals.get(pts.uid) ?? 0) + pts.totalMonthlyPoints)
    }

    // Sort descending to determine rank
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
    const myIndex = sorted.findIndex(([uid]) => uid === profile.uid)
    const rank = myIndex >= 0 ? myIndex + 1 : null
    const totalPoints = totals.get(profile.uid) ?? profile.totalPoints ?? 0

    // Sum earnings from finalized payouts
    const totalEarnings = payouts.reduce((sum, p) => sum + p.totalPayout, 0)

    return {
      rank,
      totalPoints,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      loading: false,
    }
  }, [allPoints, payouts, profile, isDemo, loading])

  return stats
}
