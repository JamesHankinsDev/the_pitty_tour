'use client'

import { useEffect, useState } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import {
  getSeasonRegistrations,
  updateRegistration,
  getAllUsers,
} from '@/lib/firebase/firestore'
import {
  calculateMonthlyPrizes,
  calculateChampionshipPrizes,
} from '@/lib/utils/scoring'
import {
  getSeasonMonths,
  formatMonthKey,
  getCurrentMonthKey,
} from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { DollarSign, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { Registration, UserProfile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function AdminPrizePoolPage() {
  const { season } = useActiveSeason()
  const [regs, setRegs] = useState<Registration[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadData = async () => {
    if (!season) return
    const [allRegs, allUsers] = await Promise.all([
      getSeasonRegistrations(season.id),
      getAllUsers(),
    ])
    setRegs(allRegs)
    setUsers(allUsers)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [season])

  const getUserName = (uid: string) =>
    users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8)

  const handleToggleMonthPaid = async (
    reg: Registration,
    month: string,
    paid: boolean
  ) => {
    setUpdating(`${reg.id}-${month}`)
    try {
      const newPayments = { ...reg.monthlyPayments, [month]: paid }
      await updateRegistration(reg.id, { monthlyPayments: newPayments })
      toast.success(`${formatMonthKey(month)} payment ${paid ? 'marked paid' : 'reversed'}`)
      loadData()
    } catch {
      toast.error('Update failed.')
    } finally {
      setUpdating(null)
    }
  }

  const handleMarkForfeit = async (reg: Registration, month: string) => {
    if (!season) return
    setUpdating(`forfeit-${reg.id}-${month}`)
    try {
      const alreadyForfeited = reg.forfeitedMonths.includes(month)
      const newForfeits = alreadyForfeited
        ? reg.forfeitedMonths.filter((m) => m !== month)
        : [...reg.forfeitedMonths, month]
      const newTotal = newForfeits.length * season.monthlyDue

      await updateRegistration(reg.id, {
        forfeitedMonths: newForfeits,
        totalForfeited: newTotal,
      })

      toast.success(
        alreadyForfeited ? 'Forfeit removed' : `Forfeit marked for ${formatMonthKey(month)}`
      )
      loadData()
    } catch {
      toast.error('Update failed.')
    } finally {
      setUpdating(null)
    }
  }

  if (!season) {
    return (
      <div className="p-4 lg:p-8 text-center text-muted-foreground">
        No active season
      </div>
    )
  }

  const seasonMonths = getSeasonMonths(
    season.year,
    season.startMonth,
    season.endMonth
  )
  const paidCount = regs.filter((r) => r.hasPaidRegistration).length
  const totalForfeits = regs.reduce((s, r) => s + r.totalForfeited, 0)
  const championshipPool =
    paidCount * season.registrationFee + totalForfeits
  const monthlyPool = regs.length * season.monthlyDue

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Prize Pool Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track payments and forfeits · {season.year} Season
        </p>
      </div>

      {/* Pool totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-green-700">
              ${monthlyPool.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Pool</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-yellow-600">
              ${championshipPool.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Championship Pool</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-red-600">
              ${totalForfeits.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Forfeits</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment tracking table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly Payment Tracking</CardTitle>
          <CardDescription>
            Mark payments and forfeits for each player by month
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Player</th>
                {seasonMonths.map((m) => (
                  <th
                    key={m}
                    className="text-center py-2 px-2 font-medium min-w-[60px]"
                  >
                    <span className="text-xs">
                      {formatMonthKey(m).split(' ')[0]}
                    </span>
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-medium">Forfeits</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((reg) => (
                <tr key={reg.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <p className="font-medium">{getUserName(reg.uid)}</p>
                    <Badge
                      variant={
                        reg.hasPaidRegistration ? 'success' : 'warning'
                      }
                      className="text-xs mt-0.5"
                    >
                      {reg.hasPaidRegistration ? 'Reg ✓' : 'Reg ✗'}
                    </Badge>
                  </td>
                  {seasonMonths.map((month) => {
                    const paid = reg.monthlyPayments[month] ?? false
                    const forfeited = reg.forfeitedMonths.includes(month)
                    const key = `${reg.id}-${month}`
                    return (
                      <td key={month} className="text-center py-2 px-1">
                        <div className="flex flex-col gap-1 items-center">
                          <button
                            onClick={() =>
                              handleToggleMonthPaid(reg, month, !paid)
                            }
                            disabled={updating === key}
                            className="text-xs"
                          >
                            {paid ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-300" />
                            )}
                          </button>
                          {forfeited && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-1 py-0"
                            >
                              F
                            </Badge>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="text-center py-2 px-2">
                    <p className="font-semibold text-red-600">
                      ${reg.totalForfeited}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reg.forfeitedMonths.length} mo
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Forfeit management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Manage Forfeits
          </CardTitle>
          <CardDescription>
            Mark months where players did not submit a valid round
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {regs.map((reg) => (
            <div key={reg.id} className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">{getUserName(reg.uid)}</p>
              <div className="flex flex-wrap gap-2">
                {seasonMonths.map((month) => {
                  const forfeited = reg.forfeitedMonths.includes(month)
                  const key = `forfeit-${reg.id}-${month}`
                  return (
                    <button
                      key={month}
                      onClick={() => handleMarkForfeit(reg, month)}
                      disabled={updating === key}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        forfeited
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-white text-muted-foreground border hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      {formatMonthKey(month).split(' ')[0]}
                      {forfeited && ' ✗'}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
