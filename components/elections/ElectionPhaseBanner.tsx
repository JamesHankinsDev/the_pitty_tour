'use client'

import { CountdownTimer } from '@/components/polls/CountdownTimer'
import { Badge } from '@/components/ui/badge'
import { Users, Vote, Lock } from 'lucide-react'

interface ElectionPhaseBannerProps {
  phase: 'nomination' | 'active' | 'closed'
  nextTransitionAt?: { seconds: number }
}

const phaseConfig = {
  nomination: {
    icon: Users,
    label: 'Nominations Open',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    badgeVariant: 'warning' as const,
  },
  active: {
    icon: Vote,
    label: 'Voting Open',
    color: 'bg-green-50 border-green-200 text-green-800',
    badgeVariant: 'success' as const,
  },
  closed: {
    icon: Lock,
    label: 'Election Closed',
    color: 'bg-muted border-border text-muted-foreground',
    badgeVariant: 'outline' as const,
  },
}

export function ElectionPhaseBanner({ phase, nextTransitionAt }: ElectionPhaseBannerProps) {
  const config = phaseConfig[phase]
  const Icon = config.icon

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${config.color}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
      </div>
      {nextTransitionAt && phase !== 'closed' && (
        <CountdownTimer closesAt={nextTransitionAt} />
      )}
    </div>
  )
}
