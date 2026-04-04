'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountdownTimer } from './CountdownTimer'
import { Users, CheckCircle2 } from 'lucide-react'
import type { Poll } from '@/lib/types'

interface PollCardProps {
  poll: Poll
  hasVoted: boolean
  voteCount: number
}

export function PollCard({ poll, hasVoted, voteCount }: PollCardProps) {
  const isActive = poll.status === 'active'

  return (
    <Link href={`/dashboard/polls/${poll.id}`}>
      <Card className={`hover:bg-accent/50 transition-colors cursor-pointer ${
        isActive ? '' : 'opacity-70'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-sm">{poll.title}</h3>
                {isActive ? (
                  <Badge variant="success" className="text-xs">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Closed</Badge>
                )}
                {hasVoted && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Voted
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {poll.description}
              </p>
              <div className="flex items-center gap-3">
                <CountdownTimer closesAt={poll.closesAt as any} />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
