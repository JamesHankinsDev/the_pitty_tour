'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToElections, updateElectionStatus, closeElection } from '@/lib/firebase/firestore'
import { formatTimestampFull } from '@/lib/utils/dates'
import { RoleBadge } from '@/components/elections/RoleBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Vote, Plus, Play, Lock, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { Election } from '@/lib/types'


export default function AdminElectionsPage() {
  const { user } = useAuth()
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToElections((e) => {
      setElections(e)
      setLoading(false)
    })
    return unsub
  }, [])

  const handleAdvance = async (election: Election) => {
    setProcessing(election.id)
    try {
      if (election.status === 'nomination') {
        await updateElectionStatus(election.id, 'active')
        toast.success('Advanced to voting phase.')
      } else if (election.status === 'active') {
        if (!user) return
        const result = await closeElection(election, user.uid)
        if (result) {
          toast.success(`Election closed! ${result.winnerName} wins ${election.officeTitle}.`)
        } else {
          toast.error('No votes cast — cannot determine a winner.')
        }
      }
    } catch {
      toast.error('Failed to update election.')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-green-600" />
            Manage Elections
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {elections.length} election{elections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="green" size="sm" asChild>
          <Link href="/admin/elections/new">
            <Plus className="w-4 h-4 mr-1" />
            New Election
          </Link>
        </Button>
      </div>

      {elections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No elections yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {elections.map((election) => (
            <Card key={election.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{election.officeTitle}</p>
                    <RoleBadge officeKey={election.officeKey} />
                    {election.status === 'nomination' && (
                      <Badge variant="warning" className="text-xs">Nominations</Badge>
                    )}
                    {election.status === 'active' && (
                      <Badge variant="success" className="text-xs">Voting</Badge>
                    )}
                    {election.status === 'closed' && (
                      <Badge variant="outline" className="text-xs">Closed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatTimestampFull(election.createdAt as any)}
                  </p>
                </div>
                {election.status === 'nomination' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdvance(election)}
                    disabled={processing === election.id}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    {processing === election.id ? 'Advancing...' : 'Start Voting'}
                  </Button>
                )}
                {election.status === 'active' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAdvance(election)}
                    disabled={processing === election.id}
                  >
                    <Trophy className="w-3.5 h-3.5 mr-1.5" />
                    {processing === election.id ? 'Closing...' : 'Close & Tally'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
