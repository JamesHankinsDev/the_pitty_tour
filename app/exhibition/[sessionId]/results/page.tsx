'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  subscribeToExhibitionSession,
  subscribeToExhibitionPlayers,
  subscribeToCardLog,
  getCachedCourse,
} from '@/lib/firebase/firestore'
import { getBeerCanGimmeRadius } from '@/lib/utils/exhibition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Trophy, Award, Beer, RotateCcw, Share2, ArrowLeft, Target, Medal,
} from 'lucide-react'
import Link from 'next/link'
import type {
  ExhibitionSession,
  ExhibitionPlayer,
  ExhibitionCardLogEntry,
  CachedCourse,
} from '@/lib/types'


export default function ResultsPage() {
  const params = useParams()
  const sessionId = String(params.sessionId ?? '')
  const router = useRouter()

  const [session, setSession] = useState<ExhibitionSession | null>(null)
  const [players, setPlayers] = useState<ExhibitionPlayer[]>([])
  const [cardLog, setCardLog] = useState<ExhibitionCardLogEntry[]>([])
  const [course, setCourse] = useState<CachedCourse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    const unsubS = subscribeToExhibitionSession(sessionId, (s) => {
      setSession(s)
      setLoading(false)
    })
    const unsubP = subscribeToExhibitionPlayers(sessionId, setPlayers)
    const unsubL = subscribeToCardLog(sessionId, setCardLog)
    return () => { unsubS(); unsubP(); unsubL() }
  }, [sessionId])

  useEffect(() => {
    if (!session?.courseId) return
    getCachedCourse(session.courseId).then(setCourse)
  }, [session?.courseId])

  // Played holes in order
  const playedHoles = useMemo(() => {
    if (!players[0]?.scores) return []
    return Object.keys(players[0].scores).map(Number).sort((a, b) => a - b)
  }, [players])

  /* ── Format-specific summary ────────────────────────────────────────── */

  const playerTotals = useMemo(() => {
    if (!session) return []
    return players.map((p) => {
      let gross = 0
      let net = 0
      let stableford = 0
      for (const h of playedHoles) {
        const s = p.scores[String(h)]
        if (s?.gross !== null && s?.gross !== undefined) gross += s.gross
        if (s?.net !== null && s?.net !== undefined) net += s.net
        if (s?.stablefordPoints !== null && s?.stablefordPoints !== undefined) stableford += s.stablefordPoints
      }
      return { player: p, gross, net, stableford }
    })
  }, [players, playedHoles, session])

  const skinsBreakdown = useMemo(() => {
    if (session?.format !== 'skins') return null
    const skinCounts = new Map<string, { skins: number; holes: number[]; carryovers: number[] }>()
    players.forEach((p) => skinCounts.set(p.userId, { skins: 0, holes: [], carryovers: [] }))
    let carryover = 1
    const carryoverHoles: number[] = []

    for (const h of playedHoles) {
      const scores = players
        .map((p) => ({ uid: p.userId, net: p.scores[String(h)]?.net ?? null }))
        .filter((s) => s.net !== null)
      if (scores.length < 2) continue
      const min = Math.min(...scores.map((s) => s.net!))
      const winners = scores.filter((s) => s.net === min)
      if (winners.length === 1) {
        const entry = skinCounts.get(winners[0].uid)!
        entry.skins += carryover
        entry.holes.push(h)
        if (carryover > 1) entry.carryovers.push(...carryoverHoles, h)
        carryover = 1
        carryoverHoles.length = 0
      } else {
        carryover++
        carryoverHoles.push(h)
      }
    }
    return { skinCounts, finalCarryover: carryover, finalCarryoverHoles: carryoverHoles }
  }, [session, players, playedHoles])

  const matchPlayResult = useMemo(() => {
    if (session?.format !== 'match_play' || players.length < 2) return null
    const [a, b] = players
    const holeResults: Array<'W' | 'L' | 'H'> = []
    let aUp = 0
    let matchOver = false
    let matchOverAtHole: number | null = null

    for (let i = 0; i < playedHoles.length; i++) {
      const h = playedHoles[i]
      const sa = a.scores[String(h)]?.net
      const sb = b.scores[String(h)]?.net
      if (sa === null || sb === null || sa === undefined || sb === undefined) {
        holeResults.push('H')
        continue
      }
      if (sa < sb) { holeResults.push('W'); aUp++ }
      else if (sb < sa) { holeResults.push('L'); aUp-- }
      else holeResults.push('H')

      const holesRemaining = playedHoles.length - (i + 1)
      if (Math.abs(aUp) > holesRemaining && !matchOver) {
        matchOver = true
        matchOverAtHole = h
      }
    }
    const winner = aUp > 0 ? a : aUp < 0 ? b : null
    return { aUp, winner, holeResults, matchOverAtHole }
  }, [session, players, playedHoles])

  const teamTotals = useMemo(() => {
    if (!session?.teamMode || !session.teams) return null
    const isVegas = session.format === 'vegas'
    return session.teams.map((t) => {
      const members = players.filter((p) => p.teamId === t.id)
      let total = 0
      const holeTotals: Record<string, number> = {}
      for (const h of playedHoles) {
        const netScores = members
          .map((m) => m.scores[String(h)]?.net ?? null)
          .filter((s) => s !== null) as number[]
        if (netScores.length === 0) continue
        let holeTotal = 0
        if (isVegas && netScores.length === 2) {
          const sorted = [...netScores].sort((a, b) => a - b)
          holeTotal = sorted[0] * 10 + sorted[1]
        } else {
          holeTotal = Math.min(...netScores)
        }
        holeTotals[String(h)] = holeTotal
        total += holeTotal
      }
      return { team: t, members, total, holeTotals }
    }).sort((a, b) => a.total - b.total)
  }, [session, players, playedHoles])

  /* ── Actions ─────────────────────────────────────────────────────────── */

  const handlePlayAgain = () => {
    router.push('/exhibition/new')
  }

  const handleShare = async () => {
    if (!session) return
    let summary = `PITY Exhibition — ${session.courseName}\n`
    summary += `${session.holes} holes · ${session.format.replace('_', ' ')}\n\n`

    if (session.format === 'stroke_play') {
      const sorted = [...playerTotals].sort((a, b) => a.net - b.net)
      sorted.forEach((r, i) => {
        summary += `${i + 1}. ${r.player.displayName} - ${r.gross} / ${r.net}\n`
      })
    } else if (session.format === 'stableford') {
      const sorted = [...playerTotals].sort((a, b) => b.stableford - a.stableford)
      sorted.forEach((r, i) => {
        summary += `${i + 1}. ${r.player.displayName} - ${r.stableford} pts\n`
      })
    } else if (session.format === 'skins' && skinsBreakdown) {
      players.forEach((p) => {
        const entry = skinsBreakdown.skinCounts.get(p.userId)
        summary += `${p.displayName} - ${entry?.skins ?? 0} skins\n`
      })
    } else if (session.format === 'match_play' && matchPlayResult) {
      const winner = matchPlayResult.winner
      summary += winner ? `${winner.displayName} wins ${Math.abs(matchPlayResult.aUp)} UP\n` : 'Match All Square\n'
    } else if (teamTotals) {
      teamTotals.forEach((row, i) => {
        summary += `${i + 1}. ${row.team.name} - ${row.total}\n`
      })
    }

    try {
      await navigator.clipboard.writeText(summary)
      toast.success('Results copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading || !session) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const playerMap = new Map(players.map((p) => [p.userId, p]))
  const totalDrinks = players.reduce((s, p) => s + (p.drinksConsumed ?? 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4 pb-12">
        <Link href="/exhibition" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Exhibition
        </Link>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Final Results
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {session.courseName} &middot; {session.holes} holes &middot; <span className="capitalize">{session.format.replace('_', ' ')}</span>
          </p>
        </div>

        {/* ── Format-specific winner card ─────────────────────────────── */}

        {session.format === 'stroke_play' && playerTotals.length > 0 && (() => {
          const sorted = [...playerTotals].sort((a, b) => a.net - b.net)
          const winner = sorted[0]
          return (
            <Card className="bg-yellow-50 border-yellow-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Medal className="w-8 h-8 text-yellow-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-800 font-semibold uppercase">Winner</p>
                  <p className="font-bold text-lg">{winner.player.displayName}</p>
                  <p className="text-sm text-yellow-800">
                    {winner.gross} gross &middot; {winner.net} net
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {session.format === 'stableford' && playerTotals.length > 0 && (() => {
          const sorted = [...playerTotals].sort((a, b) => b.stableford - a.stableford)
          const winner = sorted[0]
          return (
            <Card className="bg-yellow-50 border-yellow-300">
              <CardContent className="p-4 flex items-center gap-3">
                <Medal className="w-8 h-8 text-yellow-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-800 font-semibold uppercase">Winner</p>
                  <p className="font-bold text-lg">{winner.player.displayName}</p>
                  <p className="text-sm text-yellow-800">{winner.stableford} points</p>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {session.format === 'match_play' && matchPlayResult && (
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-4 flex items-center gap-3">
              <Medal className="w-8 h-8 text-yellow-600 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-yellow-800 font-semibold uppercase">Match Result</p>
                {matchPlayResult.winner ? (
                  <>
                    <p className="font-bold text-lg">{matchPlayResult.winner.displayName}</p>
                    <p className="text-sm text-yellow-800">
                      Wins {Math.abs(matchPlayResult.aUp)} UP
                      {matchPlayResult.matchOverAtHole && ` (finished on hole ${matchPlayResult.matchOverAtHole})`}
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-lg">All Square</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {session.format === 'skins' && skinsBreakdown && (
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-4">
              <p className="text-xs text-yellow-800 font-semibold uppercase mb-2">Skins Summary</p>
              <div className="space-y-1">
                {players.map((p) => {
                  const entry = skinsBreakdown.skinCounts.get(p.userId)
                  return (
                    <div key={p.userId} className="flex justify-between text-sm">
                      <span>{p.displayName}</span>
                      <span className="font-semibold">{entry?.skins ?? 0} skin{entry?.skins !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
              {skinsBreakdown.finalCarryover > 1 && (
                <p className="text-xs text-yellow-700 mt-2">
                  {skinsBreakdown.finalCarryover} skins carried over at end
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {teamTotals && (
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-4">
              <p className="text-xs text-yellow-800 font-semibold uppercase mb-2">Team Results</p>
              {teamTotals.map((row, i) => (
                <div key={row.team.id} className="flex items-center gap-2 py-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.team.color }}
                  />
                  <span className="flex-1 font-medium text-sm">
                    {i === 0 && '🏆 '}{row.team.name}
                  </span>
                  <span className="font-bold">{row.total}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Full scorecard ──────────────────────────────────────────── */}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scorecard</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium sticky left-0 bg-background">Hole</th>
                  {playedHoles.map((h) => (
                    <th key={h} className="px-2 py-2 font-medium text-center min-w-[28px]">{h}</th>
                  ))}
                  <th className="px-2 py-2 font-medium text-center">G</th>
                  <th className="px-2 py-2 font-medium text-center">N</th>
                </tr>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-1 pr-2 font-medium text-muted-foreground sticky left-0 bg-muted/30">Par</th>
                  {playedHoles.map((h) => {
                    const par = players[0]?.scores[String(h)]?.par ?? 4
                    return <td key={h} className="px-2 py-1 text-center text-muted-foreground">{par}</td>
                  })}
                  <td className="px-2 py-1 text-center font-bold text-muted-foreground">
                    {playedHoles.reduce((s, h) => s + (players[0]?.scores[String(h)]?.par ?? 0), 0)}
                  </td>
                  <td className="px-2 py-1 text-center text-muted-foreground">—</td>
                </tr>
              </thead>
              <tbody>
                {playerTotals.map(({ player: p, gross, net }) => (
                  <tr key={p.userId} className="border-b">
                    <td className="text-left py-2 pr-2 font-medium truncate max-w-[100px] sticky left-0 bg-background">
                      {p.displayName}
                    </td>
                    {playedHoles.map((h) => {
                      const s = p.scores[String(h)]
                      const g = s?.gross
                      const par = s?.par ?? 4
                      const color =
                        g === null || g === undefined ? 'text-muted-foreground' :
                        g < par ? 'text-green-600 font-bold' :
                        g === par ? '' :
                        g === par + 1 ? 'text-orange-600' :
                        'text-red-600 font-bold'
                      return (
                        <td key={h} className={`px-2 py-2 text-center ${color}`}>
                          {g ?? '—'}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center font-bold">{gross}</td>
                    <td className="px-2 py-2 text-center font-bold text-green-700">{net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Card summary ────────────────────────────────────────────── */}

        {cardLog.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Card Log ({cardLog.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {cardLog.map((entry) => {
                const from = playerMap.get(entry.fromUserId)
                const to = playerMap.get(entry.toUserId)
                const selfDealt = entry.fromUserId === entry.toUserId
                return (
                  <div key={entry.id} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                    <span className="font-mono text-muted-foreground w-6">#{entry.hole}</span>
                    <span className="font-medium truncate flex-1">
                      {selfDealt
                        ? `${from?.displayName ?? '?'} → ${entry.card.name}`
                        : `${from?.displayName ?? '?'} → ${to?.displayName ?? '?'} (${entry.card.name})`}
                    </span>
                    {entry.overriddenByHost && <Badge variant="outline" className="text-xs">Overridden</Badge>}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Beer Can Gimme summary ──────────────────────────────────── */}

        {session.nsfwCards && session.activeCards.includes('beer_can_gimme') && totalDrinks > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Beer className="w-4 h-4 text-yellow-600" />
                Beer Can Gimme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {players.map((p) => (
                <div key={p.userId} className="flex justify-between text-xs">
                  <span>{p.displayName}</span>
                  <span className="font-semibold">
                    {p.drinksConsumed} drink{p.drinksConsumed !== 1 ? 's' : ''} &middot; {getBeerCanGimmeRadius(p.drinksConsumed)}&quot; radius
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handlePlayAgain}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Play Again
          </Button>
          <Button variant="green" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center italic">
          Exhibition round — no tour points or season data affected.
        </p>
      </div>
    </div>
  )
}
