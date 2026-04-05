'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, Award, Shield, AlertTriangle } from 'lucide-react'
import type {
  ExhibitionPlayer,
  ExhibitionFormat,
  ExhibitionTeam,
} from '@/lib/types'

interface HoleScorecardProps {
  holeNumber: number
  players: ExhibitionPlayer[]
  teams: ExhibitionTeam[] | null
  scoringMode: 'gross' | 'net'
  format: ExhibitionFormat
  onScoreChange: (playerUid: string, delta: number) => void
}

function StrokeDots({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex gap-0.5" title={`${count} handicap stroke${count !== 1 ? 's' : ''} this hole`}>
      {Array.from({ length: Math.abs(count) }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-green-500' : 'bg-red-500'}`}
        />
      ))}
    </div>
  )
}

export function HoleScorecard({
  holeNumber,
  players,
  teams,
  scoringMode,
  format,
  onScoreChange,
}: HoleScorecardProps) {
  return (
    <div className="space-y-3">
      {players.map((player) => {
        const score = player.scores[String(holeNumber)]
        if (!score) return null

        const team = teams?.find((t) => t.id === player.teamId)
        const hasGross = score.gross !== null && score.gross > 0
        const gross = score.gross ?? 0
        const net = score.net ?? 0
        const isStableford = format === 'stableford'

        // Pending card badges
        const pending = player.pendingCards.filter((c) => c.mustPlayByHole === holeNumber)

        return (
          <div
            key={player.userId}
            className={`rounded-xl border p-3 ${team ? 'border-l-4' : ''}`}
            style={team ? { borderLeftColor: team.color } : undefined}
          >
            {/* Player header */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={player.photoURL ?? undefined} />
                <AvatarFallback>{player.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{player.displayName}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {team && (
                    <span
                      className="text-xs font-medium text-white px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name}
                    </span>
                  )}
                  <StrokeDots count={score.handicapStrokes} />
                  {score.honestAbeActive && (
                    <Badge variant="warning" className="text-xs">Honest Abe</Badge>
                  )}
                  {/* Card badges */}
                  {player.cardInventory.length > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-purple-600" title="Held cards">
                      <Award className="w-3 h-3" />
                      {player.cardInventory.length}
                    </span>
                  )}
                  {player.cardInventory.some((c) => c.key === 'stroke_shield') && (
                    <Shield className="w-3 h-3 text-blue-500" aria-label="Stroke Shield" />
                  )}
                </div>
              </div>
            </div>

            {/* Pending card warning */}
            {pending.length > 0 && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-800">
                    Must play this hole: {pending.map((c) => c.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Score input row */}
            <div className="flex items-center gap-3">
              {/* Gross -/+ */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => onScoreChange(player.userId, -1)}
                  disabled={!hasGross || gross <= 1}
                  className="w-12 h-12 rounded-full bg-muted text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
                  aria-label="Decrease score"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                  <p className="text-3xl font-black leading-none">
                    {hasGross ? gross : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Gross</p>
                </div>
                <button
                  type="button"
                  onClick={() => onScoreChange(player.userId, 1)}
                  className="w-12 h-12 rounded-full bg-green-600 text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Increase score"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Net / Stableford display */}
              <div className="text-center border-l pl-3 min-w-[60px]">
                {isStableford && score.stablefordPoints !== null ? (
                  <>
                    <p className="text-2xl font-black text-green-700 leading-none">
                      {score.stablefordPoints}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Pts</p>
                  </>
                ) : scoringMode === 'net' && hasGross ? (
                  <>
                    <p className="text-2xl font-black text-green-700 leading-none">{net}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">Net</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-black text-muted-foreground leading-none">—</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
                      {isStableford ? 'Pts' : 'Net'}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
