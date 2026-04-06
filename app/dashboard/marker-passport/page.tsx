'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { formatMonthKey } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Stamp,
  CheckCircle2,
  Star,
  Trophy,
  Target,
} from 'lucide-react'
import type { Round, UserProfile } from '@/lib/types'


const MIN_UNIQUE_MARKERS = 4
const POINTS_PER_MARKER = 5

interface MarkerEntry {
  uid: string
  name: string
  photoURL: string
  firstAttestedMonth: string
  roundCount: number      // how many of your rounds they attested
  firstAttestedAt: number // timestamp seconds for sorting
}

function extractUniqueMarkers(rounds: Round[]): MarkerEntry[] {
  const markerMap = new Map<string, MarkerEntry>()

  for (const round of rounds) {
    if (!round.isValid) continue
    for (const att of round.attestations) {
      const existing = markerMap.get(att.attestorUid)
      const ts = (att.attestedAt as any)?.seconds ?? 0
      if (existing) {
        existing.roundCount++
        if (ts < existing.firstAttestedAt) {
          existing.firstAttestedAt = ts
          existing.firstAttestedMonth = round.month
        }
      } else {
        markerMap.set(att.attestorUid, {
          uid: att.attestorUid,
          name: att.attestorName,
          photoURL: '',
          firstAttestedMonth: round.month,
          roundCount: 1,
          firstAttestedAt: ts,
        })
      }
    }
  }

  return Array.from(markerMap.values()).sort(
    (a, b) => a.firstAttestedAt - b.firstAttestedAt
  )
}

export default function MarkerPassportPage() {
  const { profile } = useAuth()
  const { users } = useUsers()
  const { rounds, loading } = usePlayerRounds(profile?.uid)

  const markers = useMemo(() => {
    const entries = extractUniqueMarkers(rounds)
    // Enrich with current photo from users context
    const userMap = new Map(users.map((u) => [u.uid, u]))
    return entries.map((m) => ({
      ...m,
      photoURL: userMap.get(m.uid)?.photoURL ?? '',
      name: userMap.get(m.uid)?.displayName ?? m.name,
    }))
  }, [rounds, users])

  const uniqueCount = markers.length
  const meetsRequirement = uniqueCount >= MIN_UNIQUE_MARKERS
  const bonusPoints = uniqueCount * POINTS_PER_MARKER

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stamp className="w-6 h-6 text-green-600" />
          Marker Passport
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your unique attestors throughout the season
        </p>
      </div>

      {/* Progress card */}
      <Card className={meetsRequirement ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-black">
                {uniqueCount}
                <span className="text-lg font-normal text-muted-foreground">
                  /{MIN_UNIQUE_MARKERS}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">Unique Markers</p>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              meetsRequirement ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {meetsRequirement ? (
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              ) : (
                <Target className="w-7 h-7 text-yellow-600" />
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all ${
                meetsRequirement ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min((uniqueCount / MIN_UNIQUE_MARKERS) * 100, 100)}%` }}
            />
          </div>

          <p className={`text-sm font-medium ${meetsRequirement ? 'text-green-800' : 'text-yellow-800'}`}>
            {meetsRequirement
              ? 'Marker requirement met! You\'re in good standing.'
              : `${MIN_UNIQUE_MARKERS - uniqueCount} more unique marker${MIN_UNIQUE_MARKERS - uniqueCount !== 1 ? 's' : ''} needed for the season requirement.`
            }
          </p>
        </CardContent>
      </Card>

      {/* Bonus points card */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Marker Bonus Points</p>
              <p className="text-xs text-muted-foreground">
                {POINTS_PER_MARKER} pts per unique marker
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-green-700">{bonusPoints}</p>
            <p className="text-xs text-muted-foreground">pts earned</p>
          </div>
        </CardContent>
      </Card>

      {/* Marker stamps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            Your Markers
          </CardTitle>
          <CardDescription>
            Each Tour member who has attested one of your rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {markers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stamp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No markers yet.</p>
              <p className="text-xs mt-1">
                Get a playing partner to scan your QR code after your round.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {markers.map((marker, i) => (
                  <div
                    key={marker.uid}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100"
                  >
                    {/* Stamp number */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-green-600 text-white">
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={marker.photoURL} />
                      <AvatarFallback>{marker.name[0]}</AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{marker.name}</p>
                      <p className="text-xs text-muted-foreground">
                        First: {formatMonthKey(marker.firstAttestedMonth)}
                        {' · '}{marker.roundCount} round{marker.roundCount !== 1 ? 's' : ''} attested
                      </p>
                    </div>

                    {/* Points badge */}
                    <Badge variant="success" className="text-xs shrink-0">
                      +{POINTS_PER_MARKER} pts
                    </Badge>
                  </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules reminder */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">Marker Passport Rules:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Each round must be attested by a Tour member who played with you</li>
            <li>You need at least {MIN_UNIQUE_MARKERS} different markers over the season</li>
            <li>Each new unique marker earns {POINTS_PER_MARKER} bonus points</li>
            <li>Players in region-limited areas may qualify under modified requirements</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
