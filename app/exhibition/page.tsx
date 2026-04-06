'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserExhibitionSessions } from '@/lib/firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Plus, Flag, Users, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ExhibitionSession } from '@/lib/types'


export default function ExhibitionListPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ExhibitionSession[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    if (!user) return
    getUserExhibitionSessions(user.uid)
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [user])

  const { lobby, active, completed } = useMemo(() => ({
    lobby: sessions.filter((s) => s.status === 'lobby'),
    active: sessions.filter((s) => s.status === 'active'),
    completed: sessions.filter((s) => s.status === 'completed')
      .sort((a, b) => ((b.completedAt as any)?.seconds ?? 0) - ((a.completedAt as any)?.seconds ?? 0))
      .slice(0, 10),
  }), [sessions])

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Exhibition
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Casual games &middot; doesn&apos;t affect tour standings
          </p>
        </div>

        {/* Start new + Join */}
        <div className="grid grid-cols-1 gap-3">
          <Button variant="green" size="lg" asChild>
            <Link href="/exhibition/new">
              <Plus className="w-4 h-4 mr-2" />
              Start a New Game
            </Link>
          </Button>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Join with invite code
              </p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  className="font-mono uppercase"
                  maxLength={6}
                />
                <Button
                  variant="outline"
                  disabled={joinCode.length !== 6}
                  asChild
                >
                  <Link href={joinCode.length === 6 ? `/exhibition/join/${joinCode}` : '#'}>
                    <Search className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No exhibition games yet</p>
            <p className="text-sm mt-1">Start a new game or join with an invite code.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {lobby.length > 0 && (
              <SessionSection title="Waiting in Lobby" sessions={lobby} route="lobby" />
            )}
            {active.length > 0 && (
              <SessionSection title="In Progress" sessions={active} route="play" />
            )}
            {completed.length > 0 && (
              <SessionSection title="Recent" sessions={completed} route="results" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionSection({
  title,
  sessions,
  route,
}: {
  title: string
  sessions: ExhibitionSession[]
  route: 'lobby' | 'play' | 'results'
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      {sessions.map((s) => {
        const statusBadge =
          s.status === 'lobby' ? (
            <Badge variant="warning" className="text-xs">Lobby</Badge>
          ) : s.status === 'active' ? (
            <Badge variant="success" className="text-xs">In Progress</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Completed</Badge>
          )
        return (
          <Link key={s.id} href={`/exhibition/${s.id}/${route}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{s.courseName}</p>
                      {statusBadge}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {s.format.replace('_', ' ')} &middot; {s.holes} holes
                      {s.useCards && ' · Cards'}
                    </p>
                  </div>
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
