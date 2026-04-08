import type { ExhibitionPlayer, ExhibitionFormat } from '../types'

/**
 * Determine the result (win/loss/tie) for each player in a completed exhibition.
 *
 * Returns a map of userId → 'win' | 'loss' | 'tie'.
 * Bot players are included (they count as opponents).
 */
export function determineExhibitionResults(
  players: ExhibitionPlayer[],
  format: ExhibitionFormat
): Map<string, 'win' | 'loss' | 'tie'> {
  const results = new Map<string, 'win' | 'loss' | 'tie'>()
  if (players.length < 2) return results

  // Calculate total gross score per player
  const totals = new Map<string, number>()
  for (const p of players) {
    let total = 0
    for (const [, score] of Object.entries(p.scores)) {
      if (score.gross != null) total += score.gross
    }
    totals.set(p.userId, total)
  }

  // For stableford, higher is better; for everything else, lower is better
  const isHigherBetter = format === 'stableford'

  if (isHigherBetter) {
    // Sum stableford points instead of gross
    totals.clear()
    for (const p of players) {
      let total = 0
      for (const [, score] of Object.entries(p.scores)) {
        if (score.stablefordPoints != null) total += score.stablefordPoints
      }
      totals.set(p.userId, total)
    }
  }

  // Find best score
  const scores = Array.from(totals.entries())
  const bestScore = isHigherBetter
    ? Math.max(...scores.map(([, s]) => s))
    : Math.min(...scores.map(([, s]) => s))

  const winnersCount = scores.filter(([, s]) => s === bestScore).length

  for (const [uid, score] of scores) {
    if (score === bestScore) {
      results.set(uid, winnersCount > 1 ? 'tie' : 'win')
    } else {
      results.set(uid, 'loss')
    }
  }

  return results
}
