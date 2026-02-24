'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePlayerRounds } from '@/lib/hooks/useRounds'
import { RoundCard } from '@/components/rounds/RoundCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClipboardList, Plus, Trophy } from 'lucide-react'
import Link from 'next/link'
import { formatMonthKey } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

function EmptyRounds() {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
        <ClipboardList className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">No rounds yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Submit your first round to get started. You'll need 2 playing partners
        to attest it.
      </p>
      <Button variant="green" asChild>
        <Link href="/dashboard/submit-round">
          <Plus className="w-4 h-4 mr-2" />
          Submit Round
        </Link>
      </Button>
    </div>
  )
}

export default function MyRoundsPage() {
  const { profile } = useAuth()
  const { rounds, loading } = usePlayerRounds(profile?.uid)

  const validRounds = rounds.filter((r) => r.isValid)
  const pendingRounds = rounds.filter((r) => !r.isValid)

  // Group by month
  const roundsByMonth = rounds.reduce(
    (acc, round) => {
      if (!acc[round.month]) acc[round.month] = []
      acc[round.month].push(round)
      return acc
    },
    {} as Record<string, typeof rounds>
  )

  const sortedMonths = Object.keys(roundsByMonth).sort().reverse()

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-green-600" />
            My Rounds
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {rounds.length} total · {validRounds.length} valid
          </p>
        </div>
        <Button variant="green" size="sm" asChild>
          <Link href="/dashboard/submit-round">
            <Plus className="w-4 h-4 mr-1" />
            Submit
          </Link>
        </Button>
      </div>

      {rounds.length === 0 ? (
        <EmptyRounds />
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All ({rounds.length})
            </TabsTrigger>
            <TabsTrigger value="valid" className="flex-1">
              Valid ({validRounds.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              Pending ({pendingRounds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {sortedMonths.map((month) => (
              <div key={month}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm">
                    {formatMonthKey(month)}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {roundsByMonth[month].map((round) => (
                    <RoundCard key={round.id} round={round} />
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="valid" className="space-y-3 mt-4">
            {validRounds.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No valid rounds yet
              </p>
            ) : (
              validRounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingRounds.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Trophy className="w-8 h-8 text-green-600 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  All rounds have been attested!
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  These rounds need 2 playing partners to scan your QR code and
                  attest them.
                </p>
                {pendingRounds.map((round) => (
                  <RoundCard key={round.id} round={round} />
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
