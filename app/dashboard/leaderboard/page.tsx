'use client'

import { useState } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { useMonthLeaderboard, useSeasonLeaderboard } from '@/lib/hooks/useLeaderboard'
import { getCurrentMonthKey, formatMonthKey, getSeasonMonths } from '@/lib/utils/dates'
import { getMedalEmoji, getRankSuffix } from '@/lib/utils/scoring'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Trophy, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { LeaderboardEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

function LeaderboardRow({
  entry,
  type,
  currentUid,
}: {
  entry: LeaderboardEntry
  type: 'gross' | 'net'
  currentUid: string
}) {
  const rank = entry.rank ?? 0
  const isCurrentUser = entry.uid === currentUid

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isCurrentUser
          ? 'bg-green-50 border border-green-200'
          : rank <= 3
          ? 'bg-yellow-50'
          : ''
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {rank <= 3 ? (
          <span className="text-xl">{getMedalEmoji(rank)}</span>
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={entry.photoURL} />
        <AvatarFallback>{entry.displayName[0]}</AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${isCurrentUser ? 'text-green-800' : ''}`}>
          {entry.displayName}
          {isCurrentUser && (
            <span className="ml-1 text-xs text-green-600">(You)</span>
          )}
        </p>
        {entry.roundsPlayed > 0 && (
          <p className="text-xs text-muted-foreground">
            {entry.roundsPlayed} round{entry.roundsPlayed !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Score / Points */}
      <div className="text-right shrink-0">
        {type === 'gross' && entry.grossScore !== undefined ? (
          <>
            <p className="font-bold">{entry.grossScore}</p>
            <p className="text-xs text-muted-foreground">{entry.grossPoints} pts</p>
          </>
        ) : type === 'net' && entry.netScore !== undefined ? (
          <>
            <p className="font-bold text-green-700">{entry.netScore}</p>
            <p className="text-xs text-muted-foreground">{entry.netPoints} pts</p>
          </>
        ) : (
          <>
            <p className="font-bold">
              {type === 'gross' ? entry.grossPoints : entry.netPoints}
            </p>
            <p className="text-xs text-muted-foreground">pts</p>
          </>
        )}
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

function EmptyLeaderboard() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No valid rounds submitted yet</p>
    </div>
  )
}

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const { season } = useActiveSeason()
  const currentMonth = getCurrentMonthKey()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const { grossStandings: monthGross, netStandings: monthNet, loading: monthLoading } =
    useMonthLeaderboard(season?.id, selectedMonth)

  const { grossStandings: seasonGross, netStandings: seasonNet, loading: seasonLoading } =
    useSeasonLeaderboard(season?.id)

  const seasonMonths = season
    ? getSeasonMonths(season.year, season.startMonth, season.endMonth)
    : [currentMonth]

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-green-600" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monthly & Season standings
        </p>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full">
          <TabsTrigger value="monthly" className="flex-1">
            Monthly
          </TabsTrigger>
          <TabsTrigger value="season" className="flex-1">
            Season
          </TabsTrigger>
        </TabsList>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasonMonths.reverse().map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthKey(month)}
                    {month === currentMonth ? ' (Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="gross">
            <TabsList className="w-full">
              <TabsTrigger value="gross" className="flex-1">
                Gross
              </TabsTrigger>
              <TabsTrigger value="net" className="flex-1">
                Net (Handicap)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gross" className="mt-3">
              {monthLoading ? (
                <LeaderboardSkeleton />
              ) : monthGross.length === 0 ? (
                <EmptyLeaderboard />
              ) : (
                <div className="space-y-1.5">
                  {monthGross.map((entry) => (
                    <LeaderboardRow
                      key={entry.uid}
                      entry={entry}
                      type="gross"
                      currentUid={profile?.uid ?? ''}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="net" className="mt-3">
              {monthLoading ? (
                <LeaderboardSkeleton />
              ) : monthNet.length === 0 ? (
                <EmptyLeaderboard />
              ) : (
                <div className="space-y-1.5">
                  {monthNet.map((entry) => (
                    <LeaderboardRow
                      key={entry.uid}
                      entry={entry}
                      type="net"
                      currentUid={profile?.uid ?? ''}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Season Tab */}
        <TabsContent value="season" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3 text-center">
                <Trophy className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-yellow-800">
                  Gross Champion
                </p>
                <p className="font-bold text-sm mt-1">
                  {seasonGross[0]?.displayName ?? '—'}
                </p>
                <p className="text-xs text-yellow-700">
                  {seasonGross[0]?.grossPoints ?? 0} pts
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-800">
                  Net Champion
                </p>
                <p className="font-bold text-sm mt-1">
                  {seasonNet[0]?.displayName ?? '—'}
                </p>
                <p className="text-xs text-green-700">
                  {seasonNet[0]?.netPoints ?? 0} pts
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="gross">
            <TabsList className="w-full">
              <TabsTrigger value="gross" className="flex-1">
                Gross Championship
              </TabsTrigger>
              <TabsTrigger value="net" className="flex-1">
                Net Championship
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gross" className="mt-3">
              {seasonLoading ? (
                <LeaderboardSkeleton />
              ) : seasonGross.length === 0 ? (
                <EmptyLeaderboard />
              ) : (
                <div className="space-y-1.5">
                  {seasonGross.map((entry) => (
                    <LeaderboardRow
                      key={entry.uid}
                      entry={entry}
                      type="gross"
                      currentUid={profile?.uid ?? ''}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="net" className="mt-3">
              {seasonLoading ? (
                <LeaderboardSkeleton />
              ) : seasonNet.length === 0 ? (
                <EmptyLeaderboard />
              ) : (
                <div className="space-y-1.5">
                  {seasonNet.map((entry) => (
                    <LeaderboardRow
                      key={entry.uid}
                      entry={entry}
                      type="net"
                      currentUid={profile?.uid ?? ''}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
