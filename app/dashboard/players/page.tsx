'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { subscribeToSeasonPoints } from '@/lib/firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Search, MapPin, Trophy, TrendingUp, Hash, Swords } from 'lucide-react'
import { RoleBadge } from '@/components/elections/RoleBadge'
import type { Points } from '@/lib/types'

export default function PlayersPage() {
  const { profile, isDemo } = useAuth()
  const { users, loading } = useUsers()
  const { season } = useActiveSeason()
  const [search, setSearch] = useState('')
  const [allPoints, setAllPoints] = useState<Points[]>([])
  const [selectedUid, setSelectedUid] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo || !season) return
    const unsub = subscribeToSeasonPoints(season.id, setAllPoints)
    return unsub
  }, [season, isDemo])

  // Aggregate points per player and compute ranks
  const playerStats = useMemo(() => {
    const totals = new Map<string, number>()
    for (const pts of allPoints) {
      totals.set(pts.uid, (totals.get(pts.uid) ?? 0) + pts.totalMonthlyPoints)
    }
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
    const ranks = new Map<string, number>()
    sorted.forEach(([uid], i) => ranks.set(uid, i + 1))
    return { totals, ranks }
  }, [allPoints])

  const filtered = users
    .filter((p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          Tour Players
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {users.length} member{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="pl-9"
        />
      </div>

      {/* Player cards */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {search ? 'No players match your search' : 'No players registered yet'}
            </p>
          </div>
        ) : (
          filtered.map((player) => {
            const isYou = player.uid === profile?.uid
            const isLfg = player.lookingForPartner
            const rank = playerStats.ranks.get(player.uid)
            const points = playerStats.totals.get(player.uid) ?? 0
            const isFlipped = selectedUid === player.uid
            const rec = player.exhibitionRecord ?? { wins: 0, losses: 0, ties: 0 }
            const exhibTotal = rec.wins + rec.losses + rec.ties

            return (
              <div
                key={player.uid}
                className="perspective cursor-pointer"
                onClick={() => setSelectedUid(isFlipped ? null : player.uid)}
              >
                <div className={`flip-inner ${isFlipped ? 'flipped' : ''}`}>
                  {/* ── FRONT ──────────────────────────────────── */}
                  <Card
                    className={`flip-face overflow-hidden ${
                      isYou
                        ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800'
                        : ''
                    }`}
                  >
                    <div className="relative bg-gradient-to-br from-green-600 to-green-800 dark:from-green-800 dark:to-green-950 p-4 pb-10">
                      {rank && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white text-xs font-black">
                            {rank <= 3 ? ['', '🥇', '🥈', '🥉'][rank] : `#${rank}`}
                          </span>
                        </div>
                      )}
                      {isLfg && (
                        <Badge variant="warning" className="absolute top-2 left-2 text-xs">
                          <MapPin className="w-3 h-3 mr-0.5" />
                          LFG
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3 -mt-8 relative">
                      <div className="flex justify-center mb-2">
                        <Avatar className="w-16 h-16 border-4 border-background shadow-lg">
                          <AvatarImage src={player.photoURL} />
                          <AvatarFallback className="text-xl font-bold">
                            {player.displayName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="text-center mb-3">
                        <p className="font-bold text-sm truncate">{player.displayName}</p>
                        <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
                          {isYou && <Badge variant="success" className="text-xs">You</Badge>}
                          {player.isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
                          {player.roles?.map((role) => (
                            <RoleBadge key={role} officeKey={role} />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <StatBlock icon={Hash} label="HCP" value={String(player.handicapIndex)} />
                        <StatBlock icon={TrendingUp} label="Points" value={String(points || '—')} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── BACK ───────────────────────────────────── */}
                  <Card
                    className={`flip-face flip-back overflow-hidden ${
                      isYou
                        ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800'
                        : ''
                    }`}
                  >
                    <div className="bg-gradient-to-br from-green-600 to-green-800 dark:from-green-800 dark:to-green-950 p-3">
                      <p className="text-white font-bold text-sm truncate text-center">{player.displayName}</p>
                      <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
                        {isYou && <Badge variant="success" className="text-xs">You</Badge>}
                        {player.roles?.map((role) => (
                          <RoleBadge key={role} officeKey={role} />
                        ))}
                      </div>
                    </div>
                    <CardContent className="p-3 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <StatBlock icon={Trophy} label="Rank" value={rank ? `#${rank}` : '—'} />
                        <StatBlock icon={Hash} label="HCP" value={String(player.handicapIndex)} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <StatBlock icon={TrendingUp} label="Points" value={String(points || '—')} />
                        <StatBlock
                          icon={Swords}
                          label="Exhibition"
                          value={exhibTotal > 0 ? `${rec.wins}-${rec.losses}-${rec.ties}` : '—'}
                        />
                      </div>
                      {player.lookingForPartnerNote && isLfg && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {player.lookingForPartnerNote}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground text-center pt-1 opacity-50">
                        Tap to flip back
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatBlock({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
      <p className="text-sm font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
