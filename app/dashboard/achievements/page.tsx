'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { getSeasonRounds } from '@/lib/firebase/firestore'
import { evaluateBadges, type Badge } from '@/lib/utils/badges'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge as UIBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Medal, Lock } from 'lucide-react'
import type { Round } from '@/lib/types'


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

function BadgeCard({ badge }: { badge: Badge }) {
  const earned = badge.earned

  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all ${
        earned
          ? `${tierColors[badge.tier]} shadow-sm`
          : 'border-dashed border-muted bg-muted/30 opacity-60'
      }`}
    >
      {/* Emoji */}
      <div className="text-3xl mb-2">{earned ? badge.emoji : '🔒'}</div>

      {/* Name + tier */}
      <div className="flex items-center gap-2 mb-1">
        <p className={`font-bold text-sm ${earned ? '' : 'text-muted-foreground'}`}>
          {badge.name}
        </p>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tierBadgeColors[badge.tier]}`}>
          {badge.tier}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">{badge.description}</p>

      {/* Detail or progress */}
      <p className={`text-xs mt-2 font-medium ${earned ? 'text-green-700' : 'text-muted-foreground'}`}>
        {earned ? badge.detail : badge.progress}
      </p>
    </div>
  )
}

export default function AchievementsPage() {
  const { profile, user } = useAuth()
  const { season } = useActiveSeason()
  const { rounds: playerRounds, loading: roundsLoading } = usePlayerRounds(profile?.uid)
  const [allRounds, setAllRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!season) { setLoading(false); return }
    getSeasonRounds(season.id)
      .then(setAllRounds)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [season])

  const badges = useMemo(
    () => user ? evaluateBadges(playerRounds, allRounds, user.uid) : [],
    [playerRounds, allRounds, user]
  )

  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)
  const totalCount = badges.length
  const earnedCount = earned.length

  if (roundsLoading || loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Medal className="w-6 h-6 text-green-600" />
          Achievements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {earnedCount} of {totalCount} badges earned
        </p>
      </div>

      {/* Progress summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl font-black text-green-700">{earnedCount}</div>
            <div>
              <p className="font-semibold text-sm">Badges Earned</p>
              <p className="text-xs text-muted-foreground">
                {locked.length} remaining to unlock
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="h-3 rounded-full bg-green-500 transition-all"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {/* Tier summary */}
          <div className="flex gap-3 mt-3">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => {
              const tierEarned = earned.filter((b) => b.tier === tier).length
              const tierTotal = badges.filter((b) => b.tier === tier).length
              return (
                <div key={tier} className="text-center">
                  <p className={`text-sm font-bold ${tierBadgeColors[tier].split(' ')[1]}`}>
                    {tierEarned}/{tierTotal}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{tier}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badge tabs */}
      <Tabs defaultValue="earned">
        <TabsList className="w-full">
          <TabsTrigger value="earned" className="flex-1">
            Earned ({earnedCount})
          </TabsTrigger>
          <TabsTrigger value="locked" className="flex-1">
            Locked ({locked.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">
            All ({totalCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="mt-4">
          {earned.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No badges earned yet</p>
              <p className="text-sm mt-1">Submit your first round to start unlocking achievements!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {earned.map((b) => <BadgeCard key={b.id} badge={b} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {locked.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
