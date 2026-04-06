'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToPolls, subscribeToPollVotes, subscribeToElections } from '@/lib/firebase/firestore'
import { PollCard } from '@/components/polls/PollCard'
import { ElectionCard } from '@/components/elections/ElectionCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Vote } from 'lucide-react'
import type { Poll, PollVote, Election } from '@/lib/types'


export default function VotingPage() {
  const { user, isDemo } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [elections, setElections] = useState<Election[]>([])
  const [voteMaps, setVoteMaps] = useState<Map<string, Map<string, PollVote>>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    let pollsLoaded = false
    let electionsLoaded = false
    const done = () => { if (pollsLoaded && electionsLoaded) setLoading(false) }

    const unsubP = subscribeToPolls((p) => { setPolls(p); pollsLoaded = true; done() })
    const unsubE = subscribeToElections((e) => { setElections(e); electionsLoaded = true; done() })
    return () => { unsubP(); unsubE() }
  }, [isDemo])

  // Subscribe to votes for polls
  useEffect(() => {
    if (polls.length === 0) return
    const unsubs: (() => void)[] = []
    for (const poll of polls) {
      const unsub = subscribeToPollVotes(poll.id, (votes) => {
        setVoteMaps((prev) => { const next = new Map(prev); next.set(poll.id, votes); return next })
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach((u) => u())
  }, [polls])

  const activePolls = polls.filter((p) => p.status === 'active')
  const closedPolls = polls.filter((p) => p.status === 'closed')
  const activeElections = elections.filter((e) => e.status !== 'closed')
  const closedElections = elections.filter((e) => e.status === 'closed')

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
          Polls & Elections
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vote on Tour decisions and officer elections
        </p>
      </div>

      <Tabs defaultValue="polls">
        <TabsList className="w-full">
          <TabsTrigger value="polls" className="flex-1">
            Polls ({polls.length})
          </TabsTrigger>
          <TabsTrigger value="elections" className="flex-1">
            Elections ({elections.length})
          </TabsTrigger>
        </TabsList>

        {/* Polls tab */}
        <TabsContent value="polls" className="space-y-4 mt-4">
          {polls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No polls yet.</p>
            </div>
          ) : (
            <>
              {activePolls.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h2>
                  {activePolls.map((poll) => {
                    const votes = voteMaps.get(poll.id) ?? new Map()
                    return <PollCard key={poll.id} poll={poll} hasVoted={votes.has(user?.uid ?? '')} voteCount={votes.size} />
                  })}
                </div>
              )}
              {closedPolls.length > 0 && (
                <div className="space-y-3">
                  {activePolls.length > 0 && <div className="border-t my-4" />}
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Closed</h2>
                  {closedPolls.map((poll) => {
                    const votes = voteMaps.get(poll.id) ?? new Map()
                    return <PollCard key={poll.id} poll={poll} hasVoted={votes.has(user?.uid ?? '')} voteCount={votes.size} />
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Elections tab */}
        <TabsContent value="elections" className="space-y-4 mt-4">
          {elections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No elections yet.</p>
            </div>
          ) : (
            <>
              {activeElections.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h2>
                  {activeElections.map((e) => <ElectionCard key={e.id} election={e} />)}
                </div>
              )}
              {closedElections.length > 0 && (
                <div className="space-y-3">
                  {activeElections.length > 0 && <div className="border-t my-4" />}
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
                  {closedElections.map((e) => <ElectionCard key={e.id} election={e} />)}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
