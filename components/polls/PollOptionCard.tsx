'use client'

import { CheckCircle2 } from 'lucide-react'

interface PollOptionCardProps {
  text: string
  isSelected: boolean
  isVoted: boolean     // results mode: this is what the current user chose
  votePercent: number  // 0-100
  voteCount: number
  mode: 'voting' | 'results'
  onSelect?: () => void
}

export function PollOptionCard({
  text,
  isSelected,
  isVoted,
  votePercent,
  voteCount,
  mode,
  onSelect,
}: PollOptionCardProps) {
  if (mode === 'voting') {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          isSelected
            ? 'border-green-500 bg-green-50 shadow-sm'
            : 'border-border hover:border-green-300 hover:bg-accent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isSelected ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'
          }`}>
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <p className="text-sm font-medium">{text}</p>
        </div>
      </button>
    )
  }

  // Results mode
  return (
    <div className={`relative p-4 rounded-xl border-2 overflow-hidden ${
      isVoted ? 'border-green-500 bg-green-50' : 'border-border'
    }`}>
      {/* Background bar */}
      <div
        className={`absolute inset-y-0 left-0 transition-all ${
          isVoted ? 'bg-green-200/50' : 'bg-muted/50'
        }`}
        style={{ width: `${votePercent}%` }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isVoted && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
          <p className={`text-sm font-medium truncate ${isVoted ? 'text-green-800' : ''}`}>
            {text}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">{votePercent.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">{voteCount}</p>
        </div>
      </div>
    </div>
  )
}
