'use client'

import { useState, useEffect } from 'react'
import { getActiveSeason, getAllSeasons } from '@/lib/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { DEMO_SEASON } from '@/lib/demo/data'
import type { Season } from '@/lib/types'

export function useActiveSeason() {
  const { isDemo } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }
    getActiveSeason()
      .then(setSeason)
      .finally(() => setLoading(false))
  }, [isDemo])

  if (isDemo) return { season: DEMO_SEASON, loading: false }
  return { season, loading }
}

export function useAllSeasons() {
  const { isDemo } = useAuth()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }
    getAllSeasons()
      .then(setSeasons)
      .finally(() => setLoading(false))
  }, [isDemo])

  if (isDemo) return { seasons: [DEMO_SEASON], loading: false }
  return { seasons, loading }
}
