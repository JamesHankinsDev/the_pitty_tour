'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Award, AlertCircle, ChevronRight, Shield, Check, Target,
} from 'lucide-react'
import type {
  ExhibitionPlayer,
  ExhibitionFormat,
  CardDefinition,
  CardItem,
} from '@/lib/types'
import { CARD_DEFINITIONS } from '@/lib/cards'
import { getTriggeredCards, isBackToBackBirdie, getCurrentLeader } from '@/lib/cardEngine'
import { getHoleResult } from '@/lib/utils/exhibition'

/**
 * Per-player trigger resolution. After a hole is submitted, each player
 * whose score triggered cards needs to either choose cards (birdie/eagle)
 * or acknowledge auto-dealt cards (bogey/double/triple).
 */
interface PlayerTriggerState {
  player: ExhibitionPlayer
  holeResult: ReturnType<typeof getHoleResult>
  triggered: ReturnType<typeof getTriggeredCards>
  // User choices
  chosenAction: 'keep' | 'deal' | null  // for birdie/eagle
  chosenCardKey: string | null          // which card to keep/deal
  chosenTargetUid: string | null        // who to deal to
  selfPenaltyChoiceKey: string | null   // for double-bogey (tin_cup vs grip_it)
  groupConfirmed: boolean               // for physical/group-verify cards
  acknowledged: boolean                 // for auto-dealt cards with no choices
}

export interface ResolvedCardAction {
  fromPlayerUid: string
  toPlayerUid: string
  card: CardItem
  cardType: CardDefinition['type']
  // For UI display, include the definition
  definition: CardDefinition
}

interface CardTriggerModalProps {
  open: boolean
  players: ExhibitionPlayer[]
  currentHole: number
  format: ExhibitionFormat
  useCards: boolean
  nsfwEnabled: boolean
  activeCardKeys: string[]
  onAllResolved: (actions: ResolvedCardAction[]) => void
  onCancel: () => void
}

export function CardTriggerModal({
  open,
  players,
  currentHole,
  format,
  useCards,
  nsfwEnabled,
  activeCardKeys,
  onAllResolved,
  onCancel,
}: CardTriggerModalProps) {
  const [triggerStates, setTriggerStates] = useState<PlayerTriggerState[] | null>(null)

  // Initialize trigger states when modal opens
  if (open && triggerStates === null) {
    const states: PlayerTriggerState[] = []
    for (const p of players) {
      const score = p.scores[String(currentHole)]
      if (!score || score.gross === null) continue
      const holeResult = getHoleResult(score.gross, score.par)
      const triggered = getTriggeredCards({
        holeResult,
        isBackToBackBirdie: isBackToBackBirdie(p.scores, currentHole),
        useCards,
        nsfwEnabled,
        activeCards: activeCardKeys,
        allDefinitions: CARD_DEFINITIONS,
      })

      // Skip players with no triggered cards
      const hasAnyCards =
        triggered.selfPowerUps.length > 0 ||
        triggered.opponentPenalties.length > 0 ||
        triggered.selfPenalties.length > 0 ||
        triggered.opponentBoosts.length > 0
      if (!hasAnyCards) continue

      states.push({
        player: p,
        holeResult,
        triggered,
        chosenAction: null,
        chosenCardKey: null,
        chosenTargetUid: null,
        selfPenaltyChoiceKey: null,
        groupConfirmed: false,
        acknowledged: false,
      })
    }
    setTriggerStates(states)
  }

  if (!open || triggerStates === null) return null

  // If nothing triggered, auto-close
  if (triggerStates.length === 0) {
    onAllResolved([])
    return null
  }

  const updateState = (idx: number, patch: Partial<PlayerTriggerState>) => {
    setTriggerStates((prev) => prev!.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const isStateResolved = (s: PlayerTriggerState): boolean => {
    const hasPlayerChoice =
      s.triggered.selfPowerUps.length > 0 || s.triggered.opponentPenalties.length > 0
    const hasSelfPenaltyChoice = s.triggered.selfPenalties.length > 1

    // Birdie/Eagle: need action choice + card + target (if dealing)
    if (hasPlayerChoice) {
      if (!s.chosenAction || !s.chosenCardKey) return false
      if (s.chosenAction === 'deal' && !s.chosenTargetUid) return false
    }

    // Double bogey: need to pick tin_cup or grip_it
    if (hasSelfPenaltyChoice && !s.selfPenaltyChoiceKey) return false

    // Group-verify physical card
    const chosenDef = s.chosenCardKey
      ? CARD_DEFINITIONS.find((d) => d.key === s.chosenCardKey)
      : null
    if (chosenDef?.requiresGroupVerify && !s.groupConfirmed) return false

    // Auto-dealt: must be acknowledged at least once
    if (!hasPlayerChoice && !hasSelfPenaltyChoice && !s.acknowledged) return false

    return true
  }

  const allResolved = triggerStates.every(isStateResolved)

  const handleCommit = () => {
    const actions: ResolvedCardAction[] = []

    for (const s of triggerStates) {
      const next = currentHole + 1

      // Birdie/Eagle player choice
      if (s.chosenAction && s.chosenCardKey) {
        const def = CARD_DEFINITIONS.find((d) => d.key === s.chosenCardKey)!
        const card: CardItem = {
          key: def.key,
          name: def.name,
          type: def.type,
          holeEarned: currentHole,
          mustPlayByHole: next,
        }
        if (s.chosenAction === 'keep') {
          actions.push({
            fromPlayerUid: s.player.userId,
            toPlayerUid: s.player.userId,
            card,
            cardType: def.type,
            definition: def,
          })
        } else if (s.chosenAction === 'deal' && s.chosenTargetUid) {
          // Handle blue_shell specially — target is current leader, not picked
          let target = s.chosenTargetUid
          if (def.key === 'blue_shell') {
            const leader = getCurrentLeader(players, format, currentHole)
            if (leader) target = leader
          }
          actions.push({
            fromPlayerUid: s.player.userId,
            toPlayerUid: target,
            card,
            cardType: def.type,
            definition: def,
          })
        }
      }

      // Auto-dealt self penalties
      if (s.triggered.selfPenalties.length === 1) {
        const def = s.triggered.selfPenalties[0]
        actions.push({
          fromPlayerUid: s.player.userId,
          toPlayerUid: s.player.userId,
          card: {
            key: def.key,
            name: def.name,
            type: def.type,
            holeEarned: currentHole,
            mustPlayByHole: next,
          },
          cardType: def.type,
          definition: def,
        })
      } else if (s.triggered.selfPenalties.length > 1 && s.selfPenaltyChoiceKey) {
        const def = s.triggered.selfPenalties.find((d) => d.key === s.selfPenaltyChoiceKey)!
        actions.push({
          fromPlayerUid: s.player.userId,
          toPlayerUid: s.player.userId,
          card: {
            key: def.key,
            name: def.name,
            type: def.type,
            holeEarned: currentHole,
            mustPlayByHole: next,
          },
          cardType: def.type,
          definition: def,
        })
      }

      // Auto-dealt opponent boosts — go to EVERY other player
      if (s.triggered.opponentBoosts.length > 0) {
        const others = players.filter((p) => p.userId !== s.player.userId)
        for (const def of s.triggered.opponentBoosts) {
          for (const opp of others) {
            actions.push({
              fromPlayerUid: s.player.userId,
              toPlayerUid: opp.userId,
              card: {
                key: def.key,
                name: def.name,
                type: def.type,
                holeEarned: currentHole,
                mustPlayByHole: next,
              },
              cardType: def.type,
              definition: def,
            })
          }
        }
      }
    }

    onAllResolved(actions)
    setTriggerStates(null)
  }

  const handleCancelClick = () => {
    setTriggerStates(null)
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b shrink-0">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Hole {currentHole} — Cards Triggered
          </h2>
          <p className="text-xs text-muted-foreground">Resolve each player&apos;s cards before advancing</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {triggerStates.map((s, idx) => (
            <PlayerTriggerCard
              key={s.player.userId}
              state={s}
              players={players}
              onUpdate={(patch) => updateState(idx, patch)}
              resolved={isStateResolved(s)}
            />
          ))}
        </div>

        <div className="p-3 border-t shrink-0 flex gap-2">
          <Button variant="ghost" onClick={handleCancelClick} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="green"
            onClick={handleCommit}
            disabled={!allResolved}
            className="flex-1"
          >
            Close &amp; Advance
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Per-player trigger card ──────────────────────────────────────────── */

function PlayerTriggerCard({
  state,
  players,
  onUpdate,
  resolved,
}: {
  state: PlayerTriggerState
  players: ExhibitionPlayer[]
  onUpdate: (patch: Partial<PlayerTriggerState>) => void
  resolved: boolean
}) {
  const { player, holeResult, triggered } = state

  const hasPlayerChoice =
    triggered.selfPowerUps.length > 0 || triggered.opponentPenalties.length > 0
  const hasSelfPenaltyChoice = triggered.selfPenalties.length > 1
  const otherPlayers = players.filter((p) => p.userId !== player.userId)

  const resultLabel = {
    ace: 'Hole in One! 🎯',
    eagle: 'Eagle 🦅',
    birdie: 'Birdie 🐦',
    par: 'Par',
    bogey: 'Bogey',
    double_bogey: 'Double Bogey',
    triple_plus: 'Triple+ Bogey',
  }[holeResult]

  const chosenCard = state.chosenCardKey
    ? CARD_DEFINITIONS.find((d) => d.key === state.chosenCardKey)
    : null

  return (
    <div className={`rounded-xl border-2 p-3 ${resolved ? 'border-green-300 bg-green-50' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={player.photoURL ?? undefined} />
          <AvatarFallback>{player.displayName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{player.displayName}</p>
          <p className="text-xs text-muted-foreground">{resultLabel}</p>
        </div>
        {resolved && <Check className="w-5 h-5 text-green-600" />}
      </div>

      {/* Birdie/Eagle: Keep or Deal */}
      {hasPlayerChoice && (
        <div className="space-y-3">
          {!state.chosenAction ? (
            <div className="flex gap-2">
              {triggered.selfPowerUps.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onUpdate({ chosenAction: 'keep', chosenCardKey: null })}
                >
                  <Shield className="w-3.5 h-3.5 mr-1" />
                  Keep Power-Up
                </Button>
              )}
              {triggered.opponentPenalties.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onUpdate({ chosenAction: 'deal', chosenCardKey: null })}
                >
                  <Target className="w-3.5 h-3.5 mr-1" />
                  Deal to Opponent
                </Button>
              )}
            </div>
          ) : !state.chosenCardKey ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pick a {state.chosenAction === 'keep' ? 'power-up' : 'penalty'}
              </p>
              <div className="space-y-1">
                {(state.chosenAction === 'keep'
                  ? triggered.selfPowerUps
                  : triggered.opponentPenalties
                ).map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => onUpdate({ chosenCardKey: card.key })}
                    className="w-full text-left p-2 rounded-lg border hover:bg-accent"
                  >
                    <p className="text-xs font-semibold">{card.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => onUpdate({ chosenAction: null })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                &larr; Change action
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs font-semibold text-purple-900">{chosenCard?.name}</p>
                <p className="text-xs text-purple-700">{chosenCard?.description}</p>
              </div>

              {/* Target picker if dealing */}
              {state.chosenAction === 'deal' && chosenCard?.key !== 'blue_shell' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Target player
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {otherPlayers.map((op) => (
                      <button
                        key={op.userId}
                        type="button"
                        onClick={() => onUpdate({ chosenTargetUid: op.userId })}
                        className={`p-2 rounded-lg border text-xs ${state.chosenTargetUid === op.userId ? 'border-purple-500 bg-purple-50 font-semibold' : 'hover:bg-accent'}`}
                      >
                        {op.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {state.chosenAction === 'deal' && chosenCard?.key === 'blue_shell' && (
                <p className="text-xs text-muted-foreground italic">
                  Blue Shell auto-targets the current leader
                </p>
              )}

              {/* Group verify */}
              {chosenCard?.requiresGroupVerify && (
                (state.chosenAction === 'keep' || state.chosenTargetUid) && (
                  <Button
                    variant={state.groupConfirmed ? 'green' : 'outline'}
                    size="sm"
                    onClick={() => onUpdate({ groupConfirmed: !state.groupConfirmed })}
                    className="w-full"
                  >
                    {state.groupConfirmed ? <Check className="w-3.5 h-3.5 mr-1" /> : <AlertCircle className="w-3.5 h-3.5 mr-1" />}
                    {state.groupConfirmed ? 'Group Confirmed' : 'Group Must Confirm'}
                  </Button>
                )
              )}

              <button
                onClick={() => onUpdate({ chosenCardKey: null, chosenTargetUid: null, groupConfirmed: false })}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                &larr; Change card
              </button>
            </div>
          )}
        </div>
      )}

      {/* Double bogey: pick self penalty */}
      {hasSelfPenaltyChoice && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pick your penalty
          </p>
          <div className="space-y-1">
            {triggered.selfPenalties.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => onUpdate({ selfPenaltyChoiceKey: card.key })}
                className={`w-full text-left p-2 rounded-lg border ${state.selfPenaltyChoiceKey === card.key ? 'border-red-500 bg-red-50' : 'hover:bg-accent'}`}
              >
                <p className="text-xs font-semibold">{card.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-dealt cards — ack required */}
      {!hasPlayerChoice && !hasSelfPenaltyChoice && (
        <div className="space-y-2">
          {triggered.selfPenalties.length === 1 && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-900">
                {triggered.selfPenalties[0].name} (auto-dealt)
              </p>
              <p className="text-xs text-red-700">{triggered.selfPenalties[0].description}</p>
            </div>
          )}
          {triggered.opponentBoosts.map((def) => (
            <div key={def.key} className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-900">
                Opponents get: {def.name}
              </p>
              <p className="text-xs text-green-700">{def.description}</p>
            </div>
          ))}
          {!state.acknowledged && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onUpdate({ acknowledged: true })}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Acknowledge
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
