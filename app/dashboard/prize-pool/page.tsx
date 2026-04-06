'use client'

import { useState, useEffect, useMemo } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { getSeasonRegistrations } from '@/lib/firebase/firestore'
import {
  calculateMonthlyPoolSplit,
  calculatePerformancePurse,
  calculateNetPayouts,
  calculateGrossPayouts,
  calculateSeasonPurse,
  calculateSeasonTop3,
  calculateSeasonBonuses,
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
import {
  DollarSign,
  Trophy,
  AlertTriangle,
  Users,
  Target,
  Award,
  Calendar,
  TrendingUp,
  Info,
  Star,
  PartyPopper,
  Shirt,
} from 'lucide-react'
import type { Registration } from '@/lib/types'

export const dynamic = 'force-dynamic'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function Money({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`font-bold text-green-700 ${className}`}>
      ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  )
}

function Pct({ value }: { value: number }) {
  return (
    <span className="text-xs text-muted-foreground">
      {(value * 100).toFixed(0)}%
    </span>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="p-2 rounded-lg bg-green-50 text-green-700 shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function PayoutRow({ label, amount, note, bold }: {
  label: string
  amount: number
  note?: string
  bold?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <div>
        <p className={`text-sm ${bold ? 'font-semibold' : ''}`}>{label}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <Money amount={amount} className={bold ? 'text-base' : ''} />
    </div>
  )
}

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function PrizePoolPage() {
  const { season, loading: seasonLoading } = useActiveSeason()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingRegs, setLoadingRegs] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())

  useEffect(() => {
    if (!season) return
    setLoadingRegs(true)
    getSeasonRegistrations(season.id)
      .then(setRegistrations)
      .finally(() => setLoadingRegs(false))
  }, [season])

  // ── Calculations (must be above early returns to satisfy hook ordering) ──

  const calculations = useMemo(() => {
    if (!season) return null
    const pc = registrations.length
    const paid = registrations.filter((r) => r.hasPaidRegistration)
    const forfeits = registrations.reduce((s, r) => s + r.totalForfeited, 0)
    const months = getSeasonMonths(season.year, season.startMonth, season.endMonth)
    const totalMonths = months.length
    const pMonths = totalMonths - 1

    const duesCollected = pc * season.monthlyDue
    const split = calculateMonthlyPoolSplit(duesCollected)
    const perf = calculatePerformancePurse(split.performancePurse)
    const net = calculateNetPayouts(perf.netPool)
    const gross = calculateGrossPayouts(perf.grossPool)

    const monthlyContrib = split.seasonContribution * totalMonths
    const regFeePool = paid.length * season.registrationFee
    const estPurse = monthlyContrib + regFeePool
    const sBrk = calculateSeasonPurse(estPurse)
    const sTop3 = calculateSeasonTop3(sBrk.top3Pool)
    const sBonuses = calculateSeasonBonuses(sBrk.bonusPool)

    return {
      playerCount: pc, paidRegs: paid, totalForfeits: forfeits,
      seasonMonths: months, totalSeasonMonths: totalMonths, payoutMonths: pMonths,
      monthlyDuesCollected: duesCollected, poolSplit: split, perfPurse: perf,
      netPayouts: net, grossPayouts: gross,
      estimatedMonthlyContributions: monthlyContrib,
      estimatedSeasonPurse: estPurse, registrationFeePool: regFeePool,
      seasonBreakdown: sBrk, seasonTop3: sTop3, seasonBonuses: sBonuses,
    }
  }, [registrations, season])

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

  if (!season || !calculations) {
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

  const {
    playerCount, paidRegs, totalForfeits, seasonMonths, totalSeasonMonths,
    payoutMonths, monthlyDuesCollected, poolSplit, perfPurse, netPayouts,
    grossPayouts, estimatedMonthlyContributions, estimatedSeasonPurse,
    registrationFeePool, seasonBreakdown, seasonTop3, seasonBonuses,
  } = calculations

  // Tour Championship = double purse (first month's contribution rolls into last month)
  const championshipPurse = poolSplit.performancePurse * 2
  const champPerf = calculatePerformancePurse(championshipPurse)
  const champNet = calculateNetPayouts(champPerf.netPool)
  const champGross = calculateGrossPayouts(champPerf.grossPool)

  // Grand total estimate
  const totalYearlyFunds = (playerCount * season.monthlyDue * totalSeasonMonths) + registrationFeePool

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Payout Structure
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season.year} PITY Tour &middot; {playerCount} players &middot; {totalSeasonMonths} months
        </p>
      </div>

      {/* Tour Fund Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Est. Total Tour Funds
            </p>
            <p className="text-2xl font-black mt-0.5">
              <Money amount={totalYearlyFunds} className="text-2xl" />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {playerCount} &times; ${season.monthlyDue}/mo &times; {totalSeasonMonths}mo + ${season.registrationFee} fee
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Est. Season Purse
            </p>
            <p className="text-2xl font-black mt-0.5">
              <Money amount={estimatedSeasonPurse} className="text-2xl" />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              40% of monthly dues + reg fees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Monthly Performance
            </p>
            <p className="text-2xl font-black mt-0.5">
              <Money amount={poolSplit.performancePurse} className="text-2xl" />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              60% of ${monthlyDuesCollected} monthly dues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Registered
            </p>
            <p className="text-2xl font-black mt-0.5">{paidRegs.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              of {playerCount} total players
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High-Level Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            How Tour Funds Are Used
          </CardTitle>
          <CardDescription>
            Approximate allocation of total Tour funds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between py-1.5 text-sm border-b">
            <span>Monthly Event Payouts</span>
            <Badge variant="outline">~40%</Badge>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b">
            <span>Tour Champion & End-of-Season Awards</span>
            <Badge variant="outline">~30%</Badge>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b">
            <span>Tour Championship Bonus Purse</span>
            <Badge variant="outline">~15%</Badge>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b">
            <span>Monthly Bonus Pools (Skills)</span>
            <Badge variant="outline">~5%</Badge>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span>Trophies, Awards & Admin</span>
            <Badge variant="outline">Remainder</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}

      <Tabs defaultValue="monthly">
        <TabsList className="w-full">
          <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
          <TabsTrigger value="championship" className="flex-1">Championship</TabsTrigger>
          <TabsTrigger value="season" className="flex-1">Season</TabsTrigger>
          <TabsTrigger value="points" className="flex-1">Points</TabsTrigger>
        </TabsList>

        {/* ── Monthly Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <InfoCallout>
            Each month, players contribute <strong>${season.monthlyDue}</strong> in Tour dues.
            Of each month&apos;s pool, <strong>40% feeds the Season Purse</strong> and{' '}
            <strong>60% is paid out that month</strong> based on performance.
            The first month has no payout and is used to establish handicaps.
          </InfoCallout>

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

          {/* Pool split visualization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {formatMonthKey(selectedMonth)} &mdash; Pool Split
              </CardTitle>
              <CardDescription>
                {playerCount} players &times; ${season.monthlyDue} = <Money amount={monthlyDuesCollected} />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <PayoutRow
                label="Season Purse Contribution"
                amount={poolSplit.seasonContribution}
                note="40% — banked for end-of-season awards"
              />
              <PayoutRow
                label="Monthly Performance Purse"
                amount={poolSplit.performancePurse}
                note="60% — distributed this month"
                bold
              />
            </CardContent>
          </Card>

          {/* Net Performance */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Target}
                title="Net Performance Purse"
                subtitle={`40% of performance purse — Top 3 net scores`}
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="1st Net" amount={netPayouts[0]} note="50% of net pool" />
              <PayoutRow label="2nd Net" amount={netPayouts[1]} note="30% of net pool" />
              <PayoutRow label="3rd Net" amount={netPayouts[2]} note="20% of net pool" />
              <div className="pt-2 text-right text-xs text-muted-foreground">
                Total: <Money amount={perfPurse.netPool} />
              </div>
            </CardContent>
          </Card>

          {/* Gross Performance */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Trophy}
                title="Gross Performance Purse"
                subtitle={`30% of performance purse — Top 2 gross scores`}
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="1st Gross" amount={grossPayouts[0]} note="60% of gross pool" />
              <PayoutRow label="2nd Gross" amount={grossPayouts[1]} note="40% of gross pool" />
              <div className="pt-2 text-right text-xs text-muted-foreground">
                Total: <Money amount={perfPurse.grossPool} />
              </div>
            </CardContent>
          </Card>

          {/* Skill Bonuses */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Star}
                title="Skill Bonus Pools"
                subtitle="30% of performance purse — paid per occurrence, independent of Gross/Net"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Sand-Save Pars</p>
                  <Money amount={perfPurse.savesPool} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pool split evenly per sand save recorded. Bunker shot + par or better.
                  Verified via Tour Book entry and marker initials.
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium">Par-3 Pars (or Better)</p>
                  <Money amount={perfPurse.par3Pool} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pool split evenly per par-3 hole played at par or better.
                  Verified via Tour Book entry and marker initials.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* No double-dipping callout */}
          <InfoCallout>
            <strong>No double-dipping:</strong> A player may only receive one primary monthly payout
            (Gross <em>or</em> Net). If a player qualifies for both, they take the higher payout
            and the other position cascades to the next eligible player.
            Skill bonuses are paid independently.
          </InfoCallout>
        </TabsContent>

        {/* ── Championship Tab ─────────────────────────────────────────────── */}
        <TabsContent value="championship" className="space-y-4 mt-4">
          <InfoCallout>
            The <strong>Tour Championship</strong> (final event of the season) features a{' '}
            <strong>double purse</strong>. The first month&apos;s performance purse rolls forward,
            creating the largest single-event payout of the year.
            Only players in good standing are eligible.
          </InfoCallout>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <p className="text-lg font-bold text-yellow-800">
                  Tour Championship Purse: <Money amount={championshipPurse} className="text-yellow-800" />
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  2 &times; <Money amount={poolSplit.performancePurse} className="text-yellow-700" /> standard monthly performance purse
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Championship Net */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Target}
                title="Championship Net Purse"
                subtitle="40% of championship purse — Top 3 net scores"
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="1st Net" amount={champNet[0]} note="50% of net pool" />
              <PayoutRow label="2nd Net" amount={champNet[1]} note="30% of net pool" />
              <PayoutRow label="3rd Net" amount={champNet[2]} note="20% of net pool" />
              <div className="pt-2 text-right text-xs text-muted-foreground">
                Total: <Money amount={champPerf.netPool} />
              </div>
            </CardContent>
          </Card>

          {/* Championship Gross */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Trophy}
                title="Championship Gross Purse"
                subtitle="30% of championship purse — Top 2 gross scores"
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="1st Gross" amount={champGross[0]} note="60% of gross pool" />
              <PayoutRow label="2nd Gross" amount={champGross[1]} note="40% of gross pool" />
              <div className="pt-2 text-right text-xs text-muted-foreground">
                Total: <Money amount={champPerf.grossPool} />
              </div>
            </CardContent>
          </Card>

          {/* Championship Skills */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Star}
                title="Championship Skill Bonuses"
                subtitle="30% of championship purse — doubled skill pools"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm">Sand-Save Pars Pool</span>
                <Money amount={champPerf.savesPool} />
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm">Par-3 Pars Pool</span>
                <Money amount={champPerf.par3Pool} />
              </div>
            </CardContent>
          </Card>

          <InfoCallout>
            All standard monthly rules apply: no double-dipping between Gross and Net,
            skill bonuses paid independently per occurrence.
          </InfoCallout>
        </TabsContent>

        {/* ── Season Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="season" className="space-y-4 mt-4">
          <InfoCallout>
            The Season Purse is funded by <strong>40% of each month&apos;s dues</strong> plus
            the <strong>${season.registrationFee} annual registration fee</strong> from each player.
            It&apos;s distributed at season&apos;s end based on season-long performance.
          </InfoCallout>

          {/* Season purse total */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <p className="text-lg font-bold text-yellow-800">
                  Est. Season Purse: <Money amount={estimatedSeasonPurse} className="text-yellow-800" />
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  <Money amount={estimatedMonthlyContributions} className="text-yellow-700" /> monthly contributions
                  + <Money amount={registrationFeePool} className="text-yellow-700" /> registration fees
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Season purse allocation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Season Purse Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <PayoutRow
                label="Top 3 Season Winners"
                amount={seasonBreakdown.top3Pool}
                note="65% — based on final season points"
                bold
              />
              <PayoutRow
                label="Season Bonus Awards"
                amount={seasonBreakdown.bonusPool}
                note="15% — skill & participation categories"
              />
              <PayoutRow
                label="Champion Swag"
                amount={seasonBreakdown.swagPool}
                note="10% — Tour Jacket, Earners Belt"
              />
              <PayoutRow
                label="End-of-Year Party"
                amount={seasonBreakdown.partyPool}
                note="10% — awards bash, food & drinks"
              />
            </CardContent>
          </Card>

          {/* Top 3 */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Trophy}
                title="Top 3 Season Winners"
                subtitle="65% of season purse — awarded by final season points standings"
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="1st Place — Tour Champion" amount={seasonTop3.first} note="50% of top-3 pool" />
              <PayoutRow label="2nd Place" amount={seasonTop3.second} note="30% of top-3 pool" />
              <PayoutRow label="3rd Place" amount={seasonTop3.third} note="20% of top-3 pool" />
            </CardContent>
          </Card>

          {/* Champion Swag */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Shirt}
                title="Champion Swag"
                subtitle="10% of season purse"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between py-2 border-b text-sm">
                <div>
                  <p className="font-medium">Points Champion</p>
                  <p className="text-xs text-muted-foreground">Custom leopard-print PITY Tour Jacket</p>
                </div>
                <span className="text-xs text-muted-foreground">~$500</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">Earnings Champion</p>
                  <p className="text-xs text-muted-foreground">Earners Belt</p>
                </div>
                <span className="text-xs text-muted-foreground">~$250</span>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Purses */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={Award}
                title="Season Bonus Awards"
                subtitle="15% of season purse — 5 categories, each 20% of bonus pool"
              />
            </CardHeader>
            <CardContent>
              <PayoutRow label="Most Sand Saves" amount={seasonBonuses.mostSaves} note="Split for ties" />
              <PayoutRow label="Most Par-3 Pars" amount={seasonBonuses.mostPar3Pars} note="Split for ties" />
              <PayoutRow label="Most Tour Cards Played" amount={seasonBonuses.mostTourCards} note="Split for ties" />
              <PayoutRow label="Most Events Participated" amount={seasonBonuses.mostEventsPlayed} note="Split for ties" />
              <PayoutRow label="Mr. Irrelevant (Lowest Earner)" amount={seasonBonuses.mrIrrelevant} note="Split for ties" />
            </CardContent>
          </Card>

          {/* End of Year Party */}
          <Card>
            <CardHeader className="pb-2">
              <SectionHeader
                icon={PartyPopper}
                title="End-of-Year Party"
                subtitle="10% of season purse"
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Awards distributed at an end-of-season bash. Friends and family welcome!
                Covers reservations, buffet-style apps, beer & wine.
              </p>
              <div className="mt-2 text-right">
                <Money amount={seasonBreakdown.partyPool} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Points Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="points" className="space-y-4 mt-4">
          <InfoCallout>
            Tour Points are based on <strong>net scoring</strong> (score relative to handicap).
            Points determine season standings and the Tour Champion.
          </InfoCallout>

          {/* Points table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Points by Net Finish</CardTitle>
              <CardDescription>
                Awarded each month based on net score ranking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {Object.entries({
                  1: 500, 2: 450, 3: 375, 4: 350, 5: 275,
                  6: 200, 7: 150, 8: 100, 9: 75, 10: 50,
                }).map(([rank, pts]) => (
                  <div key={rank} className="flex justify-between py-1.5 border-b text-sm">
                    <span className="text-muted-foreground">
                      {rank === '1' ? '1st' : rank === '2' ? '2nd' : rank === '3' ? '3rd' : `${rank}th`}
                    </span>
                    <span className="font-semibold">{pts} pts</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-1.5 text-sm mt-1">
                <span className="text-muted-foreground">11th+</span>
                <span className="font-semibold">25 pts</span>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Points */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bonus Points</CardTitle>
              <CardDescription>
                Additional points awarded beyond net finish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between py-2 border-b text-sm">
                <div>
                  <p className="font-medium">Participation Bonus</p>
                  <p className="text-xs text-muted-foreground">Awarded for showing up</p>
                </div>
                <span className="font-semibold">+25 pts</span>
              </div>
              <div className="flex justify-between py-2 border-b text-sm">
                <div>
                  <p className="font-medium">Affiliate Pair Bonus</p>
                  <p className="text-xs text-muted-foreground">Playing with an affiliate pair</p>
                </div>
                <span className="font-semibold">+50 pts</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">Skills Bonus Pool</p>
                  <p className="text-xs text-muted-foreground">
                    Shared 100-pt pool split among Sand Saves and Par-3 Pars recorded
                  </p>
                </div>
                <span className="font-semibold">100 pts shared</span>
              </div>
            </CardContent>
          </Card>

          {/* DNP */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Did Not Play (DNP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Players who do not submit a valid round in a given month receive{' '}
                <strong>0 points</strong> for that month and forfeit their monthly dues
                to the prize pool. Half of forfeited dues shift to the following month&apos;s pool.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer philosophy */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-semibold text-green-800">
            Play or Pay. Sign the Card. Earn Your Jacket.
          </p>
          <p className="text-xs text-green-700 mt-1">
            Showing up matters. Playing well is rewarded. The season tells a story.
            The biggest prizes are earned at the end.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
