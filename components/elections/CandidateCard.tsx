'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Vote } from 'lucide-react'
import type { UserProfile } from '@/lib/types'

interface CandidateCardProps {
  user: UserProfile | null
  accepted: boolean
  declined: boolean
  mode: 'nomination' | 'voting' | 'results'
  votePercent?: number
  voteCount?: number
  isMyVote?: boolean
  isWinner?: boolean
  onVote?: () => void
}

export function CandidateCard({
  user,
  accepted,
  declined,
  mode,
  votePercent = 0,
  voteCount = 0,
  isMyVote,
  isWinner,
  onVote,
}: CandidateCardProps) {
  const name = user?.displayName ?? 'Unknown'
  const photo = user?.photoURL ?? ''

  if (mode === 'nomination') {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${
        accepted ? 'border-green-200 bg-green-50' :
        declined ? 'border-red-200 bg-red-50 opacity-60' :
        'border-yellow-200 bg-yellow-50'
      }`}>
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={photo} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            HCP: {user?.handicapIndex ?? '—'}
          </p>
        </div>
        {accepted ? (
          <Badge variant="success" className="text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </Badge>
        ) : declined ? (
          <Badge variant="destructive" className="text-xs">Declined</Badge>
        ) : (
          <Badge variant="warning" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        )}
      </div>
    )
  }

  if (mode === 'voting') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-green-300 hover:bg-accent transition-colors">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={photo} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">
            HCP: {user?.handicapIndex ?? '—'}
          </p>
        </div>
        <Button variant="green" size="sm" onClick={onVote}>
          <Vote className="w-4 h-4 mr-1" />
          Vote
        </Button>
      </div>
    )
  }

  // Results mode
  return (
    <div className={`relative p-4 rounded-xl border-2 overflow-hidden ${
      isWinner ? 'border-yellow-400 bg-yellow-50' :
      isMyVote ? 'border-green-400 bg-green-50' :
      'border-border'
    }`}>
      {/* Bar */}
      <div
        className={`absolute inset-y-0 left-0 ${
          isWinner ? 'bg-yellow-200/50' : isMyVote ? 'bg-green-200/50' : 'bg-muted/50'
        }`}
        style={{ width: `${votePercent}%` }}
      />

      <div className="relative flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={photo} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{name}</p>
            {isWinner && <Badge className="bg-yellow-500 text-white text-xs">Winner</Badge>}
            {isMyVote && !isWinner && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Your vote
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">{votePercent.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">{voteCount} vote{voteCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
}
