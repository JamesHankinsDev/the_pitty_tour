'use client'

import { useState, useEffect } from 'react'
import {
  subscribeToPlayerRounds,
  subscribeToMonthRounds,
  getPlayerRoundsForMonth,
} from '@/lib/firebase/firestore'
import type { Round } from '@/lib/types'

export function usePlayerRounds(uid: string | undefined) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToPlayerRounds(uid, (r) => {
      setRounds(r)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { rounds, loading }
}

export function useMonthRounds(
  seasonId: string | undefined,
  month: string
) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

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

  return { rounds, loading }
}

export function usePendingRoundsForPlayer(
  uid: string | undefined,
  month: string
) {
  const [pendingRounds, setPendingRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    getPlayerRoundsForMonth(uid, month)
      .then((rounds) => {
        setPendingRounds(rounds.filter((r) => !r.isValid))
      })
      .finally(() => setLoading(false))
  }, [uid, month])

  return { pendingRounds, loading }
}
