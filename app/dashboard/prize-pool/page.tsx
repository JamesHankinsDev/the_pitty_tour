'use client'

import { useState, useEffect } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { useMonthLeaderboard } from '@/lib/hooks/useLeaderboard'
import {
  getSeasonRegistrations,
} from '@/lib/firebase/firestore'
import {
  calculateMonthlyPrizes,
  calculateChampionshipPrizes,
} from '@/lib/utils/scoring'
import {
  getCurrentMonthKey,
  formatMonthKey,
  getSeasonMonths,
} from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Trophy, AlertTriangle, Users } from 'lucide-react'
import type { Registration, Season } from '@/lib/types'

export const dynamic = 'force-dynamic'

function MoneyAmount({ amount }: { amount: number }) {
  return (
    <span className="font-bold text-green-700">
      ${amount.toLocaleString()}
    </span>
  )
}

function PrizeRow({
  label,
  percentage,
  amount,
  winner,
}: {
  label: string
  percentage: number
  amount: number
  winner?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{(percentage * 100).toFixed(0)}% of pool</p>
      </div>
      <div className="text-right">
        <MoneyAmount amount={amount} />
        {winner && (
          <p className="text-xs text-muted-foreground">{winner}</p>
        )}
      </div>
    </div>
  )
}

function PoolSummaryCard({
  title,
  amount,
  description,
  icon: Icon,
  color = 'green',
}: {
  title: string
  amount: number
  description: string
  icon: React.ElementType
  color?: 'green' | 'gold' | 'blue'
}) {
  const colorMap = {
    green: 'text-green-700 bg-green-50',
    gold: 'text-yellow-700 bg-yellow-50',
    blue: 'text-blue-700 bg-blue-50',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-black mt-0.5">
              ${amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <div className={`p-2 rounded-lg shrink-0 ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PrizePoolPage() {
  const { season, loading: seasonLoading } = useActiveSeason()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())

  const { grossStandings: monthGross, netStandings: monthNet } =
    useMonthLeaderboard(season?.id, selectedMonth)

  useEffect(() => {
    if (!season) return
    setLoadingRegs(true)
    getSeasonRegistrations(season.id)
      .then(setRegistrations)
      .finally(() => setLoadingRegs(false))
  }, [season])

  if (seasonLoading || loadingRegs) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="p-4 lg:p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
        <p className="text-lg font-semibold">No Active Season</p>
        <p className="text-muted-foreground text-sm mt-1">
          No season is currently active.
        </p>
      </div>
    )
  }

  const paidRegistrations = registrations.filter((r) => r.hasPaidRegistration)
  const totalForfeits = registrations.reduce(
    (s, r) => s + r.totalForfeited,
    0
  )

  // Monthly pool: players who paid their monthly due
  // (simplified: count of registrations × monthly due)
  const monthlyPoolPlayers = registrations.length
  const monthlyPool = monthlyPoolPlayers * season.monthlyDue
  const monthlyPrizes = calculateMonthlyPrizes(monthlyPool)

  // Championship pool: registration fees + all forfeits
  const regFeePool = paidRegistrations.length * season.registrationFee
  const championshipPool = regFeePool + totalForfeits
  const championshipPrizes = calculateChampionshipPrizes(championshipPool)

  const seasonMonths = getSeasonMonths(
    season.year,
    season.startMonth,
    season.endMonth
  )

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Prize Pool
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season.year} Season · {registrations.length} registered players
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <PoolSummaryCard
          title="Monthly Pool"
          amount={monthlyPool}
          description={`${monthlyPoolPlayers} players × $${season.monthlyDue}`}
          icon={DollarSign}
          color="green"
        />
        <PoolSummaryCard
          title="Championship Pool"
          amount={championshipPool}
          description="Reg fees + forfeits"
          icon={Trophy}
          color="gold"
        />
        <PoolSummaryCard
          title="Registered"
          amount={paidRegistrations.length}
          description={`of ${registrations.length} total`}
          icon={Users}
          color="blue"
        />
        <PoolSummaryCard
          title="Total Forfeits"
          amount={totalForfeits}
          description="added to championship"
          icon={AlertTriangle}
          color="gold"
        />
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="w-full">
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
          <TabsTrigger value="season" className="flex-1">Season Championship</TabsTrigger>
        </TabsList>

        {/* Monthly */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          {/* Month selector */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...seasonMonths].reverse().map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthKey(m)}
                  {m === getCurrentMonthKey() ? ' (Current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {formatMonthKey(selectedMonth)} Prize Breakdown
              </CardTitle>
              <CardDescription>
                Total pool: <span className="font-bold text-green-700">${monthlyPool.toLocaleString()}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrizeRow
                label="1st Gross"
                percentage={0.35}
                amount={monthlyPrizes.grossFirst}
                winner={monthGross[0]?.displayName}
              />
              <PrizeRow
                label="2nd Gross"
                percentage={0.15}
                amount={monthlyPrizes.grossSecond}
                winner={monthGross[1]?.displayName}
              />
              <PrizeRow
                label="3rd Gross"
                percentage={0.10}
                amount={monthlyPrizes.grossThird}
                winner={monthGross[2]?.displayName}
              />
              <div className="my-2 border-t border-dashed" />
              <PrizeRow
                label="1st Net"
                percentage={0.25}
                amount={monthlyPrizes.netFirst}
                winner={monthNet[0]?.displayName}
              />
              <PrizeRow
                label="2nd Net"
                percentage={0.10}
                amount={monthlyPrizes.netSecond}
                winner={monthNet[1]?.displayName}
              />
              <PrizeRow
                label="3rd Net"
                percentage={0.05}
                amount={monthlyPrizes.netThird}
                winner={monthNet[2]?.displayName}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Season Championship */}
        <TabsContent value="season" className="space-y-4 mt-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Season Championship Pool: ${championshipPool.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  ${regFeePool.toLocaleString()} registration fees
                  {totalForfeits > 0 && ` + $${totalForfeits.toLocaleString()} forfeits`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Championship Prizes</CardTitle>
              <CardDescription>
                Distributed at season end (November)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrizeRow
                label="1st Gross Champion"
                percentage={0.30}
                amount={championshipPrizes.grossFirst}
              />
              <PrizeRow
                label="2nd Gross"
                percentage={0.15}
                amount={championshipPrizes.grossSecond}
              />
              <PrizeRow
                label="3rd Gross"
                percentage={0.10}
                amount={championshipPrizes.grossThird}
              />
              <div className="my-2 border-t border-dashed" />
              <PrizeRow
                label="1st Net Champion"
                percentage={0.25}
                amount={championshipPrizes.netFirst}
              />
              <PrizeRow
                label="2nd Net"
                percentage={0.12}
                amount={championshipPrizes.netSecond}
              />
              <PrizeRow
                label="3rd Net"
                percentage={0.08}
                amount={championshipPrizes.netThird}
              />
            </CardContent>
          </Card>

          {/* Forfeit breakdown */}
          {registrations.some((r) => r.forfeitedMonths.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Forfeit Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {registrations
                  .filter((r) => r.forfeitedMonths.length > 0)
                  .map((reg) => (
                    <div
                      key={reg.id}
                      className="flex justify-between py-1.5 text-sm border-b last:border-0"
                    >
                      <span className="text-muted-foreground">
                        {reg.forfeitedMonths.length} month(s) forfeited
                      </span>
                      <span className="font-medium text-yellow-700">
                        +${reg.totalForfeited}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
