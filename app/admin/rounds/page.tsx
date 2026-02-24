'use client'

import { useEffect, useState } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { getSeasonRounds, getAllUsers, adminOverrideRound } from '@/lib/firebase/firestore'
import { formatMonthKey, getCurrentMonthKey } from '@/lib/utils/dates'
import { RoundCard } from '@/components/rounds/RoundCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, ClipboardList, ShieldCheck, ShieldX } from 'lucide-react'
import type { Round, UserProfile } from '@/lib/types'
import { getSeasonMonths } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default function AdminRoundsPage() {
  const { season } = useActiveSeason()
  const [rounds, setRounds] = useState<Round[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [overrideRound, setOverrideRound] = useState<Round | null>(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideAction, setOverrideAction] = useState<'validate' | 'invalidate'>('validate')
  const [overriding, setOverriding] = useState(false)

  const loadData = async () => {
    if (!season) return
    const [allRounds, allUsers] = await Promise.all([
      getSeasonRounds(season.id),
      getAllUsers(),
    ])
    setRounds(allRounds)
    setUsers(allUsers)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [season])

  const getUserName = (uid: string) =>
    users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8)

  const seasonMonths = season
    ? getSeasonMonths(season.year, season.startMonth, season.endMonth)
    : []

  const filteredRounds = rounds.filter((r) => {
    const matchesMonth = monthFilter === 'all' || r.month === monthFilter
    const matchesSearch =
      !search ||
      getUserName(r.uid).toLowerCase().includes(search.toLowerCase()) ||
      r.courseName.toLowerCase().includes(search.toLowerCase())
    return matchesMonth && matchesSearch
  })

  const validRounds = filteredRounds.filter((r) => r.isValid)
  const pendingRounds = filteredRounds.filter((r) => !r.isValid)

  const handleOverride = async () => {
    if (!overrideRound) return
    setOverriding(true)
    try {
      await adminOverrideRound(
        overrideRound.id,
        overrideAction === 'validate',
        overrideNote
      )
      toast.success(
        `Round ${overrideAction === 'validate' ? 'validated' : 'invalidated'} by admin.`
      )
      setOverrideRound(null)
      setOverrideNote('')
      loadData()
    } catch {
      toast.error('Override failed.')
    } finally {
      setOverriding(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-green-600" />
          Rounds
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {rounds.length} total · {rounds.filter((r) => r.isValid).length} valid
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search player or course..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {seasonMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthKey(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            Pending ({pendingRounds.length})
          </TabsTrigger>
          <TabsTrigger value="valid" className="flex-1">
            Valid ({validRounds.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">
            All ({filteredRounds.length})
          </TabsTrigger>
        </TabsList>

        {(['pending', 'valid', 'all'] as const).map((tab) => {
          const list =
            tab === 'pending'
              ? pendingRounds
              : tab === 'valid'
              ? validRounds
              : filteredRounds

          return (
            <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
              {list.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No rounds
                </p>
              ) : (
                list.map((round) => (
                  <div key={round.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getUserName(round.uid)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatMonthKey(round.month)}
                      </Badge>
                    </div>
                    <RoundCard round={round} />
                    {/* Admin override buttons */}
                    <div className="flex gap-2 mt-1">
                      {!round.isValid ? (
                        <Button
                          size="sm"
                          variant="green"
                          onClick={() => {
                            setOverrideRound(round)
                            setOverrideAction('validate')
                            setOverrideNote('')
                          }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Admin Validate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setOverrideRound(round)
                            setOverrideAction('invalidate')
                            setOverrideNote('')
                          }}
                        >
                          <ShieldX className="w-3.5 h-3.5 mr-1" />
                          Admin Invalidate
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Admin Override Dialog */}
      <Dialog
        open={!!overrideRound}
        onOpenChange={(open) => !open && setOverrideRound(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Admin {overrideAction === 'validate' ? 'Validate' : 'Invalidate'} Round
            </DialogTitle>
            <DialogDescription>
              {overrideAction === 'validate'
                ? 'This will mark the round as valid, bypassing the attestation requirement.'
                : 'This will invalidate the round, removing it from standings.'}
            </DialogDescription>
          </DialogHeader>

          {overrideRound && (
            <div className="text-sm bg-muted p-3 rounded-md">
              <p>
                <strong>{overrideRound.courseName}</strong>
              </p>
              <p className="text-muted-foreground">
                Gross: {overrideRound.grossScore} · Net: {overrideRound.netScore}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for override (required)</Label>
            <Input
              placeholder="e.g. Camera malfunction prevented QR scan"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideRound(null)}>
              Cancel
            </Button>
            <Button
              variant={overrideAction === 'validate' ? 'green' : 'destructive'}
              onClick={handleOverride}
              disabled={!overrideNote.trim() || overriding}
            >
              {overriding
                ? 'Saving...'
                : overrideAction === 'validate'
                ? 'Validate Round'
                : 'Invalidate Round'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
