'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  COLLECTIONS,
  subscribeToCandidates,
  subscribeToPollVotes,
  nominateCandidate,
  respondToNomination,
  castElectionVote,
  createNotification,
} from '@/lib/firebase/firestore'
import { sendPush } from '@/lib/firebase/push'
import { ElectionPhaseBanner } from '@/components/elections/ElectionPhaseBanner'
import { CandidateCard } from '@/components/elections/CandidateCard'
import { RoleBadge } from '@/components/elections/RoleBadge'
import dynamic from 'next/dynamic'
const PollCommentThread = dynamic(() => import('@/components/polls/PollCommentThread').then((m) => m.PollCommentThread))
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, UserPlus, Hand } from 'lucide-react'
import Link from 'next/link'
import type { Election, Candidate, PollVote } from '@/lib/types'


export default function ElectionDetailPage() {
  const params = useParams()
  const pollId = params.pollId as string
  const { user, profile } = useAuth()
  const { users } = useUsers()

  const [election, setElection] = useState<Election | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [votes, setVotes] = useState<Map<string, PollVote>>(new Map())
  const [loading, setLoading] = useState(true)
  const [nomineeUid, setNomineeUid] = useState('')
  const [nominating, setNominating] = useState(false)
  const [voting, setVoting] = useState(false)

  const uid = user?.uid ?? ''
  const userMap = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users])

  // Vote tally — must be above early returns to satisfy hook ordering
  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [, v] of votes) {
      counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1)
    }
    return counts
  }, [votes])

  // Load election doc
  useEffect(() => {
    getDoc(doc(db, COLLECTIONS.POLLS, pollId))
      .then((snap) => {
        if (snap.exists()) setElection({ id: snap.id, ...snap.data() } as Election)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [pollId])

  // Subscribe to candidates + votes
  useEffect(() => {
    const unsubC = subscribeToCandidates(pollId, setCandidates)
    const unsubV = subscribeToPollVotes(pollId, setVotes)
    return () => { unsubC(); unsubV() }
  }, [pollId])

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  if (!election) {
    return (
      <div className="p-4 lg:p-8 text-center text-muted-foreground">
        <p>Election not found.</p>
        <Link href="/dashboard/elections" className="text-green-700 hover:underline text-sm mt-2 inline-block">
          Back to Elections
        </Link>
      </div>
    )
  }

  const phase = election.status
  const hasVoted = votes.has(uid)
  const myVoteCandidateId = votes.get(uid)?.optionId
  const totalVotes = votes.size

  const confirmed = candidates.filter((c) => c.acceptedNomination)
  const pending = candidates.filter((c) => !c.acceptedNomination && !c.declinedAt)
  const myNomination = candidates.find((c) => c.userId === uid && !c.declinedAt)

  const winnerId = phase === 'closed'
    ? Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    : null

  const nextTransition =
    phase === 'nomination' ? election.nominationsCloseAt :
    phase === 'active' ? election.votingCloseAt : undefined

  // Nominate handler
  const handleNominate = async () => {
    if (!nomineeUid || !user || !profile || !election) return
    const alreadyNominated = candidates.some((c) => c.userId === nomineeUid)
    if (alreadyNominated) { toast.error('This member has already been nominated'); return }
    setNominating(true)
    try {
      await nominateCandidate(pollId, nomineeUid, user.uid)
      setNomineeUid('')
      toast.success('Nomination submitted!')

      // Notify the nominee (skip if self-nomination)
      if (nomineeUid !== user.uid) {
        const title = `You've been nominated for ${election.officeTitle}`
        const body = `${profile.displayName} nominated you. Accept or decline on the election page.`
        createNotification({
          recipientUid: nomineeUid,
          type: 'admin',
          title,
          body,
          link: `/dashboard/elections/${pollId}`,
          actorUid: user.uid,
          actorName: profile.displayName,
          actorPhotoURL: profile.photoURL,
        }).catch(() => {})
        sendPush({
          recipientUids: [nomineeUid],
          title,
          body,
          link: `/dashboard/elections/${pollId}`,
        })
      }
    } catch {
      toast.error('Failed to nominate.')
    } finally {
      setNominating(false)
    }
  }

  // Accept/decline
  const handleRespond = async (candidateId: string, accept: boolean) => {
    try {
      await respondToNomination(pollId, candidateId, accept)
      toast.success(accept ? 'Nomination accepted!' : 'Nomination declined.')
    } catch {
      toast.error('Failed to respond.')
    }
  }

  // Vote handler
  const handleVote = async (candidateId: string) => {
    if (!user) return
    setVoting(true)
    try {
      await castElectionVote(pollId, user.uid, candidateId)
      toast.success('Vote cast!')
    } catch {
      toast.error('Failed to cast vote.')
    } finally {
      setVoting(false)
    }
  }

  // Members eligible for nomination (not already nominated)
  const nominatedUids = new Set(candidates.map((c) => c.userId))
  const eligibleMembers = users.filter((u) => !nominatedUids.has(u.uid))

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/elections" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        All Elections
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold">{election.officeTitle} Election</h1>
          <RoleBadge officeKey={election.officeKey} size="md" />
        </div>
        <p className="text-muted-foreground text-sm">{election.description}</p>
      </div>

      {/* Phase banner */}
      <ElectionPhaseBanner phase={phase} nextTransitionAt={nextTransition as any} />

      {/* ── Nomination Phase ──────────────────────────────────────────────── */}
      {phase === 'nomination' && (
        <>
          {/* My pending nomination */}
          {myNomination && !myNomination.acceptedNomination && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="p-4">
                <p className="font-semibold text-sm text-yellow-800 mb-2">
                  You&apos;ve been nominated for {election.officeTitle}!
                </p>
                <div className="flex gap-2">
                  <Button variant="green" size="sm" onClick={() => handleRespond(myNomination.id, true)}>
                    Accept Nomination
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRespond(myNomination.id, false)}>
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmed candidates */}
          {confirmed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Confirmed Candidates</h3>
              {confirmed.map((c) => (
                <CandidateCard key={c.id} user={userMap.get(c.userId) ?? null} accepted={true} declined={false} mode="nomination" />
              ))}
            </div>
          )}

          {/* Pending nominations */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Pending Nominations</h3>
              {pending.map((c) => (
                <CandidateCard key={c.id} user={userMap.get(c.userId) ?? null} accepted={false} declined={false} mode="nomination" />
              ))}
            </div>
          )}

          {/* Self-nomination */}
          {!nominatedUids.has(uid) && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hand className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm text-green-800">Volunteer Yourself</p>
                    <p className="text-xs text-green-700">Put your name forward for {election.officeTitle}</p>
                  </div>
                </div>
                <Button
                  variant="green"
                  size="sm"
                  onClick={async () => {
                    if (!user) return
                    setNominating(true)
                    try {
                      await nominateCandidate(pollId, user.uid, user.uid)
                      // Auto-accept self-nomination
                      const snap = await import('firebase/firestore').then(m => m.getDocs(
                        m.query(m.collection(db, COLLECTIONS.POLLS, pollId, 'candidates'), m.where('userId', '==', user.uid))
                      ))
                      if (!snap.empty) {
                        await respondToNomination(pollId, snap.docs[0].id, true)
                      }
                      toast.success('You\'ve volunteered! Your nomination is confirmed.')
                    } catch {
                      toast.error('Failed to volunteer.')
                    } finally {
                      setNominating(false)
                    }
                  }}
                  disabled={nominating}
                >
                  {nominating ? 'Submitting...' : 'I\'ll Run'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Nominate another member */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Nominate a Member
              </h3>
                <div className="flex gap-2">
                  <Select value={nomineeUid} onValueChange={setNomineeUid}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleMembers.map((u) => (
                        <SelectItem key={u.uid} value={u.uid}>
                          {u.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="green" onClick={handleNominate} disabled={!nomineeUid || nominating}>
                    {nominating ? 'Nominating...' : 'Nominate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
        </>
      )}

      {/* ── Voting Phase ──────────────────────────────────────────────────── */}
      {phase === 'active' && (
        <>
          {hasVoted ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Your vote has been recorded. Results will be revealed when the election closes.
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Cast Your Vote</h3>
              {confirmed.map((c) => (
                <CandidateCard
                  key={c.id}
                  user={userMap.get(c.userId) ?? null}
                  accepted={true}
                  declined={false}
                  mode="voting"
                  onVote={() => handleVote(c.id)}
                />
              ))}
              {confirmed.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No confirmed candidates yet.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Closed Phase ──────────────────────────────────────────────────── */}
      {phase === 'closed' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
          {confirmed.map((c) => {
            const count = voteCounts.get(c.id) ?? 0
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
            return (
              <CandidateCard
                key={c.id}
                user={userMap.get(c.userId) ?? null}
                accepted={true}
                declined={false}
                mode="results"
                votePercent={pct}
                voteCount={count}
                isMyVote={myVoteCandidateId === c.id}
                isWinner={winnerId === c.id}
              />
            )
          })}
        </div>
      )}

      <Separator />

      {/* Comments */}
      <PollCommentThread pollId={pollId} />
    </div>
  )
}
