'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { getSeasonRounds, getHandicapHistory } from '@/lib/firebase/firestore'
import { HandicapChart } from '@/components/charts/HandicapChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Search, TrendingDown, TrendingUp } from 'lucide-react'
import type { Round, UserProfile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function HandicapReviewPage() {
  const { profile, loading: authLoading } = useAuth()
  const { users } = useUsers()
  const { season } = useActiveSeason()
  const router = useRouter()

  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUid, setSelectedUid] = useState<string | null>(null)

  // Guard: only handicap_chair or admin
  useEffect(() => {
    if (authLoading) return
    const hasAccess = profile?.isAdmin || profile?.roles?.includes('handicap_chair')
    if (!hasAccess) {
      router.replace('/dashboard')
    }
  }, [profile, authLoading, router])

  useEffect(() => {
    if (!season) return
    getSeasonRounds(season.id)
      .then(setRounds)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [season])

  // Per-player stats
  const playerStats = useMemo(() => {
    const stats = new Map<string, {
      rounds: number
      avgGross: number
      avgNet: number
      bestGross: number
      bestNet: number
      avgDiff: number
    }>()

    const byPlayer = new Map<string, Round[]>()
    for (const r of rounds) {
      if (!r.isValid || (r.holeCount ?? 18) !== 18) continue
      const arr = byPlayer.get(r.uid) ?? []
      arr.push(r)
      byPlayer.set(r.uid, arr)
    }

    for (const [uid, playerRounds] of byPlayer) {
      const n = playerRounds.length
      stats.set(uid, {
        rounds: n,
        avgGross: Math.round(playerRounds.reduce((s, r) => s + r.grossScore, 0) / n * 10) / 10,
        avgNet: Math.round(playerRounds.reduce((s, r) => s + r.netScore, 0) / n * 10) / 10,
        bestGross: Math.min(...playerRounds.map((r) => r.grossScore)),
        bestNet: Math.min(...playerRounds.map((r) => r.netScore)),
        avgDiff: Math.round(playerRounds.reduce((s, r) => s + r.differentialScore, 0) / n * 10) / 10,
      })
    }

    return stats
  }, [rounds])

  const filtered = users
    .filter((u) => u.displayName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.handicapIndex ?? 99) - (b.handicapIndex ?? 99))

  const selectedPlayer = selectedUid ? users.find((u) => u.uid === selectedUid) : null
  const selectedStats = selectedUid ? playerStats.get(selectedUid) : null
  const selectedRounds = selectedUid
    ? rounds.filter((r) => r.uid === selectedUid && r.isValid && (r.holeCount ?? 18) === 18)
        .sort((a, b) => ((b.submittedAt as any)?.seconds ?? 0) - ((a.submittedAt as any)?.seconds ?? 0))
    : []

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-green-600" />
          Handicap Review
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review all players&apos; scoring history and handicap data
        </p>
      </div>

      {/* Player selector */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="pl-9"
        />
      </div>

      {/* Player list */}
      {!selectedUid && (
        <div className="space-y-2">
          {filtered.map((player) => {
            const stats = playerStats.get(player.uid)
            return (
              <button
                key={player.uid}
                onClick={() => setSelectedUid(player.uid)}
                className="w-full text-left"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={player.photoURL} />
                      <AvatarFallback>{player.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats ? `${stats.rounds} rounds · Avg diff: ${stats.avgDiff}` : 'No rounds'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{player.handicapIndex}</p>
                      <p className="text-xs text-muted-foreground">HCP</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected player detail */}
      {selectedPlayer && (
        <>
          <button
            onClick={() => setSelectedUid(null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to all players
          </button>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedPlayer.photoURL} />
                <AvatarFallback>{selectedPlayer.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-lg">{selectedPlayer.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Current HCP: <span className="font-bold text-foreground">{selectedPlayer.handicapIndex}</span>
                  {selectedPlayer.ghinNumber && ` · GHIN: ${selectedPlayer.ghinNumber}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Handicap chart */}
          <HandicapChart uid={selectedPlayer.uid} currentIndex={selectedPlayer.handicapIndex} />

          {/* Stats summary */}
          {selectedStats && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{selectedStats.avgGross}</p>
                  <p className="text-xs text-muted-foreground">Avg Gross</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{selectedStats.avgNet}</p>
                  <p className="text-xs text-muted-foreground">Avg Net</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{selectedStats.avgDiff}</p>
                  <p className="text-xs text-muted-foreground">Avg Diff</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scoring history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scoring History</CardTitle>
              <CardDescription>{selectedRounds.length} valid 18-hole rounds</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No rounds recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-3 font-medium">Course</th>
                        <th className="py-2 px-2 font-medium text-center">Gross</th>
                        <th className="py-2 px-2 font-medium text-center">Net</th>
                        <th className="py-2 px-2 font-medium text-center">Diff</th>
                        <th className="py-2 px-2 font-medium">Month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRounds.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium truncate max-w-[140px]">{r.courseName}</td>
                          <td className="py-2 px-2 text-center">{r.grossScore}</td>
                          <td className="py-2 px-2 text-center text-green-700">{r.netScore}</td>
                          <td className="py-2 px-2 text-center">{r.differentialScore}</td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">{r.month}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
