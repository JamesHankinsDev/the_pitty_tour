'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import {
  getSeasonRegistrations,
  getAllUsers,
  getSeasonMonthCloses,
  getMonthPayouts,
  closeMonth,
} from '@/lib/firebase/firestore'
import { getSeasonMonths, formatMonthKey, isPastMonth, getCurrentMonthKey } from '@/lib/utils/dates'
import { calculateMonthPayouts } from '@/lib/utils/payouts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  DollarSign,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trophy,
} from 'lucide-react'
import type { Registration, UserProfile, MonthClose, Payout, Round } from '@/lib/types'
import { subscribeToMonthRounds } from '@/lib/firebase/firestore'
import type { MonthPayoutResult } from '@/lib/utils/payouts'

export const dynamic = 'force-dynamic'

function Money({ amount }: { amount: number }) {
  return (
    <span className="font-bold text-green-700">
      ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

export default function AdminPayoutsPage() {
  const { user } = useAuth()
  const { season } = useActiveSeason()

  const [regs, setRegs] = useState<Registration[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [closes, setCloses] = useState<MonthClose[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())
  const [preview, setPreview] = useState<MonthPayoutResult | null>(null)
  const [existingPayouts, setExistingPayouts] = useState<Payout[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [closing, setClosing] = useState(false)

  // Load base data
  useEffect(() => {
    if (!season) return
    Promise.all([
      getSeasonRegistrations(season.id),
      getAllUsers(),
      getSeasonMonthCloses(season.id),
    ]).then(([r, u, c]) => {
      setRegs(r)
      setUsers(u)
      setCloses(c)
      setLoading(false)
    })
  }, [season])

  // Subscribe to rounds for selected month
  useEffect(() => {
    if (!season) return
    const unsub = subscribeToMonthRounds(season.id, selectedMonth, setRounds)
    return unsub
  }, [season, selectedMonth])

  // Load existing payouts when month changes
  useEffect(() => {
    if (!season) return
    setPreview(null)
    setExistingPayouts([])
    const isClosed = closes.some((c) => c.month === selectedMonth)
    if (isClosed) {
      getMonthPayouts(season.id, selectedMonth).then(setExistingPayouts)
    }
  }, [season, selectedMonth, closes])

  const getUserName = (uid: string) =>
    users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8)

  if (!season) {
    return (
      <div className="p-4 lg:p-8 text-center text-muted-foreground">
        No active season
      </div>
    )
  }

  const seasonMonths = getSeasonMonths(season.year, season.startMonth, season.endMonth)
  const isClosed = closes.some((c) => c.month === selectedMonth)
  const closeRecord = closes.find((c) => c.month === selectedMonth)

  const handlePreview = () => {
    if (!season) return
    setPreviewing(true)
    try {
      const result = calculateMonthPayouts(rounds, regs, season, selectedMonth)
      setPreview(result)
    } catch (err) {
      toast.error('Failed to calculate payouts.')
      console.error(err)
    } finally {
      setPreviewing(false)
    }
  }

  const handleClose = async () => {
    if (!season || !user || !preview) return
    setClosing(true)
    try {
      await closeMonth(season.id, selectedMonth, user.uid, preview)
      toast.success(`${formatMonthKey(selectedMonth)} payouts finalized!`)
      // Refresh closes
      const newCloses = await getSeasonMonthCloses(season.id)
      setCloses(newCloses)
      setPreview(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'MONTH_ALREADY_CLOSED') {
        toast.error('This month has already been closed.')
      } else {
        toast.error('Failed to close month.')
      }
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  // Display data: either preview or existing payouts
  const displayPayouts = isClosed ? existingPayouts : preview?.payouts ?? []

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          Monthly Payouts
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preview and finalize monthly earnings
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...seasonMonths].reverse().map((m) => {
              const closed = closes.some((c) => c.month === m)
              return (
                <SelectItem key={m} value={m}>
                  {formatMonthKey(m)}
                  {m === getCurrentMonthKey() ? ' (Current)' : ''}
                  {closed ? ' — Closed' : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {isClosed ? (
          <Badge variant="success" className="shrink-0 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Closed
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0">Open</Badge>
        )}
      </div>

      {/* Closed Month Summary */}
      {isClosed && closeRecord && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">
                {formatMonthKey(selectedMonth)} — Finalized
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Purse</p>
                <p className="font-bold"><Money amount={closeRecord.performancePurse} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Players</p>
                <p className="font-bold">{closeRecord.playerCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Per Save</p>
                <p className="font-bold"><Money amount={closeRecord.perSaveValue} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Per Par-3</p>
                <p className="font-bold"><Money amount={closeRecord.perPar3Value} /></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Button */}
      {!isClosed && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewing || rounds.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewing ? 'Calculating...' : 'Preview Payouts'}
          </Button>
          {rounds.length === 0 && (
            <p className="text-sm text-muted-foreground self-center">
              No rounds submitted for this month yet.
            </p>
          )}
        </div>
      )}

      {/* Preview Summary */}
      {!isClosed && preview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pool Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Performance Purse</p>
                <p className="font-bold"><Money amount={preview.performancePurse} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Season Banked</p>
                <p className="font-bold"><Money amount={preview.seasonContribution} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Net Pool (40%)</p>
                <p className="font-bold"><Money amount={preview.netPool} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gross Pool (30%)</p>
                <p className="font-bold"><Money amount={preview.grossPool} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Saves Pool</p>
                <p className="font-bold"><Money amount={preview.savesPool} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Par-3 Pool</p>
                <p className="font-bold"><Money amount={preview.par3Pool} /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Per Save</p>
                <p className="font-bold"><Money amount={preview.perSaveValue} /></p>
                <p className="text-xs text-muted-foreground">{preview.totalSaves} total</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Per Par-3</p>
                <p className="font-bold"><Money amount={preview.perPar3Value} /></p>
                <p className="text-xs text-muted-foreground">{preview.totalPar3Pars} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Table */}
      {displayPayouts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isClosed ? 'Final Payouts' : 'Payout Preview'}
            </CardTitle>
            <CardDescription>
              {displayPayouts.length} player{displayPayouts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">Player</th>
                  <th className="py-2 px-2 font-medium text-center">Gross</th>
                  <th className="py-2 px-2 font-medium text-center">Net</th>
                  <th className="py-2 px-2 font-medium text-center">Saves</th>
                  <th className="py-2 px-2 font-medium text-center">Par-3s</th>
                  <th className="py-2 px-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {displayPayouts.map((p) => {
                  const ddNote = p.doubleDipResolution !== 'none'
                    ? ` (kept ${p.doubleDipResolution})`
                    : ''
                  return (
                    <tr key={p.uid} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{getUserName(p.uid)}</p>
                        {p.doubleDipResolution !== 'none' && (
                          <p className="text-xs text-yellow-600">
                            Double-dip: kept {p.doubleDipResolution}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.grossRank && p.grossRank <= 2 ? (
                          <div>
                            <p className="font-semibold"><Money amount={p.grossPayout} /></p>
                            <p className="text-xs text-muted-foreground">#{p.grossRank}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.netRank && p.netRank <= 3 ? (
                          <div>
                            <p className="font-semibold"><Money amount={p.netPayout} /></p>
                            <p className="text-xs text-muted-foreground">#{p.netRank}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.savesPayout > 0 ? (
                          <div>
                            <p className="font-semibold"><Money amount={p.savesPayout} /></p>
                            <p className="text-xs text-muted-foreground">{p.sandSaves} saves</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.par3Payout > 0 ? (
                          <div>
                            <p className="font-semibold"><Money amount={p.par3Payout} /></p>
                            <p className="text-xs text-muted-foreground">{p.par3Pars} pars</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <p className="font-bold text-green-700 text-base">
                          <Money amount={p.totalPayout} />
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-2.5 pr-3 font-semibold">Total</td>
                  <td className="py-2.5 px-2 text-center font-semibold">
                    <Money amount={displayPayouts.reduce((s, p) => s + p.grossPayout, 0)} />
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold">
                    <Money amount={displayPayouts.reduce((s, p) => s + p.netPayout, 0)} />
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold">
                    <Money amount={displayPayouts.reduce((s, p) => s + p.savesPayout, 0)} />
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold">
                    <Money amount={displayPayouts.reduce((s, p) => s + p.par3Payout, 0)} />
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-green-700 text-base">
                    <Money amount={displayPayouts.reduce((s, p) => s + p.totalPayout, 0)} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Close Month Button */}
      {!isClosed && preview && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-800 text-sm">
                  Ready to finalize {formatMonthKey(selectedMonth)}?
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  This will lock in all payouts for the month. This action cannot be undone.
                  Make sure all rounds, attestations, and forfeits are accounted for.
                </p>
              </div>
            </div>
            <Button
              variant="green"
              className="w-full mt-3"
              onClick={handleClose}
              disabled={closing}
            >
              <Lock className="w-4 h-4 mr-2" />
              {closing ? 'Closing...' : `Confirm & Close ${formatMonthKey(selectedMonth)}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
