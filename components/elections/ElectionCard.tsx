'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountdownTimer } from '@/components/polls/CountdownTimer'
import { RoleBadge } from './RoleBadge'
import { Users, Vote, Lock } from 'lucide-react'
import type { Election } from '@/lib/types'

interface ElectionCardProps {
  election: Election
}

export function ElectionCard({ election }: ElectionCardProps) {
  const phase = election.status
  const nextTransition =
    phase === 'nomination' ? election.nominationsCloseAt :
    phase === 'active' ? election.votingCloseAt : null

  return (
    <Link href={`/dashboard/elections/${election.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-sm">{election.officeTitle}</h3>
                <RoleBadge officeKey={election.officeKey} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {election.description}
              </p>
              <div className="flex items-center gap-3">
                {phase === 'nomination' && (
                  <Badge variant="warning" className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Nominations
                  </Badge>
                )}
                {phase === 'active' && (
                  <Badge variant="success" className="text-xs flex items-center gap-1">
                    <Vote className="w-3 h-3" />
                    Voting
                  </Badge>
                )}
                {phase === 'closed' && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Closed
                  </Badge>
                )}
                {nextTransition && (
                  <CountdownTimer closesAt={nextTransition as any} />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
