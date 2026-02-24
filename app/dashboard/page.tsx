'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { getCurrentMonthKey, daysRemainingInMonth, formatMonthKey } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  Flag,
  ScanLine,
  Clock,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'green',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: 'green' | 'gold' | 'blue' | 'red'
}) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    gold: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg shrink-0 ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { season, loading: seasonLoading } = useActiveSeason()
  const currentMonth = getCurrentMonthKey()
  const daysLeft = daysRemainingInMonth()
  const { rounds, loading: roundsLoading } = usePlayerRounds(profile?.uid)

  const currentMonthRounds = rounds.filter((r) => r.month === currentMonth)
  const hasValidRoundThisMonth = currentMonthRounds.some((r) => r.isValid)
  const pendingRounds = rounds.filter((r) => !r.isValid && r.attestations.length < 1)

  const validRounds = rounds.filter((r) => r.isValid)
  const bestGross = validRounds.length
    ? Math.min(...validRounds.map((r) => r.grossScore))
    : null
  const avgNet = validRounds.length
    ? Math.round(validRounds.reduce((s, r) => s + r.netScore, 0) / validRounds.length)
    : null

  if (seasonLoading || roundsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.displayName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {formatMonthKey(currentMonth)} · {daysLeft} days left to submit
        </p>
      </div>

      {/* Current Month Status Banner */}
      <div
        className={`rounded-xl p-4 flex items-start gap-3 ${
          hasValidRoundThisMonth
            ? 'bg-green-50 border border-green-200'
            : daysLeft <= 7
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        {hasValidRoundThisMonth ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">
                Round submitted & valid for {formatMonthKey(currentMonth)}!
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                You're in the running for this month's prizes.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                daysLeft <= 7 ? 'text-red-500' : 'text-blue-500'
              }`}
            />
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  daysLeft <= 7 ? 'text-red-800' : 'text-blue-800'
                }`}
              >
                {daysLeft <= 7
                  ? `⚠️ Only ${daysLeft} days left to submit!`
                  : `No valid round yet for ${formatMonthKey(currentMonth)}`}
              </p>
              <p
                className={`text-sm mt-0.5 ${
                  daysLeft <= 7 ? 'text-red-700' : 'text-blue-700'
                }`}
              >
                Submit by month end or forfeit your $
                {season?.monthlyDue ?? 50} to the prize pool.
              </p>
            </div>
            <Button size="sm" variant="green" asChild className="shrink-0">
              <Link href="/dashboard/submit-round">Submit</Link>
            </Button>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Days Left"
          value={daysLeft}
          sub={`in ${formatMonthKey(currentMonth)}`}
          icon={Clock}
          color={daysLeft <= 7 ? 'red' : 'blue'}
        />
        <StatCard
          label="Total Points"
          value={profile?.totalPoints ?? 0}
          sub="this season"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Best Gross"
          value={bestGross ?? '—'}
          sub="all-time low"
          icon={Flag}
          color="gold"
        />
        <StatCard
          label="Avg Net"
          value={avgNet ?? '—'}
          sub="across all rounds"
          icon={Trophy}
          color="green"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col py-4 gap-2"
            asChild
          >
            <Link href="/dashboard/submit-round">
              <Flag className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Submit Round</span>
              <span className="text-xs text-muted-foreground">
                {hasValidRoundThisMonth ? 'Update score' : 'This month'}
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col py-4 gap-2"
            asChild
          >
            <Link href="/dashboard/attest">
              <ScanLine className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Attest Round</span>
              <span className="text-xs text-muted-foreground">
                Scan partner's QR
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Attestations */}
      {pendingRounds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              Rounds Awaiting Attestation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {pendingRounds.slice(0, 3).map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">{round.courseName}</p>
                  <p className="text-muted-foreground text-xs">
                    Gross: {round.grossScore} · {round.attestations.length}/1
                    attestation
                  </p>
                </div>
                <Badge
                  variant={
                    round.attestations.length === 0
                      ? 'pending'
                      : 'warning'
                  }
                >
                  {round.attestations.length}/1
                </Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link href="/dashboard/my-rounds">View All Rounds</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Season info */}
      {season && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <div>
                  <p className="font-medium text-sm">
                    {season.year} Season Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    April – November
                  </p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
