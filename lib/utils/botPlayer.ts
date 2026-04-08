import type { HoleData } from './exhibition'

// ─── Golf-themed bot names ──────────────────────────────────────────────────

const BOT_FIRST_NAMES = [
  'Arnie', 'Seve', 'Hogan', 'Hagen', 'Tiger', 'Chi Chi', 'Payne',
  'Bobby', 'Snead', 'Trevino', 'Player', 'Fuzzy', 'Daly', 'Bubba',
]

const BOT_LAST_NAMES = [
  'McFairway', 'Von Bogey', 'Sandtrap', 'Birdieman', 'Ironside',
  'Puttsworth', 'Sliceman', 'Hookshot', 'Divotski', 'Chipsworth',
  'Wedgewood', 'Eagleton', 'Albatross', 'Mulligan',
]

/** Pick a random golf-themed display name for a bot player. */
export function generateBotName(): string {
  const first = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)]
  const last = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)]
  return `${first} ${last}`
}

// ─── Score probability distributions by skill tier ──────────────────────────

/**
 * Probability of scoring relative to par for each skill tier.
 * Index maps to: [eagle-or-better, birdie, par, bogey, double, triple+]
 * Distributions are calibrated to produce realistic scoring patterns.
 */
type ScoreDist = [number, number, number, number, number, number]

function getDistribution(handicapIndex: number): {
  easy: ScoreDist   // holes where player gets strokes (low SI)
  hard: ScoreDist   // holes where player doesn't get strokes (high SI)
} {
  if (handicapIndex <= 5) {
    return {
      easy: [0.02, 0.18, 0.58, 0.17, 0.04, 0.01],
      hard: [0.01, 0.12, 0.50, 0.27, 0.08, 0.02],
    }
  }
  if (handicapIndex <= 12) {
    return {
      easy: [0.01, 0.08, 0.42, 0.34, 0.12, 0.03],
      hard: [0.00, 0.04, 0.30, 0.38, 0.20, 0.08],
    }
  }
  if (handicapIndex <= 20) {
    return {
      easy: [0.00, 0.04, 0.28, 0.38, 0.22, 0.08],
      hard: [0.00, 0.02, 0.18, 0.35, 0.28, 0.17],
    }
  }
  // 21+
  return {
    easy: [0.00, 0.02, 0.18, 0.32, 0.28, 0.20],
    hard: [0.00, 0.01, 0.10, 0.28, 0.32, 0.29],
  }
}

/**
 * Sample a score offset relative to par from a probability distribution.
 * Returns: -2 (eagle), -1 (birdie), 0 (par), +1 (bogey), +2 (double), +3 (triple+)
 */
function sampleOffset(dist: ScoreDist): number {
  const r = Math.random()
  let cumulative = 0
  const offsets = [-2, -1, 0, 1, 2, 3]
  for (let i = 0; i < dist.length; i++) {
    cumulative += dist[i]
    if (r < cumulative) return offsets[i]
  }
  return 1 // bogey fallback
}

// ─── Bot score generation ───────────────────────────────────────────────────

/**
 * Generate a full set of realistic gross scores for a bot player.
 *
 * @param handicapIndex - the bot's handicap index
 * @param courseHandicap - the bot's course handicap (already calculated)
 * @param holes - hole data with par and strokeIndex
 * @returns map of hole number (string) to gross score
 *
 * The algorithm:
 * 1. Determines skill tier from handicap
 * 2. For each hole, checks if the bot "gets strokes" (strokeIndex <= courseHandicap)
 * 3. Uses the easier or harder distribution accordingly
 * 4. Samples a score offset relative to par
 * 5. Ensures minimum score of 1
 */
export function generateBotScores(
  handicapIndex: number,
  courseHandicap: number,
  holes: HoleData[]
): Record<string, number> {
  const { easy, hard } = getDistribution(handicapIndex)
  const scores: Record<string, number> = {}

  for (const hole of holes) {
    // Bot gets strokes on holes where strokeIndex <= courseHandicap
    const getsStroke = hole.strokeIndex <= Math.abs(courseHandicap)
    const dist = getsStroke ? easy : hard
    const offset = sampleOffset(dist)
    // Ensure minimum score of 1
    scores[String(hole.number)] = Math.max(1, hole.par + offset)
  }

  return scores
}

/**
 * Generate the bot's score for a single hole (for hole-by-hole reveal).
 * Uses the same algorithm as generateBotScores but for one hole.
 */
export function generateBotHoleScore(
  handicapIndex: number,
  courseHandicap: number,
  holePar: number,
  holeStrokeIndex: number
): number {
  const { easy, hard } = getDistribution(handicapIndex)
  const getsStroke = holeStrokeIndex <= Math.abs(courseHandicap)
  const dist = getsStroke ? easy : hard
  const offset = sampleOffset(dist)
  return Math.max(1, holePar + offset)
}
