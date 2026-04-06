'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToExhibitionSession,
  subscribeToExhibitionPlayers,
  getCachedCourse,
  updateExhibitionPlayer,
  updateExhibitionSession,
  logCardEvent,
} from '@/lib/firebase/firestore'
import { getStablefordPoints } from '@/lib/utils/exhibition'
import { applyAutoCard, checkStrokeShield } from '@/lib/cardEngine'
import { HoleScorecard } from '@/components/exhibition/HoleScorecard'
import { RunningScoreboard } from '@/components/exhibition/RunningScoreboard'
import { DrinkCounter } from '@/components/exhibition/DrinkCounter'
import {
  CardTriggerModal,
  type ResolvedCardAction,
} from '@/components/exhibition/CardTriggerModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Timestamp } from 'firebase/firestore'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Settings,
  X,
} from 'lucide-react'
import type {
  ExhibitionSession,
  ExhibitionPlayer,
  CachedCourse,
  ExhibitionHoleScore,
  CardItem,
} from '@/lib/types'


export default function ExhibitionPlayPage() {
  const params = useParams()
  const sessionId = String(params.sessionId ?? '')
  const router = useRouter()
  const { user } = useAuth()

  const [session, setSession] = useState<ExhibitionSession | null>(null)
  const [players, setPlayers] = useState<ExhibitionPlayer[]>([])
  const [course, setCourse] = useState<CachedCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentHole, setCurrentHole] = useState<number>(1)
  const [showCardModal, setShowCardModal] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [hostMenuOpen, setHostMenuOpen] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const unsubS = subscribeToExhibitionSession(sessionId, setSession)
    const unsubP = subscribeToExhibitionPlayers(sessionId, setPlayers)
    return () => { unsubS(); unsubP() }
  }, [sessionId])

  useEffect(() => {
    if (!session) return
    setLoading(false)
    if (session.status === 'completed') {
      router.replace(`/exhibition/${sessionId}/results`)
    } else if (session.status === 'lobby') {
      router.replace(`/exhibition/${sessionId}/lobby`)
    }
  }, [session, sessionId, router])

  useEffect(() => {
    if (!session?.courseId) return
    getCachedCourse(session.courseId).then((c) => {
      setCourse(c)
      // Set starting hole
      if (c && session) {
        setCurrentHole(session.startingHole)
      }
    })
  }, [session?.courseId])

  // Determine the holes played (ordered)
  const playedHoleNumbers = useMemo(() => {
    if (!course || !session) return []
    return course.holes
      .filter((h) => {
        if (session.holes === 18) return true
        if (session.startingHole === 1) return h.number <= 9
        return h.number >= 10
      })
      .map((h) => h.number)
  }, [course, session])

  const isHost = user?.uid === session?.hostId
  const isLastHole =
    playedHoleNumbers.length > 0 &&
    currentHole === playedHoleNumbers[playedHoleNumbers.length - 1]
  const canGoPrev =
    playedHoleNumbers.length > 0 && currentHole > playedHoleNumbers[0]

  const holeInfo = course?.holes.find((h) => h.number === currentHole)

  // Are all players' scores submitted for current hole?
  const allScored = players.every((p) => {
    const s = p.scores[String(currentHole)]
    return s?.gross !== null && s?.gross !== undefined
  })

  /* ── Score handling ─────────────────────────────────────────────────── */

  const handleScoreChange = async (playerUid: string, delta: number) => {
    const player = players.find((p) => p.userId === playerUid)
    if (!player) return
    const score = player.scores[String(currentHole)]
    if (!score) return

    const currentGross = score.gross ?? 0
    const newGross = Math.max(1, currentGross + delta)
    const newNet = score.honestAbeActive ? newGross : newGross - score.handicapStrokes
    const newStableford =
      session?.format === 'stableford'
        ? getStablefordPoints(newGross, score.par, score.handicapStrokes)
        : null

    const updatedScore: ExhibitionHoleScore = {
      ...score,
      gross: newGross,
      net: newNet,
      stablefordPoints: newStableford,
      submittedAt: Timestamp.now(),
    }

    await updateExhibitionPlayer(sessionId, playerUid, {
      scores: {
        ...player.scores,
        [String(currentHole)]: updatedScore,
      },
    })
  }

  /* ── Drinks ─────────────────────────────────────────────────────────── */

  const handleIncrementDrink = async () => {
    if (!user) return
    const me = players.find((p) => p.userId === user.uid)
    if (!me) return
    await updateExhibitionPlayer(sessionId, user.uid, {
      drinksConsumed: (me.drinksConsumed ?? 0) + 1,
    })
  }

  /* ── Hole navigation ────────────────────────────────────────────────── */

  const handlePrev = () => {
    const idx = playedHoleNumbers.indexOf(currentHole)
    if (idx > 0) setCurrentHole(playedHoleNumbers[idx - 1])
  }

  const handleNext = () => {
    if (!allScored) {
      toast.error('All players must have a score entered')
      return
    }
    // Show card trigger modal before advancing (if cards on)
    if (session?.useCards) {
      setShowCardModal(true)
      return
    }
    advanceToNextHole()
  }

  const advanceToNextHole = async () => {
    const idx = playedHoleNumbers.indexOf(currentHole)
    if (idx < playedHoleNumbers.length - 1) {
      setCurrentHole(playedHoleNumbers[idx + 1])
    } else {
      // Final hole — complete the round
      setAdvancing(true)
      try {
        await updateExhibitionSession(sessionId, {
          status: 'completed',
          completedAt: Timestamp.now(),
        })
        toast.success('Round complete!')
        router.replace(`/exhibition/${sessionId}/results`)
      } finally {
        setAdvancing(false)
      }
    }
  }

  /* ── Card resolution callback ───────────────────────────────────────── */

  const handleCardsResolved = async (actions: ResolvedCardAction[]) => {
    setShowCardModal(false)

    // Process each action: handle stroke shield bouncing, write to inventory/pending, log to cardLog
    for (const action of actions) {
      const targetPlayer = players.find((p) => p.userId === action.toPlayerUid)
      if (!targetPlayer) continue

      // Check for stroke shield on penalty cards
      let finalTargetUid = action.toPlayerUid
      let finalCard = action.card
      let finalCardType = action.cardType

      if (action.cardType === 'penalty' && action.fromPlayerUid !== action.toPlayerUid) {
        const shieldCheck = checkStrokeShield(targetPlayer, action.card)
        if (shieldCheck.blocked && shieldCheck.bouncedCard) {
          // Shield breaks, bounces to sender as self_penalty
          finalTargetUid = action.fromPlayerUid
          finalCard = shieldCheck.bouncedCard
          finalCardType = 'self_penalty'

          // Remove shield from target's inventory
          await updateExhibitionPlayer(sessionId, action.toPlayerUid, {
            cardInventory: shieldCheck.updatedInventory,
          })
          toast.info(`${targetPlayer.displayName}'s Stroke Shield bounced ${action.card.name} back!`)
        }
      }

      // Add card to appropriate list based on type
      const finalTarget = players.find((p) => p.userId === finalTargetUid)
      if (!finalTarget) continue

      if (finalCardType === 'power_up') {
        // Goes into inventory (max 2 cards)
        const nextInventory = [...finalTarget.cardInventory, finalCard].slice(-2)
        await updateExhibitionPlayer(sessionId, finalTargetUid, { cardInventory: nextInventory })
      } else {
        // Penalty/self_penalty/opponent_boost — into pendingCards (must play next hole)
        await updateExhibitionPlayer(sessionId, finalTargetUid, {
          pendingCards: [...finalTarget.pendingCards, finalCard],
        })
      }

      // Log the card event
      await logCardEvent(sessionId, {
        hole: currentHole,
        fromUserId: action.fromPlayerUid,
        toUserId: finalTargetUid,
        card: finalCard,
        cardType: finalCardType,
        resolvedAt: Timestamp.now(),
        overriddenByHost: false,
      })
    }

    // Apply auto-activating cards on the next hole (honest_abe, blue_shell, etc.)
    // These are applied when the next hole's score is entered — but we seed honest_abe flag here.
    // For honest_abe specifically, set honestAbeActive on next hole's score now
    const nextIdx = playedHoleNumbers.indexOf(currentHole) + 1
    if (nextIdx < playedHoleNumbers.length) {
      const nextHoleNum = playedHoleNumbers[nextIdx]
      for (const action of actions) {
        if (action.card.key === 'honest_abe') {
          const target = players.find((p) => p.userId === action.toPlayerUid)
          if (target) {
            const nextScore = target.scores[String(nextHoleNum)]
            if (nextScore) {
              await updateExhibitionPlayer(sessionId, action.toPlayerUid, {
                scores: {
                  ...target.scores,
                  [String(nextHoleNum)]: { ...nextScore, honestAbeActive: true },
                },
              })
            }
          }
        }
      }
    }

    await advanceToNextHole()
  }

  /* ── Host: end round early ─────────────────────────────────────────── */

  const handleEndEarly = async () => {
    if (!isHost) return
    if (!confirm('End the round now? Incomplete holes will remain unscored.')) return
    await updateExhibitionSession(sessionId, {
      status: 'completed',
      completedAt: Timestamp.now(),
    })
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (loading || !session || !course) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const me = players.find((p) => p.userId === user?.uid) ?? null
  const hasBeerCan = session.useCards && session.activeCards.includes('beer_can_gimme') && session.nsfwCards

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 py-2 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black">#{currentHole}</span>
            <span className="text-xs text-muted-foreground">
              Par {holeInfo?.par ?? '—'}
              {holeInfo && ` · SI ${holeInfo.strokeIndex}`}
              {holeInfo && session.teeName && ` · ${holeInfo.yardages[session.teeName] ?? 0}y`}
            </span>
          </div>
          {isHost && (
            <button
              onClick={() => setHostMenuOpen(!hostMenuOpen)}
              className="p-2 rounded-lg hover:bg-accent"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Host menu */}
      {isHost && hostMenuOpen && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-lg mx-auto flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleEndEarly}>
              End Round Early
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHostMenuOpen(false)}>
              <X className="w-3 h-3 mr-1" />
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* Running scoreboard */}
        <div className="bg-muted/50 rounded-xl p-3">
          <RunningScoreboard
            format={session.format}
            players={players}
            teams={session.teams}
            currentHole={currentHole}
          />
        </div>

        {/* Score entry */}
        <HoleScorecard
          holeNumber={currentHole}
          players={players}
          teams={session.teams}
          scoringMode={session.scoringMode}
          format={session.format}
          onScoreChange={handleScoreChange}
        />

        {/* Drink counter (per player, if enabled) */}
        {hasBeerCan && me && (
          <DrinkCounter
            drinksConsumed={me.drinksConsumed}
            onIncrement={handleIncrementDrink}
            playerName="Your"
          />
        )}
      </div>

      {/* Sticky bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <Button
            variant="green"
            size="lg"
            onClick={handleNext}
            disabled={!allScored || advancing}
            className="flex-[2]"
          >
            {isLastHole ? (
              <>
                <Trophy className="w-4 h-4 mr-1" />
                {advancing ? 'Finishing...' : 'Complete Round'}
              </>
            ) : (
              <>
                Next Hole
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Card trigger modal */}
      <CardTriggerModal
        open={showCardModal}
        players={players}
        currentHole={currentHole}
        format={session.format}
        useCards={session.useCards}
        nsfwEnabled={session.nsfwCards}
        activeCardKeys={session.activeCards}
        onAllResolved={handleCardsResolved}
        onCancel={() => setShowCardModal(false)}
      />
    </div>
  )
}
