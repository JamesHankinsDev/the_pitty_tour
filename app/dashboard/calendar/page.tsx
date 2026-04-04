'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import {
  getSeasonMonthCloses,
  subscribeToScheduledRounds,
  createScheduledRound,
  joinScheduledRound,
  leaveScheduledRound,
  deleteScheduledRound,
  notifyAllPlayers,
} from '@/lib/firebase/firestore'
import { sendPushToAll } from '@/lib/firebase/push'
import { getSeasonMonths, getCurrentMonthKey, formatMonthKey } from '@/lib/utils/dates'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
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
  Plus,
  X,
  Users,
  MapPin,
  UserPlus,
  LogOut,
  Trash2,
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
  isFuture,
  isPast,
} from 'date-fns'
import type { Round, MonthClose, ScheduledRound } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function CalendarPage() {
  const { profile, user } = useAuth()
  const { users } = useUsers()
  const { season, loading: seasonLoading } = useActiveSeason()
  const { rounds, loading: roundsLoading } = usePlayerRounds(profile?.uid)
  const [closes, setCloses] = useState<MonthClose[]>([])
  const [scheduledRounds, setScheduledRounds] = useState<ScheduledRound[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // Schedule form state
  const [formCourse, setFormCourse] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('09:00')
  const [formSpots, setFormSpots] = useState(4)
  const [formNote, setFormNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const uid = user?.uid ?? ''
  const userMap = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users])

  useEffect(() => {
    if (!season) return
    getSeasonMonthCloses(season.id).then(setCloses).catch(() => {})
  }, [season])

  useEffect(() => {
    const unsub = subscribeToScheduledRounds(setScheduledRounds)
    return unsub
  }, [])

  const seasonMonths = useMemo(
    () => season ? getSeasonMonths(season.year, season.startMonth, season.endMonth) : [],
    [season]
  )

  // Calendar grid
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

  // Day data
  const getDayData = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const monthKey = format(day, 'yyyy-MM')

    const roundsOnDay = rounds.filter((r) => {
      const ts = r.submittedAt as any
      if (!ts?.seconds) return false
      return isSameDay(new Date(ts.seconds * 1000), day)
    })

    const scheduledOnDay = scheduledRounds.filter((sr) => sr.date === dayStr)
    const isSeasonMonth = seasonMonths.includes(monthKey)
    const isDeadline = isSeasonMonth && isSameDay(day, endOfMonth(day))

    return { roundsOnDay, scheduledOnDay, isSeasonMonth, isDeadline }
  }

  // Selected day data
  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : ''
  const selectedDayRounds = selectedDay
    ? rounds.filter((r) => {
        const ts = r.submittedAt as any
        if (!ts?.seconds) return false
        return isSameDay(new Date(ts.seconds * 1000), selectedDay)
      })
    : []
  const selectedDayScheduled = scheduledRounds.filter((sr) => sr.date === selectedDayStr)

  // Schedule a round
  const handleSchedule = async () => {
    if (!user || !profile || !formCourse.trim() || !formDate) return
    setSubmitting(true)
    try {
      await createScheduledRound({
        hostUid: user.uid,
        hostName: profile.displayName,
        courseName: formCourse.trim(),
        date: formDate,
        teeTime: formTime,
        spots: formSpots,
        note: formNote.trim(),
        players: [user.uid],
      })
      toast.success('Round scheduled!')
      setShowScheduleForm(false)
      setFormCourse('')
      setFormNote('')

      // Notify others
      const body = `${profile.displayName} scheduled a round at ${formCourse.trim()} on ${formDate} at ${formTime}`
      notifyAllPlayers({
        type: 'lfg',
        title: 'Round Scheduled',
        body,
        link: '/dashboard/calendar',
        actorUid: user.uid,
        actorName: profile.displayName,
        actorPhotoURL: profile.photoURL,
      }, user.uid).catch(() => {})
      sendPushToAll(user.uid, { title: 'Round Scheduled', body, link: '/dashboard/calendar' })
    } catch {
      toast.error('Failed to schedule round.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async (sr: ScheduledRound) => {
    if (!user) return
    try {
      await joinScheduledRound(sr.id, user.uid)
      toast.success(`Joined ${sr.hostName}'s round!`)
    } catch {
      toast.error('Failed to join.')
    }
  }

  const handleLeave = async (sr: ScheduledRound) => {
    if (!user) return
    try {
      await leaveScheduledRound(sr.id, user.uid)
      toast.success('Left the round.')
    } catch {
      toast.error('Failed to leave.')
    }
  }

  const handleDelete = async (sr: ScheduledRound) => {
    try {
      await deleteScheduledRound(sr.id)
      toast.success('Scheduled round cancelled.')
    } catch {
      toast.error('Failed to cancel.')
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-green-600" />
            Tour Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {season ? `${season.year} Season` : 'No active season'}
          </p>
        </div>
        <Button
          variant="green"
          size="sm"
          onClick={() => setShowScheduleForm(!showScheduleForm)}
        >
          {showScheduleForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showScheduleForm ? 'Cancel' : 'Schedule Round'}
        </Button>
      </div>

      {/* Schedule form */}
      {showScheduleForm && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm">Schedule a Round</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Course</Label>
                <Input
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  placeholder="e.g. Bethpage Black"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tee Time</Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spots (incl. you)</Label>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={formSpots}
                  onChange={(e) => setFormSpots(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Note (optional)</Label>
                <Input
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Walking, cart, etc."
                />
              </div>
            </div>
            <Button
              variant="green"
              className="w-full"
              onClick={handleSchedule}
              disabled={submitting || !formCourse.trim() || !formDate}
            >
              {submitting ? 'Scheduling...' : 'Schedule & Invite Tour'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming scheduled rounds */}
      {scheduledRounds.filter((sr) => sr.date >= format(new Date(), 'yyyy-MM-dd')).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upcoming Rounds
          </h2>
          {scheduledRounds
            .filter((sr) => sr.date >= format(new Date(), 'yyyy-MM-dd'))
            .slice(0, 5)
            .map((sr) => {
              const isMember = sr.players.includes(uid)
              const isHost = sr.hostUid === uid
              const spotsLeft = sr.spots - sr.players.length
              const dateObj = new Date(sr.date + 'T12:00:00')

              return (
                <Card key={sr.id} className={isMember ? 'border-green-200 bg-green-50/50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{sr.courseName}</p>
                          {spotsLeft === 0 && <Badge variant="outline" className="text-xs">Full</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(dateObj, 'EEE, MMM d')} at {sr.teeTime} &middot; {sr.hostName}
                        </p>
                        {sr.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{sr.note}</p>
                        )}
                        {/* Player avatars */}
                        <div className="flex items-center gap-1 mt-2">
                          {sr.players.map((pid) => {
                            const p = userMap.get(pid)
                            return (
                              <Avatar key={pid} className="w-6 h-6 border-2 border-background -ml-1 first:ml-0">
                                <AvatarImage src={p?.photoURL} />
                                <AvatarFallback className="text-xs">{p?.displayName?.[0] ?? '?'}</AvatarFallback>
                              </Avatar>
                            )
                          })}
                          <span className="text-xs text-muted-foreground ml-1">
                            {sr.players.length}/{sr.spots}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!isMember && spotsLeft > 0 && (
                          <Button variant="green" size="sm" onClick={() => handleJoin(sr)}>
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Join
                          </Button>
                        )}
                        {isMember && !isHost && (
                          <Button variant="outline" size="sm" onClick={() => handleLeave(sr)}>
                            <LogOut className="w-3.5 h-3.5 mr-1" />
                            Leave
                          </Button>
                        )}
                        {isHost && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(sr)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}

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
                ) : viewMonthKey < currentMonth ? 'Past' : 'Upcoming'}
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
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, viewDate)
              const today = isToday(day)
              const { roundsOnDay, scheduledOnDay, isDeadline } = getDayData(day)
              const hasRounds = roundsOnDay.length > 0
              const hasValidRound = roundsOnDay.some((r) => r.isValid)
              const hasScheduled = scheduledOnDay.length > 0
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
                  `}
                >
                  <span className={`text-xs font-medium ${today ? 'text-green-700 font-bold' : ''} ${isDeadline && inMonth ? 'text-red-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 justify-center">
                    {hasValidRound && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    {hasRounds && !hasValidRound && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                    {hasScheduled && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {isDeadline && inMonth && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Valid round
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> Pending
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Deadline
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded ring-2 ring-green-500" /> Today
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</h3>

            {/* Scheduled rounds on this day */}
            {selectedDayScheduled.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Scheduled</p>
                {selectedDayScheduled.map((sr) => {
                  const isMember = sr.players.includes(uid)
                  const spotsLeft = sr.spots - sr.players.length
                  return (
                    <div key={sr.id} className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="text-sm font-medium">{sr.courseName} at {sr.teeTime}</p>
                        <p className="text-xs text-muted-foreground">
                          {sr.hostName} &middot; {sr.players.length}/{sr.spots} players
                          {sr.note && ` &middot; ${sr.note}`}
                        </p>
                      </div>
                      {!isMember && spotsLeft > 0 && (
                        <Button variant="green" size="sm" onClick={() => handleJoin(sr)}>Join</Button>
                      )}
                      {isMember && (
                        <Badge variant="success" className="text-xs">Joined</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Submitted rounds */}
            {selectedDayRounds.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted Rounds</p>
                {selectedDayRounds.map((round) => (
                  <div key={round.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${round.isValid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <Flag className={`w-4 h-4 shrink-0 ${round.isValid ? 'text-green-600' : 'text-yellow-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{round.courseName}</p>
                      <p className="text-xs text-muted-foreground">Gross: {round.grossScore} &middot; Net: {round.netScore}</p>
                    </div>
                    <Badge variant={round.isValid ? 'success' : 'warning'} className="text-xs">
                      {round.isValid ? 'Valid' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : selectedDayScheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing on this day.</p>
            ) : null}

            {/* Quick schedule for this day */}
            {isFuture(selectedDay) && !showScheduleForm && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setFormDate(format(selectedDay, 'yyyy-MM-dd'))
                  setShowScheduleForm(true)
                  setSelectedDay(null)
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Schedule a round on this day
              </Button>
            )}

            {isSameDay(selectedDay, endOfMonth(selectedDay)) && seasonMonths.includes(format(selectedDay, 'yyyy-MM')) && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Submission deadline — rounds must be submitted by end of day.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Season timeline */}
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
              const isPastMonth = monthKey < currentMonth
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
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${isCurrent ? 'bg-green-50 border border-green-200' : 'hover:bg-accent'} ${viewMonthKey === monthKey ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${closed ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-green-600 text-white' : isPastMonth ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
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
                  <Badge
                    variant={closed ? 'success' : isCurrent ? 'warning' : isPastMonth && !hasValid ? 'destructive' : isPastMonth ? 'success' : 'outline'}
                    className="text-xs"
                  >
                    {closed ? <><Lock className="w-3 h-3 mr-1" />Closed</> : isCurrent ? 'Active' : isPastMonth && !hasValid ? 'No round' : isPastMonth ? 'Done' : 'Upcoming'}
                  </Badge>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
