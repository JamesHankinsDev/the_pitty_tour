'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { getSeasonMonthCloses } from '@/lib/firebase/firestore'
import { getSeasonMonths, getCurrentMonthKey, formatMonthKey } from '@/lib/utils/dates'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Clock,
  Trophy,
  Lock,
  AlertCircle,
} from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import type { Round, MonthClose } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getDayStatus(
  day: Date,
  rounds: Round[],
  seasonMonths: string[],
  closes: MonthClose[]
): {
  roundsOnDay: Round[]
  isSeasonMonth: boolean
  isDeadline: boolean
  isClosed: boolean
} {
  const monthKey = format(day, 'yyyy-MM')
  const isSeasonMonth = seasonMonths.includes(monthKey)
  const isDeadline = isSeasonMonth && isSameDay(day, endOfMonth(day))
  const isClosed = closes.some((c) => c.month === monthKey)

  const roundsOnDay = rounds.filter((r) => {
    const ts = r.submittedAt as any
    if (!ts?.seconds) return false
    return isSameDay(new Date(ts.seconds * 1000), day)
  })

  return { roundsOnDay, isSeasonMonth, isDeadline, isClosed }
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const { season, loading: seasonLoading } = useActiveSeason()
  const { rounds, loading: roundsLoading } = usePlayerRounds(profile?.uid)
  const [closes, setCloses] = useState<MonthClose[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    if (!season) return
    getSeasonMonthCloses(season.id).then(setCloses).catch(() => {})
  }, [season])

  const seasonMonths = useMemo(
    () => season ? getSeasonMonths(season.year, season.startMonth, season.endMonth) : [],
    [season]
  )

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(viewDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [viewDate])

  const viewMonthKey = format(viewDate, 'yyyy-MM')
  const isViewMonthInSeason = seasonMonths.includes(viewMonthKey)
  const isViewMonthClosed = closes.some((c) => c.month === viewMonthKey)
  const currentMonth = getCurrentMonthKey()

  // Rounds for selected day
  const selectedDayRounds = selectedDay
    ? rounds.filter((r) => {
        const ts = r.submittedAt as any
        if (!ts?.seconds) return false
        return isSameDay(new Date(ts.seconds * 1000), selectedDay)
      })
    : []

  if (seasonLoading || roundsLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-green-600" />
          Tour Calendar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season ? `${season.year} Season` : 'No active season'}
        </p>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setViewDate(subMonths(viewDate, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold">{format(viewDate, 'MMMM yyyy')}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            {isViewMonthInSeason && (
              <Badge variant={isViewMonthClosed ? 'success' : viewMonthKey === currentMonth ? 'warning' : 'outline'} className="text-xs">
                {isViewMonthClosed ? (
                  <><Lock className="w-3 h-3 mr-1" />Closed</>
                ) : viewMonthKey === currentMonth ? (
                  <><Clock className="w-3 h-3 mr-1" />Active</>
                ) : viewMonthKey < currentMonth ? (
                  'Past'
                ) : (
                  'Upcoming'
                )}
              </Badge>
            )}
            {!isViewMonthInSeason && (
              <Badge variant="outline" className="text-xs">Off-season</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setViewDate(addMonths(viewDate, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, viewDate)
              const today = isToday(day)
              const { roundsOnDay, isSeasonMonth, isDeadline, isClosed } = getDayStatus(
                day, rounds, seasonMonths, closes
              )
              const hasRounds = roundsOnDay.length > 0
              const hasValidRound = roundsOnDay.some((r) => r.isValid)
              const isSelected = selectedDay && isSameDay(day, selectedDay)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`
                    relative min-h-[48px] p-1 text-sm transition-colors bg-background
                    ${!inMonth ? 'text-muted-foreground/30' : ''}
                    ${today ? 'ring-2 ring-green-500 ring-inset' : ''}
                    ${isSelected ? 'bg-green-50' : 'hover:bg-accent'}
                    ${isDeadline && inMonth ? 'bg-red-50' : ''}
                    ${isSeasonMonth && inMonth && !isDeadline ? '' : ''}
                  `}
                >
                  <span className={`
                    text-xs font-medium
                    ${today ? 'text-green-700 font-bold' : ''}
                    ${isDeadline && inMonth ? 'text-red-600 font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>

                  {/* Indicators */}
                  <div className="flex gap-0.5 mt-0.5 justify-center">
                    {hasValidRound && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Valid round" />
                    )}
                    {hasRounds && !hasValidRound && (
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Pending round" />
                    )}
                    {isDeadline && inMonth && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Submission deadline" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Valid round
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              Pending
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Deadline
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded ring-2 ring-green-500" />
              Today
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>

            {selectedDayRounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rounds submitted on this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedDayRounds.map((round) => (
                  <div
                    key={round.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      round.isValid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <Flag className={`w-4 h-4 shrink-0 ${round.isValid ? 'text-green-600' : 'text-yellow-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{round.courseName}</p>
                      <p className="text-xs text-muted-foreground">
                        Gross: {round.grossScore} · Net: {round.netScore}
                        {round.sandSaves > 0 && ` · ${round.sandSaves} save${round.sandSaves !== 1 ? 's' : ''}`}
                        {round.par3Pars > 0 && ` · ${round.par3Pars} par-3 par${round.par3Pars !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {round.isValid ? (
                        <Badge variant="success" className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Deadline warning */}
            {isSameDay(selectedDay, endOfMonth(selectedDay)) &&
              seasonMonths.includes(format(selectedDay, 'yyyy-MM')) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Submission deadline — rounds must be submitted by end of day.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Season overview timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            Season Timeline
          </h3>
          <div className="space-y-2">
            {seasonMonths.map((monthKey, i) => {
              const closed = closes.some((c) => c.month === monthKey)
              const isCurrent = monthKey === currentMonth
              const isPast = monthKey < currentMonth
              const monthRounds = rounds.filter((r) => r.month === monthKey)
              const hasValid = monthRounds.some((r) => r.isValid)
              const isFirst = i === 0
              const isLast = i === seasonMonths.length - 1

              return (
                <button
                  key={monthKey}
                  onClick={() => {
                    const [y, m] = monthKey.split('-').map(Number)
                    setViewDate(new Date(y, m - 1, 1))
                    setSelectedDay(null)
                  }}
                  className={`
                    w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors
                    ${isCurrent ? 'bg-green-50 border border-green-200' : 'hover:bg-accent'}
                    ${viewMonthKey === monthKey ? 'ring-2 ring-green-500' : ''}
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                    ${closed ? 'bg-green-100 text-green-700' :
                      isCurrent ? 'bg-green-600 text-white' :
                      isPast ? 'bg-yellow-100 text-yellow-700' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {formatMonthKey(monthKey)}
                      {isFirst && <span className="text-xs text-muted-foreground ml-1">(Opener)</span>}
                      {isLast && <span className="text-xs text-muted-foreground ml-1">(Championship)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {monthRounds.length} round{monthRounds.length !== 1 ? 's' : ''}
                      {hasValid && ' · has valid round'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {closed ? (
                      <Badge variant="success" className="text-xs"><Lock className="w-3 h-3 mr-1" />Closed</Badge>
                    ) : isCurrent ? (
                      <Badge variant="warning" className="text-xs">Active</Badge>
                    ) : isPast && !hasValid ? (
                      <Badge variant="destructive" className="text-xs">No round</Badge>
                    ) : isPast && hasValid ? (
                      <Badge variant="success" className="text-xs">Done</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Upcoming</Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
