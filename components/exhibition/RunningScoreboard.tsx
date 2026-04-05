'use client'

import type {
  ExhibitionPlayer,
  ExhibitionFormat,
  ExhibitionTeam,
} from '@/lib/types'

interface RunningScoreboardProps {
  format: ExhibitionFormat
  players: ExhibitionPlayer[]
  teams: ExhibitionTeam[] | null
  currentHole: number
}

export function RunningScoreboard({ format, players, teams, currentHole }: RunningScoreboardProps) {
  // Aggregate data per player up through the previous hole (completed holes only)
  const playedHoles = Object.keys(players[0]?.scores ?? {})
    .map(Number)
    .filter((h) => h < currentHole)
    .sort((a, b) => a - b)

  // Helper: sum net through currentHole - 1
  const cumulativeNet = (p: ExhibitionPlayer): number => {
    let total = 0
    for (const h of playedHoles) {
      const s = p.scores[String(h)]
      if (s?.net !== null && s?.net !== undefined) total += s.net
    }
    return total
  }

  const cumulativeGross = (p: ExhibitionPlayer): number => {
    let total = 0
    for (const h of playedHoles) {
      const s = p.scores[String(h)]
      if (s?.gross !== null && s?.gross !== undefined) total += s.gross
    }
    return total
  }

  const cumulativeStableford = (p: ExhibitionPlayer): number => {
    let total = 0
    for (const h of playedHoles) {
      const s = p.scores[String(h)]
      if (s?.stablefordPoints !== null && s?.stablefordPoints !== undefined) total += s.stablefordPoints
    }
    return total
  }

  // ─── Stroke Play ────────────────────────────────────────────────────────
  if (format === 'stroke_play') {
    const rows = [...players]
      .map((p) => ({ p, net: cumulativeNet(p), gross: cumulativeGross(p) }))
      .sort((a, b) => a.net - b.net)
    return (
      <div className="text-xs space-y-0.5">
        {rows.map((r, i) => (
          <div key={r.p.userId} className="flex items-center gap-2">
            <span className="font-bold w-4 text-center">{i + 1}</span>
            <span className="flex-1 truncate">{r.p.displayName}</span>
            <span className="font-mono">{r.gross} / {r.net}</span>
          </div>
        ))}
      </div>
    )
  }

  // ─── Stableford ─────────────────────────────────────────────────────────
  if (format === 'stableford') {
    const rows = [...players]
      .map((p) => ({ p, pts: cumulativeStableford(p) }))
      .sort((a, b) => b.pts - a.pts)
    return (
      <div className="text-xs space-y-0.5">
        {rows.map((r, i) => (
          <div key={r.p.userId} className="flex items-center gap-2">
            <span className="font-bold w-4 text-center">{i + 1}</span>
            <span className="flex-1 truncate">{r.p.displayName}</span>
            <span className="font-mono">{r.pts} pts</span>
          </div>
        ))}
      </div>
    )
  }

  // ─── Match Play (2 players assumed) ─────────────────────────────────────
  if (format === 'match_play') {
    if (players.length < 2) return null
    const [a, b] = players
    let aUp = 0
    for (const h of playedHoles) {
      const sa = a.scores[String(h)]?.net
      const sb = b.scores[String(h)]?.net
      if (sa === null || sb === null || sa === undefined || sb === undefined) continue
      if (sa < sb) aUp++
      else if (sb < sa) aUp--
    }
    const holesRemaining = (players[0]?.scores ? Object.keys(players[0].scores).length : 18) - playedHoles.length
    const leader = aUp > 0 ? a : aUp < 0 ? b : null
    const margin = Math.abs(aUp)
    const status = margin === 0 ? 'All Square' : `${leader?.displayName.split(' ')[0]} ${margin} UP`
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-bold">{status}</div>
        <div className="text-muted-foreground">{holesRemaining} holes remaining</div>
      </div>
    )
  }

  // ─── Skins ──────────────────────────────────────────────────────────────
  if (format === 'skins') {
    const skinCounts = new Map<string, number>()
    let carryover = 1
    for (const h of playedHoles) {
      const scores = players
        .map((p) => ({ uid: p.userId, net: p.scores[String(h)]?.net ?? null }))
        .filter((s) => s.net !== null)
      if (scores.length < 2) continue
      const min = Math.min(...scores.map((s) => s.net!))
      const winners = scores.filter((s) => s.net === min)
      if (winners.length === 1) {
        skinCounts.set(winners[0].uid, (skinCounts.get(winners[0].uid) ?? 0) + carryover)
        carryover = 1
      } else {
        carryover++
      }
    }

    const rows = [...players]
      .map((p) => ({ p, skins: skinCounts.get(p.userId) ?? 0 }))
      .sort((a, b) => b.skins - a.skins)

    return (
      <div className="text-xs space-y-0.5">
        {rows.map((r) => (
          <div key={r.p.userId} className="flex items-center gap-2">
            <span className="flex-1 truncate">{r.p.displayName}</span>
            <span className="font-mono">{r.skins} skins</span>
          </div>
        ))}
        {carryover > 1 && (
          <div className="text-muted-foreground text-xs">Pot: {carryover} carryover</div>
        )}
      </div>
    )
  }

  // ─── Team Formats (shamble/scramble/vegas) ──────────────────────────────
  if ((format === 'shamble' || format === 'scramble' || format === 'vegas') && teams) {
    const teamTotals = teams.map((t) => {
      const members = players.filter((p) => p.teamId === t.id)
      let total = 0
      if (format === 'vegas') {
        // Vegas: each hole = lower + higher digit combined (e.g. 4, 5 → 45)
        for (const h of playedHoles) {
          const scores = members
            .map((m) => m.scores[String(h)]?.net ?? null)
            .filter((s) => s !== null) as number[]
          if (scores.length === 2) {
            const sorted = [...scores].sort((a, b) => a - b)
            total += sorted[0] * 10 + sorted[1]
          }
        }
      } else {
        // Shamble/Scramble: best net per hole across team
        for (const h of playedHoles) {
          const scores = members
            .map((m) => m.scores[String(h)]?.net ?? null)
            .filter((s) => s !== null) as number[]
          if (scores.length > 0) total += Math.min(...scores)
        }
      }
      return { team: t, total }
    }).sort((a, b) => a.total - b.total)

    const diff = teamTotals.length >= 2 ? teamTotals[1].total - teamTotals[0].total : 0

    return (
      <div className="text-xs space-y-0.5">
        {teamTotals.map((row, i) => (
          <div key={row.team.id} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.team.color }}
            />
            <span className="flex-1 truncate">{row.team.name}</span>
            <span className="font-mono">{row.total}</span>
          </div>
        ))}
        {diff > 0 && (
          <div className="text-muted-foreground">{teamTotals[0].team.name} +{diff}</div>
        )}
      </div>
    )
  }

  return null
}
