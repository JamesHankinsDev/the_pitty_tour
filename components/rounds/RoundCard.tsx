'use client'

import type { Round } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTimestamp, formatMonthKey } from '@/lib/utils/dates'
import { CheckCircle2, Clock, MapPin, User } from 'lucide-react'

interface RoundCardProps {
  round: Round
  showActions?: boolean
  compact?: boolean
}

function AttestationPips({ count, required = 1 }: { count: number; required?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: required }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < count ? 'bg-green-500' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {count}/{required}
      </span>
    </div>
  )
}

export function RoundCard({ round, compact = false }: RoundCardProps) {
  const attestCount = round.attestations.length
  const isValid = round.isValid

  return (
    <Card className={`${isValid ? 'border-green-200' : ''} ${compact ? '' : ''}`}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Course & date */}
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="font-semibold text-sm truncate">{round.courseName}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {formatMonthKey(round.month)} · Submitted{' '}
              {formatTimestamp(round.submittedAt as any)}
            </p>

            {/* Scores */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xl font-black">{round.grossScore}</p>
                <p className="text-xs text-muted-foreground">Gross</p>
              </div>
              <div className="text-muted-foreground">·</div>
              <div className="text-center">
                <p className="text-xl font-black text-green-700">
                  {round.netScore}
                </p>
                <p className="text-xs text-muted-foreground">Net</p>
              </div>
              <div className="text-muted-foreground">·</div>
              <div className="text-center">
                <p className="text-sm font-medium">{round.differentialScore}</p>
                <p className="text-xs text-muted-foreground">Diff</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isValid ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Valid
              </Badge>
            ) : round.adminOverride ? (
              <Badge variant="success">Admin ✓</Badge>
            ) : (
              <Badge variant="pending" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </Badge>
            )}

            {!isValid && <AttestationPips count={attestCount} />}
          </div>
        </div>

        {/* Attestors */}
        {round.attestations.length > 0 && !compact && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Attested by:
            </p>
            {round.attestations.map((att, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 text-green-600" />
                <span>{att.attestorName}</span>
                <span className="text-muted-foreground">
                  · {formatTimestamp(att.attestedAt as any)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Course details */}
        {!compact && (
          <div className="mt-2 pt-2 border-t flex items-center gap-3 text-xs text-muted-foreground">
            <span>Rating: {round.courseRating}</span>
            <span>Slope: {round.slopeRating}</span>
          </div>
        )}

        {round.notes && !compact && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            "{round.notes}"
          </p>
        )}

        {round.adminOverride && round.adminOverrideNote && (
          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
            Admin note: {round.adminOverrideNote}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
