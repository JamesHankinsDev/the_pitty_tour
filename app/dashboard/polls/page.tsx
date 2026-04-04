'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToPolls, subscribeToPollVotes } from '@/lib/firebase/firestore'
import { PollCard } from '@/components/polls/PollCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Vote } from 'lucide-react'
import type { Poll, PollVote } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function PollsPage() {
  const { user, isDemo } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [voteMaps, setVoteMaps] = useState<Map<string, Map<string, PollVote>>>(new Map())
  const [loading, setLoading] = useState(true)

  // Subscribe to polls
  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    const unsub = subscribeToPolls((p) => {
      setPolls(p)
      setLoading(false)
    })
    return unsub
  }, [isDemo])

  // Subscribe to votes for each poll
  useEffect(() => {
    if (polls.length === 0) return
    const unsubs: (() => void)[] = []
    for (const poll of polls) {
      const unsub = subscribeToPollVotes(poll.id, (votes) => {
        setVoteMaps((prev) => {
          const next = new Map(prev)
          next.set(poll.id, votes)
          return next
        })
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach((u) => u())
  }, [polls])

  const activePolls = polls.filter((p) => p.status === 'active')
  const closedPolls = polls.filter((p) => p.status === 'closed')

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="w-6 h-6 text-green-600" />
          Community Polls
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vote on course choices, format ideas, and Tour decisions
        </p>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Vote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No polls yet</p>
          <p className="text-sm mt-1">
            Polls will appear here when the Commissioner&apos;s Office creates them.
          </p>
        </div>
      ) : (
        <>
          {/* Active polls */}
          {activePolls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active Polls
              </h2>
              {activePolls.map((poll) => {
                const votes = voteMaps.get(poll.id) ?? new Map()
                return (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    hasVoted={votes.has(user?.uid ?? '')}
                    voteCount={votes.size}
                  />
                )
              })}
            </div>
          )}

          {/* Closed polls */}
          {closedPolls.length > 0 && (
            <div className="space-y-3">
              {activePolls.length > 0 && <div className="border-t my-4" />}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Closed Polls
              </h2>
              {closedPolls.map((poll) => {
                const votes = voteMaps.get(poll.id) ?? new Map()
                return (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    hasVoted={votes.has(user?.uid ?? '')}
                    voteCount={votes.size}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
