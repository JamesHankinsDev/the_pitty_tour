'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Award, AlertCircle, Shield, X } from 'lucide-react'
import { CARDS_BY_KEY } from '@/lib/cards'
import type { CardItem } from '@/lib/types'

interface CardInventoryBarProps {
  cardInventory: CardItem[]
  pendingCards: CardItem[]
  currentHole: number
  onCardPlayed: (card: CardItem) => void
}

export function CardInventoryBar({
  cardInventory,
  pendingCards,
  currentHole,
  onCardPlayed,
}: CardInventoryBarProps) {
  const [selected, setSelected] = useState<CardItem | null>(null)

  if (cardInventory.length === 0 && pendingCards.length === 0) {
    return null
  }

  const def = selected ? CARDS_BY_KEY[selected.key] : null

  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        {/* Pending cards (must play this hole) */}
        {pendingCards
          .filter((c) => c.mustPlayByHole === currentHole)
          .map((card, i) => (
            <button
              key={`p-${i}`}
              type="button"
              onClick={() => setSelected(card)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-300 text-xs font-medium text-red-800 active:scale-95 transition-transform"
            >
              <AlertCircle className="w-3 h-3" />
              {card.name}
            </button>
          ))}

        {/* Held cards */}
        {cardInventory.map((card, i) => {
          const isShield = card.key === 'stroke_shield'
          return (
            <button
              key={`h-${i}`}
              type="button"
              onClick={() => setSelected(card)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium active:scale-95 transition-transform ${
                isShield
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-purple-100 border-purple-300 text-purple-800'
              }`}
            >
              {isShield ? <Shield className="w-3 h-3" /> : <Award className="w-3 h-3" />}
              {card.name}
            </button>
          )
        })}
      </div>

      {/* Card detail sheet */}
      {selected && def && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden">
            <div className="p-4 border-b flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">{def.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {def.type.replace('_', ' ')} &middot; {def.timing}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm leading-relaxed">{def.description}</p>
              {def.requiresGroupVerify && (
                <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Requires group verification
                </div>
              )}
              {def.requiresPhysical && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 p-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Physical action required on course
                </div>
              )}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="green"
                className="flex-1"
                onClick={() => {
                  onCardPlayed(selected)
                  setSelected(null)
                }}
              >
                Play
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
