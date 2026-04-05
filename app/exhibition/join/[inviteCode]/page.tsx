'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import {
  findSessionByInviteCode,
  joinExhibitionSession,
} from '@/lib/firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Sparkles, Users, Flag, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ExhibitionSession } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function JoinPage() {
  const params = useParams()
  const code = String(params.inviteCode ?? '').toUpperCase()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [session, setSession] = useState<ExhibitionSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!code) return
    findSessionByInviteCode(code)
      .then(setSession)
      .finally(() => setLoading(false))
  }, [code])

  const handleJoin = async () => {
    if (!user || !profile || !session) return
    setJoining(true)
    try {
      await joinExhibitionSession(session.id, {
        userId: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        handicapIndex: profile.handicapIndex,
        courseHandicap: 0, // computed at round start
        teamId: null,
        status: 'joined',
        drinksConsumed: 0,
        cardInventory: [],
        pendingCards: [],
        scores: {},
      })
      toast.success('Joined!')
      router.push(`/exhibition/${session.id}/lobby`)
    } catch {
      toast.error('Failed to join session')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton className="h-32 w-full max-w-sm" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-lg font-semibold">Invalid Invite Code</p>
          <p className="text-sm text-muted-foreground">
            The code "{code}" doesn&apos;t match an active session.
          </p>
          <Button variant="outline" asChild>
            <Link href="/exhibition">Back to Exhibition</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Sparkles className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Join Exhibition</h1>
          <p className="text-sm text-muted-foreground">
            Invite code: <span className="font-mono font-bold">{code}</span>
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm font-semibold">{session.courseName}</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                {session.holes} holes &middot; {session.teeName} tees ({session.courseRating}/{session.slope})
              </p>
              <p className="capitalize">
                {session.format.replace('_', ' ')} &middot; {session.scoringMode}
                {session.useCards ? ' · Cards On' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        {session.status === 'lobby' && (
          <Button variant="green" size="lg" className="w-full" onClick={handleJoin} disabled={joining}>
            <Users className="w-4 h-4 mr-2" />
            {joining ? 'Joining...' : 'Join Session'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {session.status === 'active' && (
          <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
            <Lock className="w-4 h-4 shrink-0" />
            This session is already in progress.
          </div>
        )}

        {session.status === 'completed' && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Lock className="w-4 h-4 shrink-0" />
              This session has ended.
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href={`/exhibition/${session.id}/results`}>View Results</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
