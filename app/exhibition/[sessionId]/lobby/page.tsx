'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToExhibitionSession,
  subscribeToExhibitionPlayers,
  getCachedCourse,
  updateExhibitionPlayer,
  updateExhibitionSession,
  removeExhibitionPlayer,
} from '@/lib/firebase/firestore'
import {
  calculateCourseHandicap,
  distributeHandicapStrokes,
  type HoleData,
} from '@/lib/utils/exhibition'
import { Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users,
  Flag,
  Play,
  Copy,
  Check,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import type { ExhibitionSession, ExhibitionPlayer, CachedCourse, ExhibitionHoleScore } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function LobbyPage() {
  const params = useParams()
  const sessionId = String(params.sessionId ?? '')
  const router = useRouter()
  const { user } = useAuth()

  const [session, setSession] = useState<ExhibitionSession | null>(null)
  const [players, setPlayers] = useState<ExhibitionPlayer[]>([])
  const [course, setCourse] = useState<CachedCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const unsubS = subscribeToExhibitionSession(sessionId, (s) => {
      setSession(s)
      setLoading(false)
      // Auto-navigate if session has become active
      if (s?.status === 'active') router.replace(`/exhibition/${sessionId}/play`)
      if (s?.status === 'completed') router.replace(`/exhibition/${sessionId}/results`)
    })
    const unsubP = subscribeToExhibitionPlayers(sessionId, setPlayers)
    return () => { unsubS(); unsubP() }
  }, [sessionId, router])

  // Load the full course for handicap calculation at start
  useEffect(() => {
    if (!session?.courseId) return
    getCachedCourse(session.courseId).then(setCourse)
  }, [session?.courseId])

  const isHost = user?.uid === session?.hostId
  const me = players.find((p) => p.userId === user?.uid)

  const copyCode = () => {
    if (!session) return
    navigator.clipboard.writeText(session.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAssignTeam = async (playerUid: string, teamId: string | null) => {
    await updateExhibitionPlayer(sessionId, playerUid, { teamId })
  }

  const handleRemove = async (playerUid: string) => {
    if (playerUid === user?.uid) return
    await removeExhibitionPlayer(sessionId, playerUid)
  }

  const handleStart = async () => {
    if (!session || !course || !isHost) return
    setStarting(true)
    try {
      // Determine which holes to play
      const hostedHoles: HoleData[] = course.holes
        .filter((h) => {
          if (session.holes === 18) return true
          if (session.startingHole === 1) return h.number <= 9
          return h.number >= 10
        })
        .map((h) => ({ number: h.number, par: h.par, strokeIndex: h.strokeIndex }))

      // Calculate course handicap and distribute strokes for each player
      for (const p of players) {
        const courseHcp = calculateCourseHandicap(
          p.handicapIndex,
          session.slope,
          session.courseRating,
          course.par
        )
        const strokeMap = distributeHandicapStrokes(courseHcp, hostedHoles)

        // Seed scores map with par/strokeIndex/handicapStrokes per hole
        const scores: Record<string, ExhibitionHoleScore> = {}
        for (const h of hostedHoles) {
          scores[String(h.number)] = {
            gross: null,
            net: null,
            par: h.par,
            strokeIndex: h.strokeIndex,
            handicapStrokes: strokeMap[String(h.number)] ?? 0,
            stablefordPoints: null,
            cardUsed: null,
            cardReceived: null,
            honestAbeActive: false,
            submittedAt: null,
          }
        }

        await updateExhibitionPlayer(sessionId, p.userId, {
          courseHandicap: courseHcp,
          status: 'active',
          scores,
        })
      }

      // Update team member IDs on session
      let updatedTeams = session.teams
      if (session.teamMode && session.teams) {
        updatedTeams = session.teams.map((t) => ({
          ...t,
          memberIds: players.filter((p) => p.teamId === t.id).map((p) => p.userId),
        }))
      }

      await updateExhibitionSession(sessionId, {
        status: 'active',
        startedAt: Timestamp.now(),
        teams: updatedTeams,
      })

      toast.success('Round started!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to start round')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-4 lg:p-8 text-center text-muted-foreground">
        <p>Session not found.</p>
        <Link href="/exhibition" className="text-purple-700 hover:underline text-sm mt-2 inline-block">Back to Exhibition</Link>
      </div>
    )
  }

  const canStart = isHost && players.filter((p) => p.status === 'joined').length >= 2 && !!course
  const teamsValid = !session.teamMode || (session.teams && players.every((p) => p.teamId !== null))

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/exhibition" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Exhibition
        </Link>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Lobby
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Waiting for players to join
          </p>
        </div>

        {/* Session details */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm font-semibold">{session.courseName}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {session.holes} holes &middot; {session.teeName} ({session.courseRating}/{session.slope}) &middot;{' '}
              <span className="capitalize">{session.format.replace('_', ' ')}</span> &middot;{' '}
              <span className="capitalize">{session.scoringMode}</span>
              {session.useCards && ` · Cards (${session.activeCards.length}${session.nsfwCards ? ', NSFW' : ''})`}
            </div>
          </CardContent>
        </Card>

        {/* Invite code */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <p className="text-xs text-purple-800 font-medium mb-1">Invite Code</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black font-mono text-purple-900 tracking-wider">
                {session.inviteCode}
              </p>
              <Button variant="outline" size="sm" onClick={copyCode}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-purple-700 mt-2 break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/exhibition/join/{session.inviteCode}
            </p>
          </CardContent>
        </Card>

        {/* Players list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for players...
              </p>
            ) : (
              players.map((p) => {
                const team = session.teams?.find((t) => t.id === p.teamId)
                return (
                  <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={p.photoURL ?? undefined} />
                      <AvatarFallback>{p.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{p.displayName}</p>
                        {p.userId === session.hostId && <Badge variant="outline" className="text-xs">Host</Badge>}
                        {team && (
                          <Badge
                            className="text-xs text-white border-0"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">HCP: {p.handicapIndex}</p>
                    </div>
                    {session.teamMode && session.teams && isHost && (
                      <div className="flex gap-1">
                        {session.teams.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleAssignTeam(p.userId, p.teamId === t.id ? null : t.id)}
                            className={`w-6 h-6 rounded-full border-2 ${p.teamId === t.id ? 'border-foreground' : 'border-transparent'}`}
                            style={{ backgroundColor: t.color }}
                            title={t.name}
                          />
                        ))}
                      </div>
                    )}
                    {isHost && p.userId !== user?.uid && (
                      <button
                        onClick={() => handleRemove(p.userId)}
                        className="text-muted-foreground hover:text-red-500 p-1"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Start button */}
        {isHost ? (
          <Button
            variant="green"
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={!canStart || !teamsValid || starting}
          >
            <Play className="w-4 h-4 mr-2" />
            {starting
              ? 'Starting...'
              : !canStart
              ? 'Need at least 2 players to start'
              : !teamsValid
              ? 'Assign all players to teams'
              : 'Start Round'}
          </Button>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            Waiting for {players.find((p) => p.userId === session.hostId)?.displayName ?? 'the host'} to start the round...
          </div>
        )}
      </div>
    </div>
  )
}
