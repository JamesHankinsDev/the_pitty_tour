'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { getSeasonRounds } from '@/lib/firebase/firestore'
import { evaluateBadges, type Badge as BadgeType } from '@/lib/utils/badges'
import { formatMonthKey } from '@/lib/utils/dates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Award, Stamp, CheckCircle2, Target, Star } from 'lucide-react'
import type { Round } from '@/lib/types'


const MIN_UNIQUE_MARKERS = 4
const POINTS_PER_MARKER = 5

const tierColors = {
  bronze: 'border-orange-300 bg-orange-50',
  silver: 'border-gray-300 bg-gray-50',
  gold: 'border-yellow-300 bg-yellow-50',
  platinum: 'border-purple-300 bg-purple-50',
}
const tierBadgeColors = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

export default function MyProgressPage() {
  const { profile, user } = useAuth()
  const { users } = useUsers()
  const { season } = useActiveSeason()
  const { rounds: playerRounds, loading: roundsLoading } = usePlayerRounds(profile?.uid)
  const [allRounds, setAllRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!season) { setLoading(false); return }
    getSeasonRounds(season.id).then(setAllRounds).catch(() => {}).finally(() => setLoading(false))
  }, [season])

  // Badges
  const badges = useMemo(
    () => user ? evaluateBadges(playerRounds, allRounds, user.uid) : [],
    [playerRounds, allRounds, user]
  )
  const earnedBadges = badges.filter((b) => b.earned)
  const lockedBadges = badges.filter((b) => !b.earned)

  // Markers
  const markers = useMemo(() => {
    const markerMap = new Map<string, { uid: string; name: string; photoURL: string; firstMonth: string; roundCount: number; firstTs: number }>()
    const userMap = new Map(users.map((u) => [u.uid, u]))
    for (const round of playerRounds) {
      if (!round.isValid) continue
      for (const att of round.attestations) {
        const existing = markerMap.get(att.attestorUid)
        const ts = (att.attestedAt as any)?.seconds ?? 0
        if (existing) {
          existing.roundCount++
          if (ts < existing.firstTs) { existing.firstTs = ts; existing.firstMonth = round.month }
        } else {
          const u = userMap.get(att.attestorUid)
          markerMap.set(att.attestorUid, {
            uid: att.attestorUid,
            name: u?.displayName ?? att.attestorName,
            photoURL: u?.photoURL ?? '',
            firstMonth: round.month,
            roundCount: 1,
            firstTs: ts,
          })
        }
      }
    }
    return Array.from(markerMap.values()).sort((a, b) => a.firstTs - b.firstTs)
  }, [playerRounds, users])

  const uniqueMarkers = markers.length
  const meetsRequirement = uniqueMarkers >= MIN_UNIQUE_MARKERS
  const bonusPoints = uniqueMarkers * POINTS_PER_MARKER

  if (roundsLoading || loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-green-600" />
          My Progress
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Achievements and marker passport
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-green-700">{earnedBadges.length}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black">{uniqueMarkers}/{MIN_UNIQUE_MARKERS}</p>
            <p className="text-xs text-muted-foreground">Markers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-yellow-600">+{bonusPoints}</p>
            <p className="text-xs text-muted-foreground">Marker Pts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges">
        <TabsList className="w-full">
          <TabsTrigger value="badges" className="flex-1">
            Badges ({earnedBadges.length}/{badges.length})
          </TabsTrigger>
          <TabsTrigger value="passport" className="flex-1">
            Passport ({uniqueMarkers})
          </TabsTrigger>
        </TabsList>

        {/* Badges tab */}
        <TabsContent value="badges" className="mt-4 space-y-4">
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="w-full bg-muted rounded-full h-3 mb-2">
                <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${badges.length > 0 ? (earnedBadges.length / badges.length) * 100 : 0}%` }} />
              </div>
              <div className="flex gap-3">
                {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
                  <div key={tier} className="text-center">
                    <p className={`text-sm font-bold ${tierBadgeColors[tier].split(' ')[1]}`}>
                      {earnedBadges.filter((b) => b.tier === tier).length}/{badges.filter((b) => b.tier === tier).length}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{tier}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Earned */}
          {earnedBadges.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {earnedBadges.map((b) => (
                <div key={b.id} className={`rounded-xl border-2 p-3 ${tierColors[b.tier]}`}>
                  <div className="text-2xl mb-1">{b.emoji}</div>
                  <p className="font-bold text-xs">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  <p className="text-xs text-green-700 mt-1">{b.earned ? b.detail : ''}</p>
                </div>
              ))}
            </div>
          )}

          {/* Locked */}
          {lockedBadges.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locked</p>
              <div className="grid grid-cols-2 gap-2">
                {lockedBadges.map((b) => (
                  <div key={b.id} className="rounded-xl border-2 border-dashed border-muted bg-muted/30 p-3 opacity-60">
                    <div className="text-2xl mb-1">🔒</div>
                    <p className="font-bold text-xs text-muted-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{!b.earned ? b.progress : ''}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Passport tab */}
        <TabsContent value="passport" className="mt-4 space-y-4">
          {/* Progress */}
          <Card className={meetsRequirement ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-2xl font-black">{uniqueMarkers}<span className="text-lg font-normal text-muted-foreground">/{MIN_UNIQUE_MARKERS}</span></p>
                  <p className="text-sm text-muted-foreground">Unique Markers</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${meetsRequirement ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {meetsRequirement ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <Target className="w-6 h-6 text-yellow-600" />}
                </div>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${meetsRequirement ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min((uniqueMarkers / MIN_UNIQUE_MARKERS) * 100, 100)}%` }} />
              </div>
              <p className={`text-xs mt-2 font-medium ${meetsRequirement ? 'text-green-800' : 'text-yellow-800'}`}>
                {meetsRequirement ? 'Requirement met!' : `${MIN_UNIQUE_MARKERS - uniqueMarkers} more needed`}
              </p>
            </CardContent>
          </Card>

          {/* Bonus */}
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">Marker Bonus</p>
                  <p className="text-xs text-muted-foreground">{POINTS_PER_MARKER} pts per marker</p>
                </div>
              </div>
              <p className="text-xl font-black text-green-700">+{bonusPoints}</p>
            </CardContent>
          </Card>

          {/* Marker list */}
          {markers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stamp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No markers yet. Get a partner to scan your QR.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {markers.map((m, i) => (
                <div key={m.uid} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-green-600 text-white">{i + 1}</div>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback>{m.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">First: {formatMonthKey(m.firstMonth)} &middot; {m.roundCount} round{m.roundCount !== 1 ? 's' : ''}</p>
                  </div>
                  <Badge variant="success" className="text-xs">+{POINTS_PER_MARKER}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
