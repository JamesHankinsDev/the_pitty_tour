'use client'

import { useEffect, useState } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { getAllUsers, getSeasonRegistrations, getSeasonRounds } from '@/lib/firebase/firestore'
import { getCurrentMonthKey, formatMonthKey, daysRemainingInMonth } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users,
  Flag,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import type { UserProfile, Registration, Round } from '@/lib/types'

export const dynamic = 'force-dynamic'

function AdminStat({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  href?: string
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {label}
            </p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 bg-green-50 rounded-lg shrink-0">
            <Icon className="w-5 h-5 text-green-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

export default function AdminOverview() {
  const { season, loading: seasonLoading } = useActiveSeason()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [allUsers, allRounds] = await Promise.all([
        getAllUsers(),
        season ? getSeasonRounds(season.id) : Promise.resolve([]),
      ])
      setUsers(allUsers)
      setRounds(allRounds)

      if (season) {
        const allRegs = await getSeasonRegistrations(season.id)
        setRegs(allRegs)
      }
      setLoading(false)
    }
    if (!seasonLoading) load()
  }, [season, seasonLoading])

  const currentMonth = getCurrentMonthKey()
  const daysLeft = daysRemainingInMonth()

  const validRounds = rounds.filter((r) => r.isValid)
  const pendingRounds = rounds.filter((r) => !r.isValid)
  const thisMonthRounds = rounds.filter((r) => r.month === currentMonth)
  const paidRegs = regs.filter((r) => r.hasPaidRegistration)
  const totalForfeits = regs.reduce((s, r) => s + r.totalForfeited, 0)

  if (loading || seasonLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {season
            ? `${season.year} Season Active · ${formatMonthKey(currentMonth)} · ${daysLeft} days left`
            : 'No active season'}
        </p>
      </div>

      {!season && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800">No Active Season</p>
              <p className="text-sm text-yellow-700">
                Create a season to enable round submissions.
              </p>
            </div>
            <Button size="sm" className="ml-auto" asChild>
              <Link href="/admin/seasons">Create Season</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <AdminStat
          label="Total Players"
          value={users.length}
          sub={`${paidRegs.length} paid registration`}
          icon={Users}
          href="/admin/players"
        />
        <AdminStat
          label="Valid Rounds"
          value={validRounds.length}
          sub="this season"
          icon={CheckCircle2}
          href="/admin/rounds"
        />
        <AdminStat
          label="Pending Rounds"
          value={pendingRounds.length}
          sub="need attestation"
          icon={Clock}
          href="/admin/rounds"
        />
        <AdminStat
          label="This Month"
          value={thisMonthRounds.filter((r) => r.isValid).length}
          sub={`of ${thisMonthRounds.length} submitted`}
          icon={Flag}
          href="/admin/rounds"
        />
        <AdminStat
          label="Total Forfeits"
          value={`$${totalForfeits}`}
          sub="into prize pool"
          icon={DollarSign}
          href="/admin/prize-pool"
        />
        <AdminStat
          label="Days Left"
          value={daysLeft}
          sub={`in ${formatMonthKey(currentMonth)}`}
          icon={Calendar}
        />
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/players">Manage Players</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/rounds">Audit Rounds</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/seasons">Seasons</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/prize-pool">Prize Pool</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent pending rounds */}
      {pendingRounds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Recent Pending Rounds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRounds.slice(0, 5).map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
              >
                <div>
                  <p className="font-medium">{round.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    Gross: {round.grossScore} · {formatMonthKey(round.month)}
                  </p>
                </div>
                <Badge variant="pending">
                  {round.attestations.length}/2
                </Badge>
              </div>
            ))}
            {pendingRounds.length > 5 && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/admin/rounds">
                  View All {pendingRounds.length} Pending
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
