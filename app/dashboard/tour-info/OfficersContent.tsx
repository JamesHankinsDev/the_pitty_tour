'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUsers } from '@/contexts/UsersContext'
import { subscribeToCurrentOfficers } from '@/lib/firebase/firestore'
import { RoleBadge } from '@/components/elections/RoleBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Crown, BookOpen, Scale, Shield, Target, CheckCircle2 } from 'lucide-react'
import type { CurrentOfficer } from '@/lib/types'
import { formatTimestamp } from '@/lib/utils/dates'

interface OfficeDef {
  officeKey: string
  officeTitle: string
  icon: React.ElementType
  color: string
  description: string
}

const OFFICES: OfficeDef[] = [
  { officeKey: 'commissioner', officeTitle: 'Commissioner', icon: Crown, color: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800',
    description: 'League president. Makes final calls on escalated rules disputes and serves as the public face of the PITY Tour.' },
  { officeKey: 'secretary', officeTitle: 'Secretary', icon: BookOpen, color: 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800',
    description: 'Handles official league communications and manages the announcement board.' },
  { officeKey: 'treasurer', officeTitle: 'Treasurer', icon: Scale, color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
    description: 'Manages league finances. Tracks dues collection, forfeit payments, and prize pool balance.' },
  { officeKey: 'master_at_arms', officeTitle: 'Master at Arms', icon: Shield, color: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800',
    description: 'Rules head and integrity officer. Investigates score disputes and reviews flagged attestations.' },
  { officeKey: 'handicap_chair', officeTitle: 'Handicap Chair', icon: Target, color: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800',
    description: 'Oversees handicap integrity. Reviews scoring trends and certifies handicaps before major events.' },
]

export default function OfficersContent() {
  const { users } = useUsers()
  const [officers, setOfficers] = useState<CurrentOfficer[]>([])

  useEffect(() => {
    const unsub = subscribeToCurrentOfficers(setOfficers)
    return unsub
  }, [])

  const officerMap = useMemo(() => new Map(officers.map((o) => [o.officeKey, o])), [officers])
  const userMap = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users])

  return (
    <div className="space-y-3">
      {OFFICES.map((office) => {
        const Icon = office.icon
        const currentOfficer = officerMap.get(office.officeKey)
        const holder = currentOfficer ? userMap.get(currentOfficer.userId) : null
        const isFilled = !!currentOfficer

        return (
          <Card key={office.officeKey} className={`border ${isFilled ? office.color : 'border-dashed border-muted'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isFilled ? office.color : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="font-bold text-sm">{office.officeTitle}</h3>
                    <RoleBadge officeKey={office.officeKey} />
                  </div>
                  <p className="text-xs text-muted-foreground">{office.description}</p>
                </div>
              </div>
              {isFilled && holder ? (
                <div className="flex items-center gap-2.5 p-2.5 bg-background/80 rounded-lg border">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={holder.photoURL} />
                    <AvatarFallback>{holder.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{holder.displayName}</p>
                    <p className="text-xs text-muted-foreground">Since {formatTimestamp(currentOfficer!.termStartedAt as any)}</p>
                  </div>
                  <Badge variant="success" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">Vacant — awaiting election</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
