'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUsers } from '@/contexts/UsersContext'
import { subscribeToCurrentOfficers } from '@/lib/firebase/firestore'
import { RoleBadge } from '@/components/elections/RoleBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Crown,
  BookOpen,
  Scale,
  Shield,
  Target,
  Users,
  CheckCircle2,
} from 'lucide-react'
import type { CurrentOfficer } from '@/lib/types'
import { formatTimestamp } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

interface OfficeDef {
  officeKey: string
  officeTitle: string
  icon: React.ElementType
  color: string
  description: string
  permissions: string[]
}

const OFFICES: OfficeDef[] = [
  {
    officeKey: 'commissioner',
    officeTitle: 'Commissioner',
    icon: Crown,
    color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    description:
      'League president. Makes final calls on escalated rules disputes, sets the season calendar, and serves as the public face of the PITY Tour.',
    permissions: [
      'Post and edit league-wide announcements',
      'View all member roster and profile data',
      'Approve season configuration changes (admin reviews before applying)',
      'Read-only access to all scoring and standings data',
    ],
  },
  {
    officeKey: 'secretary',
    officeTitle: 'Secretary',
    icon: BookOpen,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    description:
      'Handles official league communications, keeps meeting minutes, and manages the announcement board.',
    permissions: [
      'Post and edit league-wide announcements (without full admin access)',
      'Read-only access to member roster and contact info for communication purposes',
    ],
  },
  {
    officeKey: 'treasurer',
    officeTitle: 'Treasurer',
    icon: Scale,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    description:
      'Manages league finances. Tracks dues collection, forfeit payments, and prize pool balance. Coordinates end-of-season payouts.',
    permissions: [
      'Access to Treasurer financial summary dashboard',
      'View dues collected, forfeits collected, and prize pool balance for the current season',
      'Read-only — cannot modify payment records',
    ],
  },
  {
    officeKey: 'master_at_arms',
    officeTitle: 'Master at Arms',
    icon: Shield,
    color: 'text-red-700 bg-red-50 border-red-200',
    description:
      'Rules head and integrity officer. Investigates score disputes and reviews flagged attestations. Issues rulings on rules questions in coordination with the Handicap Chair.',
    permissions: [
      '"Flag for review" button visible on round and attestation detail pages',
      'Flagged items are written to a flaggedRounds collection and appear in the admin review queue',
    ],
  },
  {
    officeKey: 'handicap_chair',
    officeTitle: 'Handicap Chair',
    icon: Target,
    color: 'text-green-700 bg-green-50 border-green-200',
    description:
      'Oversees handicap integrity. Reviews and approves manual handicap adjustments, sets sandbagging policy in coordination with the Master at Arms, and certifies all handicaps before the PITY Cup.',
    permissions: [
      'Submit manual handicap adjustment requests (admin must approve before applying)',
      'Read access to all members\' full scoring history and handicap trend data',
    ],
  },
]

export default function OfficersPage() {
  const { users } = useUsers()
  const [officers, setOfficers] = useState<CurrentOfficer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToCurrentOfficers((o) => {
      setOfficers(o)
      setLoading(false)
    })
    return unsub
  }, [])

  const officerMap = useMemo(
    () => new Map(officers.map((o) => [o.officeKey, o])),
    [officers]
  )
  const userMap = useMemo(
    () => new Map(users.map((u) => [u.uid, u])),
    [users]
  )

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
      </div>
    )
  }

  const filledCount = officers.length

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          Tour Officers
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filledCount} of {OFFICES.length} positions filled
        </p>
      </div>

      <div className="space-y-4">
        {OFFICES.map((office) => {
          const Icon = office.icon
          const currentOfficer = officerMap.get(office.officeKey)
          const holder = currentOfficer ? userMap.get(currentOfficer.userId) : null
          const isFilled = !!currentOfficer

          return (
            <Card key={office.officeKey} className={`border-2 ${isFilled ? office.color : 'border-dashed border-muted'}`}>
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isFilled ? office.color : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-bold text-lg">{office.officeTitle}</h2>
                      <RoleBadge officeKey={office.officeKey} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {office.description}
                    </p>
                  </div>
                </div>

                {/* Current holder */}
                {isFilled && holder ? (
                  <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={holder.photoURL} />
                      <AvatarFallback>{holder.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{holder.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Since {formatTimestamp(currentOfficer!.termStartedAt as any)}
                      </p>
                    </div>
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </Badge>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg text-center mb-3">
                    <p className="text-sm text-muted-foreground">
                      Position vacant — awaiting election
                    </p>
                  </div>
                )}

                {/* Permissions */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    App Permissions
                  </p>
                  <ul className="space-y-1">
                    {office.permissions.map((perm, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
