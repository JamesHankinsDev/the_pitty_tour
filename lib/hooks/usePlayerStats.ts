'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from './useSeason'
import {
  subscribeToSeasonPoints,
  getAllUsers,
} from '@/lib/firebase/firestore'
import type { Points, UserProfile } from '@/lib/types'

interface PlayerStats {
  rank: number | null
  totalPoints: number
  totalEarnings: number
  loading: boolean
}

/**
 * Lightweight hook to get the current user's season rank, total points,
 * and total earnings for display in nav/sidebar.
 *
 * Earnings are not yet tracked in Firestore, so this returns 0 for now.
 * When earnings tracking is added, wire it up here.
 */
export function usePlayerStats(): PlayerStats {
  const { profile, isDemo } = useAuth()
  const { season } = useActiveSeason()
  const [allPoints, setAllPoints] = useState<Points[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !season) {
      setLoading(false)
      return
    }
    getAllUsers().then(setUsers).catch(() => {})
  }, [isDemo, season])

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

  const stats = useMemo<PlayerStats>(() => {
    if (isDemo) {
      return {
        rank: 3,
        totalPoints: profile?.totalPoints ?? 1250,
        totalEarnings: 0,
        loading: false,
      }
    }

    if (!profile || allPoints.length === 0) {
      return {
        rank: null,
        totalPoints: profile?.totalPoints ?? 0,
        totalEarnings: 0,
        loading,
      }
    }

    // Aggregate points by player
    const totals = new Map<string, number>()
    for (const pts of allPoints) {
      totals.set(pts.uid, (totals.get(pts.uid) ?? 0) + pts.totalMonthlyPoints)
    }

    // Sort by total points descending to determine rank
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
    const myIndex = sorted.findIndex(([uid]) => uid === profile.uid)
    const rank = myIndex >= 0 ? myIndex + 1 : null
    const totalPoints = totals.get(profile.uid) ?? profile.totalPoints ?? 0

    return {
      rank,
      totalPoints,
      totalEarnings: 0, // TODO: wire up when earnings tracking is implemented
      loading: false,
    }
  }, [allPoints, profile, isDemo, loading])

  return stats
}
