'use client'

import { useState, useEffect } from 'react'
import { getForecast, windCompass, type Forecast } from '@/lib/utils/weather'
import { Wind, Droplets } from 'lucide-react'

interface ForecastBadgeProps {
  courseName: string
  date: string   // "YYYY-MM-DD"
}

export function ForecastBadge({ courseName, date }: ForecastBadgeProps) {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getForecast(courseName, date)
      .then((f) => { if (!cancelled) setForecast(f) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseName, date])

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="animate-pulse">·</span>
      </div>
    )
  }

  if (!forecast) return null

  return (
    <div className="inline-flex items-center gap-2 text-xs bg-white/60 px-2 py-1 rounded-md border">
      <span className="text-base leading-none" title={forecast.summary}>{forecast.emoji}</span>
      <span className="font-semibold">{forecast.tempHigh}&deg;</span>
      <span className="text-muted-foreground">/{forecast.tempLow}&deg;</span>
      {forecast.precipProb > 20 && (
        <span className="flex items-center gap-0.5 text-blue-600" title={`${forecast.precipProb}% precipitation`}>
          <Droplets className="w-3 h-3" />
          {forecast.precipProb}%
        </span>
      )}
      {forecast.windSpeed > 10 && (
        <span className="flex items-center gap-0.5 text-muted-foreground" title={`${forecast.windSpeed} mph wind`}>
          <Wind className="w-3 h-3" />
          {forecast.windSpeed} {windCompass(forecast.windDirection)}
        </span>
      )}
    </div>
  )
}
