'use client'

import { getBeerCanGimmeRadius } from '@/lib/utils/exhibition'
import { Beer } from 'lucide-react'

interface DrinkCounterProps {
  drinksConsumed: number
  onIncrement: () => void
  playerName?: string
}

export function DrinkCounter({ drinksConsumed, onIncrement, playerName }: DrinkCounterProps) {
  const radius = getBeerCanGimmeRadius(drinksConsumed)

  return (
    <button
      type="button"
      onClick={onIncrement}
      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 hover:bg-yellow-100 active:scale-[0.98] transition-all"
    >
      <div className="w-12 h-12 rounded-full bg-yellow-500 text-white flex items-center justify-center shrink-0">
        <Beer className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">
          {playerName ? `${playerName}'s ` : ''}Beer Can Gimme
        </p>
        <p className="text-sm text-yellow-700">
          {drinksConsumed} drink{drinksConsumed !== 1 ? 's' : ''} &middot; {radius}&quot; gimme radius
        </p>
      </div>
      <div className="text-3xl font-black text-yellow-800 pr-1">{drinksConsumed}</div>
    </button>
  )
}
