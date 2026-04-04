'use client'

import { useState, useEffect } from 'react'
import { subscribeToElections } from '@/lib/firebase/firestore'
import { ElectionCard } from '@/components/elections/ElectionCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Vote } from 'lucide-react'
import type { Election } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToElections((e) => {
      setElections(e)
      setLoading(false)
    })
    return unsub
  }, [])

  const active = elections.filter((e) => e.status !== 'closed')
  const closed = elections.filter((e) => e.status === 'closed')

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="w-6 h-6 text-green-600" />
          Officer Elections
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Nominate and vote for Tour officers
        </p>
      </div>

      {elections.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Vote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No elections yet</p>
          <p className="text-sm mt-1">Elections will appear here when announced.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active Elections
              </h2>
              {active.map((e) => <ElectionCard key={e.id} election={e} />)}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-3">
              {active.length > 0 && <div className="border-t my-4" />}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Past Elections
              </h2>
              {closed.map((e) => <ElectionCard key={e.id} election={e} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
