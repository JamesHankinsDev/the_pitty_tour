'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { getSeasonRegistrations, getSeasonMonthCloses } from '@/lib/firebase/firestore'
import {
  calculateMonthlyPoolSplit,
  calculateSeasonPurse,
} from '@/lib/utils/scoring'
import { getSeasonMonths } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Scale, DollarSign, AlertTriangle, Trophy, Wallet } from 'lucide-react'
import type { Registration, MonthClose } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function TreasurerPage() {
  const { profile, loading: authLoading } = useAuth()
  const { season, loading: seasonLoading } = useActiveSeason()
  const router = useRouter()

  const [regs, setRegs] = useState<Registration[]>([])
  const [closes, setCloses] = useState<MonthClose[]>([])
  const [loading, setLoading] = useState(true)

  // Guard: only treasurer or admin
  useEffect(() => {
    if (authLoading) return
    const hasAccess = profile?.isAdmin || profile?.roles?.includes('treasurer')
    if (!hasAccess) {
      router.replace('/dashboard')
    }
  }, [profile, authLoading, router])

  useEffect(() => {
    if (!season) return
    Promise.all([
      getSeasonRegistrations(season.id),
      getSeasonMonthCloses(season.id),
    ]).then(([r, c]) => {
      setRegs(r)
      setCloses(c)
      setLoading(false)
    })
  }, [season])

  if (authLoading || seasonLoading || loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  if (!season) {
    return <div className="p-4 text-center text-muted-foreground">No active season</div>
  }

  const playerCount = regs.length
  const paidRegs = regs.filter((r) => r.hasPaidRegistration)
  const totalForfeits = regs.reduce((s, r) => s + r.totalForfeited, 0)
  const seasonMonths = getSeasonMonths(season.year, season.startMonth, season.endMonth)
  const monthlyDuesPerMonth = playerCount * season.monthlyDue
  const poolSplit = calculateMonthlyPoolSplit(monthlyDuesPerMonth)

  const totalDuesCollected = monthlyDuesPerMonth * seasonMonths.length
  const totalRegFees = paidRegs.length * season.registrationFee
  const totalRevenue = totalDuesCollected + totalRegFees

  const seasonContributions = poolSplit.seasonContribution * seasonMonths.length
  const estimatedSeasonPurse = seasonContributions + totalRegFees
  const seasonBreakdown = calculateSeasonPurse(estimatedSeasonPurse)

  const totalPaidOut = closes.reduce((s, c) => s + c.performancePurse, 0)
  const monthsClosed = closes.length

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-blue-600" />
          Treasurer Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season.year} Season Financial Summary (read-only)
        </p>
      </div>

      {/* Revenue overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-green-700">${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-green-700">${totalDuesCollected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Dues Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-yellow-600">${totalRegFees.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Registration Fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-600">${totalForfeits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Forfeits</p>
          </CardContent>
        </Card>
      </div>

      {/* Pool balances */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pool Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Monthly Performance (per month)</span>
            <span className="font-bold text-green-700">${poolSplit.performancePurse.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Season Purse Contribution (per month)</span>
            <span className="font-bold">${poolSplit.seasonContribution.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Estimated Season Purse</span>
            <span className="font-bold text-yellow-700">${estimatedSeasonPurse.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Total Paid Out ({monthsClosed} month{monthsClosed !== 1 ? 's' : ''} closed)</span>
            <span className="font-bold text-green-700">${totalPaidOut.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-sm font-semibold">
            <span>Remaining in Monthly Pools</span>
            <span className="text-green-700">
              ${((poolSplit.performancePurse * seasonMonths.length) - totalPaidOut).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Season purse breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Season Purse Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Top 3 Winners (65%)</span>
            <span className="font-bold">${seasonBreakdown.top3Pool.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Bonus Awards (15%)</span>
            <span className="font-bold">${seasonBreakdown.bonusPool.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Champion Swag (10%)</span>
            <span className="font-bold">${seasonBreakdown.swagPool.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span>End-of-Year Party (10%)</span>
            <span className="font-bold">${seasonBreakdown.partyPool.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Player stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Total Registered</span>
            <span className="font-bold">{playerCount}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-sm">
            <span>Registration Paid</span>
            <span className="font-bold">{paidRegs.length}</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span>Monthly Due</span>
            <span className="font-bold">${season.monthlyDue}/mo</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
