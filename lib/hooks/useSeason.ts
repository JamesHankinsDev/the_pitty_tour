'use client'

import { useState, useEffect } from 'react'
import { getActiveSeason, getAllSeasons } from '@/lib/firebase/firestore'
import type { Season } from '@/lib/types'

export function useActiveSeason() {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getActiveSeason()
      .then(setSeason)
      .finally(() => setLoading(false))
  }, [])

  return { season, loading }
}

export function useAllSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllSeasons()
      .then(setSeasons)
      .finally(() => setLoading(false))
  }, [])

  return { seasons, loading }
}
