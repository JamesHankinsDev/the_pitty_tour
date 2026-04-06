'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { useUsers } from '@/contexts/UsersContext'
import { getSeasonRounds } from '@/lib/firebase/firestore'
import { formatMonthKey } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Award,
  Trophy,
  TrendingDown,
  Target,
  Flame,
  Star,
  Flag,
  Zap,
} from 'lucide-react'
import type { Round, UserProfile } from '@/lib/types'


interface Highlight {
  icon: React.ElementType
  color: string
  title: string
  playerName: string
  playerPhoto: string
  value: string
  detail: string
}

function computeHighlights(
  rounds: Round[],
  userMap: Map<string, UserProfile>
): Highlight[] {
  const valid = rounds.filter((r) => r.isValid && (r.holeCount ?? 18) === 18)
  if (valid.length === 0) return []

  const highlights: Highlight[] = []
  const getName = (uid: string) => userMap.get(uid)?.displayName ?? 'Unknown'
  const getPhoto = (uid: string) => userMap.get(uid)?.photoURL ?? ''

  // 1. Lowest Gross Round
  const lowestGross = valid.reduce((best, r) => r.grossScore < best.grossScore ? r : best)
  highlights.push({
    icon: Trophy,
    color: 'text-yellow-600 bg-yellow-50',
    title: 'Lowest Gross Round',
    playerName: getName(lowestGross.uid),
    playerPhoto: getPhoto(lowestGross.uid),
    value: String(lowestGross.grossScore),
    detail: `${lowestGross.courseName} · ${formatMonthKey(lowestGross.month)}`,
  })

  // 2. Lowest Net Round
  const lowestNet = valid.reduce((best, r) => r.netScore < best.netScore ? r : best)
  highlights.push({
    icon: Target,
    color: 'text-green-600 bg-green-50',
    title: 'Lowest Net Round',
    playerName: getName(lowestNet.uid),
    playerPhoto: getPhoto(lowestNet.uid),
    value: String(lowestNet.netScore),
    detail: `${lowestNet.courseName} · ${formatMonthKey(lowestNet.month)}`,
  })

  // 3. Most Rounds Submitted
  const roundsByPlayer = new Map<string, number>()
  for (const r of valid) {
    roundsByPlayer.set(r.uid, (roundsByPlayer.get(r.uid) ?? 0) + 1)
  }
  const mostRoundsEntry = Array.from(roundsByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]
  if (mostRoundsEntry) {
    highlights.push({
      icon: Flag,
      color: 'text-blue-600 bg-blue-50',
      title: 'Most Rounds Played',
      playerName: getName(mostRoundsEntry[0]),
      playerPhoto: getPhoto(mostRoundsEntry[0]),
      value: String(mostRoundsEntry[1]),
      detail: 'valid rounds this season',
    })
  }

  // 4. Most Sand Saves (season total)
  const savesByPlayer = new Map<string, number>()
  for (const r of valid) {
    savesByPlayer.set(r.uid, (savesByPlayer.get(r.uid) ?? 0) + (r.sandSaves ?? 0))
  }
  const mostSavesEntry = Array.from(savesByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]
  if (mostSavesEntry && mostSavesEntry[1] > 0) {
    highlights.push({
      icon: Zap,
      color: 'text-yellow-600 bg-yellow-50',
      title: 'Most Sand Saves',
      playerName: getName(mostSavesEntry[0]),
      playerPhoto: getPhoto(mostSavesEntry[0]),
      value: String(mostSavesEntry[1]),
      detail: 'sand saves this season',
    })
  }

  // 5. Most Par-3 Pars (season total)
  const par3sByPlayer = new Map<string, number>()
  for (const r of valid) {
    par3sByPlayer.set(r.uid, (par3sByPlayer.get(r.uid) ?? 0) + (r.par3Pars ?? 0))
  }
  const mostPar3Entry = Array.from(par3sByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]
  if (mostPar3Entry && mostPar3Entry[1] > 0) {
    highlights.push({
      icon: Star,
      color: 'text-green-600 bg-green-50',
      title: 'Most Par-3 Pars',
      playerName: getName(mostPar3Entry[0]),
      playerPhoto: getPhoto(mostPar3Entry[0]),
      value: String(mostPar3Entry[1]),
      detail: 'par-3 pars this season',
    })
  }

  // 6. Best Differential
  const bestDiff = valid.reduce((best, r) => r.differentialScore < best.differentialScore ? r : best)
  highlights.push({
    icon: TrendingDown,
    color: 'text-purple-600 bg-purple-50',
    title: 'Best Differential',
    playerName: getName(bestDiff.uid),
    playerPhoto: getPhoto(bestDiff.uid),
    value: String(bestDiff.differentialScore),
    detail: `${bestDiff.courseName} · ${formatMonthKey(bestDiff.month)}`,
  })

  // 7. Longest Valid Streak (consecutive months with a valid round)
  const monthsByPlayer = new Map<string, Set<string>>()
  for (const r of valid) {
    const set = monthsByPlayer.get(r.uid) ?? new Set()
    set.add(r.month)
    monthsByPlayer.set(r.uid, set)
  }

  let bestStreakUid = ''
  let bestStreakLen = 0
  for (const [uid, months] of monthsByPlayer) {
    const sorted = Array.from(months).sort()
    let streak = 1
    let maxStreak = 1
    for (let i = 1; i < sorted.length; i++) {
      // Check if consecutive months
      const [prevY, prevM] = sorted[i - 1].split('-').map(Number)
      const [curY, curM] = sorted[i].split('-').map(Number)
      if ((curY === prevY && curM === prevM + 1) || (curY === prevY + 1 && prevM === 12 && curM === 1)) {
        streak++
      } else {
        streak = 1
      }
      maxStreak = Math.max(maxStreak, streak)
    }
    if (maxStreak > bestStreakLen) {
      bestStreakLen = maxStreak
      bestStreakUid = uid
    }
  }
  if (bestStreakUid && bestStreakLen > 1) {
    highlights.push({
      icon: Flame,
      color: 'text-orange-600 bg-orange-50',
      title: 'Longest Streak',
      playerName: getName(bestStreakUid),
      playerPhoto: getPhoto(bestStreakUid),
      value: `${bestStreakLen} months`,
      detail: 'consecutive months with a valid round',
    })
  }

  // 8. Most Improved (largest handicap drop based on differential trend)
  const firstLastByPlayer = new Map<string, { first: Round; last: Round }>()
  const sortedValid = [...valid].sort((a, b) => {
    const aTs = (a.submittedAt as any)?.seconds ?? 0
    const bTs = (b.submittedAt as any)?.seconds ?? 0
    return aTs - bTs
  })
  for (const r of sortedValid) {
    const entry = firstLastByPlayer.get(r.uid)
    if (!entry) {
      firstLastByPlayer.set(r.uid, { first: r, last: r })
    } else {
      entry.last = r
    }
  }

  let mostImprovedUid = ''
  let mostImprovedDrop = 0
  for (const [uid, { first, last }] of firstLastByPlayer) {
    if (first.id === last.id) continue // only one round
    const drop = first.differentialScore - last.differentialScore
    if (drop > mostImprovedDrop) {
      mostImprovedDrop = drop
      mostImprovedUid = uid
    }
  }
  if (mostImprovedUid && mostImprovedDrop > 0) {
    highlights.push({
      icon: Award,
      color: 'text-green-600 bg-green-50',
      title: 'Most Improved',
      playerName: getName(mostImprovedUid),
      playerPhoto: getPhoto(mostImprovedUid),
      value: `-${mostImprovedDrop.toFixed(1)}`,
      detail: 'differential drop from first to latest round',
    })
  }

  return highlights
}

// ─── Monthly winners ────────────────────────────────────────────────────────

interface MonthWinner {
  month: string
  grossWinner: { uid: string; name: string; photo: string; score: number } | null
  netWinner: { uid: string; name: string; photo: string; score: number } | null
}

function computeMonthlyWinners(
  rounds: Round[],
  userMap: Map<string, UserProfile>
): MonthWinner[] {
  const valid = rounds.filter((r) => r.isValid && (r.holeCount ?? 18) === 18)
  const byMonth = new Map<string, Round[]>()
  for (const r of valid) {
    const arr = byMonth.get(r.month) ?? []
    arr.push(r)
    byMonth.set(r.month, arr)
  }

  const getName = (uid: string) => userMap.get(uid)?.displayName ?? 'Unknown'
  const getPhoto = (uid: string) => userMap.get(uid)?.photoURL ?? ''

  return Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, monthRounds]) => {
      // Best per player
      const bestGross = new Map<string, Round>()
      const bestNet = new Map<string, Round>()
      for (const r of monthRounds) {
        const eg = bestGross.get(r.uid)
        if (!eg || r.grossScore < eg.grossScore) bestGross.set(r.uid, r)
        const en = bestNet.get(r.uid)
        if (!en || r.netScore < en.netScore) bestNet.set(r.uid, r)
      }

      const grossArr = Array.from(bestGross.values()).sort((a, b) => a.grossScore - b.grossScore)
      const netArr = Array.from(bestNet.values()).sort((a, b) => a.netScore - b.netScore)

      return {
        month,
        grossWinner: grossArr[0] ? {
          uid: grossArr[0].uid,
          name: getName(grossArr[0].uid),
          photo: getPhoto(grossArr[0].uid),
          score: grossArr[0].grossScore,
        } : null,
        netWinner: netArr[0] ? {
          uid: netArr[0].uid,
          name: getName(netArr[0].uid),
          photo: getPhoto(netArr[0].uid),
          score: netArr[0].netScore,
        } : null,
      }
    })
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function HighlightsPage() {
  const { season } = useActiveSeason()
  const { users } = useUsers()
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!season) { setLoading(false); return }
    getSeasonRounds(season.id)
      .then(setRounds)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [season])

  const userMap = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users])
  const highlights = useMemo(() => computeHighlights(rounds, userMap), [rounds, userMap])
  const monthlyWinners = useMemo(() => computeMonthlyWinners(rounds, userMap), [rounds, userMap])

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-green-600" />
          Season Highlights
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season?.year ?? ''} PITY Tour records and achievements
        </p>
      </div>

      {/* Highlight cards */}
      {highlights.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No highlights yet</p>
          <p className="text-sm mt-1">Records will appear as rounds are submitted this season.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {highlights.map((h) => {
            const Icon = h.icon
            return (
              <Card key={h.title}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${h.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {h.title}
                      </p>
                      <p className="text-2xl font-black mt-0.5">{h.value}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={h.playerPhoto} />
                          <AvatarFallback>{h.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate">{h.playerName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{h.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Monthly Champions */}
      {monthlyWinners.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              Monthly Champions
            </CardTitle>
            <CardDescription>
              Top gross and net scorer each month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyWinners.map((mw) => (
                <div key={mw.month} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-16 shrink-0">
                    <p className="text-sm font-bold">{formatMonthKey(mw.month).split(' ')[0]}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {/* Gross winner */}
                    {mw.grossWinner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={mw.grossWinner.photo} />
                          <AvatarFallback>{mw.grossWinner.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{mw.grossWinner.name}</p>
                          <p className="text-xs text-muted-foreground">{mw.grossWinner.score} gross</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {/* Net winner */}
                    {mw.netWinner ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={mw.netWinner.photo} />
                          <AvatarFallback>{mw.netWinner.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{mw.netWinner.name}</p>
                          <p className="text-xs text-green-700">{mw.netWinner.score} net</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
