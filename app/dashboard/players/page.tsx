'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Search, MapPin } from 'lucide-react'
import { RoleBadge } from '@/components/elections/RoleBadge'

export const dynamic = 'force-dynamic'

export default function PlayersPage() {
  const { profile } = useAuth()
  const { users, loading } = useUsers()
  const [search, setSearch] = useState('')

  const filtered = users
    .filter((p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          Tour Players
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {users.length} member{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="pl-9"
        />
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {search ? 'No players match your search' : 'No players registered yet'}
            </p>
          </div>
        ) : (
          filtered.map((player) => {
            const isYou = player.uid === profile?.uid
            const isLfg = player.lookingForPartner

            return (
              <Card
                key={player.uid}
                className={isYou ? 'border-green-200 bg-green-50/50' : ''}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={player.photoURL} />
                    <AvatarFallback>
                      {player.displayName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {player.displayName}
                      </p>
                      {isYou && (
                        <Badge variant="success" className="text-xs">You</Badge>
                      )}
                      {player.isAdmin && (
                        <Badge variant="outline" className="text-xs">Admin</Badge>
                      )}
                      {player.roles?.map((role) => (
                        <RoleBadge key={role} officeKey={role} />
                      ))}
                      {isLfg && (
                        <Badge variant="warning" className="text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          LFG
                        </Badge>
                      )}
                    </div>
                    {player.lookingForPartnerNote && isLfg && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {player.lookingForPartnerNote}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">
                      {player.handicapIndex}
                    </p>
                    <p className="text-xs text-muted-foreground">HCP</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
