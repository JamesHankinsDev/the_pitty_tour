'use client'

import { useState, useEffect } from 'react'
import { subscribeToPolls, closePoll } from '@/lib/firebase/firestore'
import { formatTimestampFull } from '@/lib/utils/dates'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Vote, Plus, Lock } from 'lucide-react'
import Link from 'next/link'
import type { Poll } from '@/lib/types'


export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToPolls((p) => {
      setPolls(p)
      setLoading(false)
    })
    return unsub
  }, [])

  const handleClose = async (pollId: string) => {
    setClosing(pollId)
    try {
      await closePoll(pollId)
      toast.success('Poll closed.')
    } catch {
      toast.error('Failed to close poll.')
    } finally {
      setClosing(null)
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
            Manage Polls
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {polls.length} poll{polls.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="green" size="sm" asChild>
          <Link href="/admin/polls/new">
            <Plus className="w-4 h-4 mr-1" />
            New Poll
          </Link>
        </Button>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No polls yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <Card key={poll.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{poll.title}</p>
                    {poll.status === 'active' ? (
                      <Badge variant="success" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Closed</Badge>
                    )}
                    {poll.allowMemberOptions && (
                      <Badge variant="outline" className="text-xs">Member Options</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {poll.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {formatTimestampFull(poll.createdAt as any)}
                  </p>
                </div>
                {poll.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClose(poll.id)}
                    disabled={closing === poll.id}
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    {closing === poll.id ? 'Closing...' : 'Close'}
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
