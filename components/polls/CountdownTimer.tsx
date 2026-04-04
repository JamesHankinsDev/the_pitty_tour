'use client'

import { useState, useEffect } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns'
import { Clock, Lock } from 'lucide-react'

interface CountdownTimerProps {
  closesAt: { seconds: number }
  className?: string
}

export function CountdownTimer({ closesAt, className = '' }: CountdownTimerProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000) // update every minute
    return () => clearInterval(interval)
  }, [])

  const target = new Date(closesAt.seconds * 1000)

  if (isPast(target)) {
    return (
      <div className={`flex items-center gap-1.5 text-muted-foreground ${className}`}>
        <Lock className="w-4 h-4" />
        <span className="text-sm font-medium">Closed</span>
      </div>
    )
  }

  const days = differenceInDays(target, now)
  const hours = differenceInHours(target, now) % 24
  const mins = differenceInMinutes(target, now) % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)

  const isUrgent = days === 0 && hours < 6

  return (
    <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-red-600' : 'text-yellow-700'} ${className}`}>
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">
        Closes in {parts.join(' ')}
      </span>
    </div>
  )
}
