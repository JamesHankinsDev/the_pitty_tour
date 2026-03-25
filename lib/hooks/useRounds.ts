'use client'

import { useState, useEffect } from 'react'
import {
  subscribeToPlayerRounds,
  subscribeToMonthRounds,
  getPlayerRoundsForMonth,
} from '@/lib/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_PLAYER_ROUNDS, DEMO_ALL_ROUNDS } from '@/lib/demo/data'
import type { Round } from '@/lib/types'

export function usePlayerRounds(uid: string | undefined) {
  const { isDemo } = useAuth()
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !uid) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToPlayerRounds(uid, (r) => {
      setRounds(r)
      setLoading(false)
    })
    return unsub
  }, [uid, isDemo])

  if (isDemo) return { rounds: DEMO_PLAYER_ROUNDS, loading: false }
  return { rounds, loading }
}

export function useMonthRounds(
  seasonId: string | undefined,
  month: string
) {
  const { isDemo } = useAuth()
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

  if (isDemo) return { rounds: DEMO_ALL_ROUNDS.filter((r) => r.month === month), loading: false }
  return { rounds, loading }
}

export function usePendingRoundsForPlayer(
  uid: string | undefined,
  month: string
) {
  const { isDemo } = useAuth()
  const [pendingRounds, setPendingRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !uid) {
      setLoading(false)
      return
    }

    getPlayerRoundsForMonth(uid, month)
      .then((rounds) => {
        setPendingRounds(rounds.filter((r) => !r.isValid))
      })
      .finally(() => setLoading(false))
  }, [uid, month, isDemo])

  if (isDemo) return { pendingRounds: DEMO_PLAYER_ROUNDS.filter((r) => !r.isValid && r.month === month), loading: false }
  return { pendingRounds, loading }
}
