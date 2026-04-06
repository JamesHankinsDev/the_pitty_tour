'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  subscribeToPollOptions,
  subscribeToPollVotes,
  castVote,
  addPollOption,
  COLLECTIONS,
} from '@/lib/firebase/firestore'
import { CountdownTimer } from '@/components/polls/CountdownTimer'
import { PollOptionCard } from '@/components/polls/PollOptionCard'
import dynamic from 'next/dynamic'
const PollCommentThread = dynamic(() => import('@/components/polls/PollCommentThread').then((m) => m.PollCommentThread))
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Vote,
  Users,
  CheckCircle2,
  Plus,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import type { Poll, PollOption as PollOptionType, PollVote } from '@/lib/types'
import { isPast } from 'date-fns'


export default function PollDetailPage() {
  const params = useParams()
  const pollId = params.pollId as string
  const { user } = useAuth()

  const [poll, setPoll] = useState<Poll | null>(null)
  const [options, setOptions] = useState<PollOptionType[]>([])
  const [votes, setVotes] = useState<Map<string, PollVote>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [newOption, setNewOption] = useState('')
  const [addingOption, setAddingOption] = useState(false)

  // Load poll document
  useEffect(() => {
    getDoc(doc(db, COLLECTIONS.POLLS, pollId))
      .then((snap) => {
        if (snap.exists()) {
          setPoll({ id: snap.id, ...snap.data() } as Poll)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [pollId])

  // Subscribe to options and votes
  useEffect(() => {
    const unsubOpts = subscribeToPollOptions(pollId, setOptions)
    const unsubVotes = subscribeToPollVotes(pollId, setVotes)
    return () => { unsubOpts(); unsubVotes() }
  }, [pollId])

  const uid = user?.uid ?? ''
  const hasVoted = votes.has(uid)
  const myVoteOptionId = votes.get(uid)?.optionId
  const totalVotes = votes.size

  const isActive = poll?.status === 'active' && !isPast(new Date((poll.closesAt as any)?.seconds * 1000))
  const showResults = hasVoted || !isActive

  // Vote counts per option
  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [, v] of votes) {
      counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1)
    }
    return counts
  }, [votes])

  const handleVote = async () => {
    if (!selectedOption || !user) return
    setSubmitting(true)
    try {
      await castVote(pollId, user.uid, selectedOption)
      toast.success('Vote cast!')
    } catch {
      toast.error('Failed to cast vote.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddOption = async () => {
    if (!newOption.trim() || !user) return
    setAddingOption(true)
    try {
      await addPollOption(pollId, newOption, user.uid)
      setNewOption('')
      toast.success('Option added!')
    } catch {
      toast.error('Failed to add option.')
    } finally {
      setAddingOption(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="p-4 lg:p-8 text-center text-muted-foreground">
        <p>Poll not found.</p>
        <Link href="/dashboard/polls" className="text-green-700 hover:underline text-sm mt-2 inline-block">
          Back to Polls
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/dashboard/polls" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        All Polls
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h1 className="text-2xl font-bold">{poll.title}</h1>
          {isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="outline">Closed</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{poll.description}</p>
      </div>

      {/* Countdown + vote count */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <CountdownTimer closesAt={poll.closesAt as any} />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Voted confirmation */}
      {hasVoted && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          You&apos;ve voted in this poll.
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const count = voteCounts.get(opt.id) ?? 0
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0

          return (
            <PollOptionCard
              key={opt.id}
              text={opt.text}
              isSelected={selectedOption === opt.id}
              isVoted={myVoteOptionId === opt.id}
              votePercent={pct}
              voteCount={count}
              mode={showResults ? 'results' : 'voting'}
              onSelect={() => setSelectedOption(opt.id)}
            />
          )
        })}
      </div>

      {/* Vote button */}
      {!hasVoted && isActive && (
        <Button
          variant="green"
          size="lg"
          className="w-full"
          onClick={handleVote}
          disabled={!selectedOption || submitting}
        >
          {submitting ? 'Casting vote...' : 'Cast Vote'}
        </Button>
      )}

      {/* Add member option */}
      {poll.allowMemberOptions && isActive && !hasVoted && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-800 font-medium mb-2">
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Suggest an option
            </p>
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Your suggestion..."
                className="flex-1 text-sm"
                maxLength={100}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                disabled={!newOption.trim() || addingOption}
              >
                {addingOption ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Comments */}
      <PollCommentThread pollId={pollId} />
    </div>
  )
}
