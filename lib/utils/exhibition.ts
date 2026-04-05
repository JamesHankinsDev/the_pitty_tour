import type { HoleResult } from '../types'

export interface HoleData {
  number: number
  par: number
  strokeIndex: number
}

/**
 * Generate a 6-character uppercase alphanumeric invite code.
 * No ambiguous characters (0/O, 1/I/L).
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Classify a hole result based on gross score vs. par.
 */
export function getHoleResult(gross: number, par: number): HoleResult {
  if (gross === 1) return 'ace'
  if (gross <= par - 2) return 'eagle'
  if (gross === par - 1) return 'birdie'
  if (gross === par) return 'par'
  if (gross === par + 1) return 'bogey'
  if (gross === par + 2) return 'double_bogey'
  return 'triple_plus'
}

/**
 * Stableford points based on net score vs par.
 * net double bogey or worse = 0, net bogey = 1, net par = 2,
 * net birdie = 3, net eagle = 4, net albatross = 5.
 */
export function getStablefordPoints(
  gross: number,
  par: number,
  handicapStrokes: number
): number {
  const net = gross - handicapStrokes
  const diff = net - par
  if (diff >= 2) return 0      // net double bogey or worse
  if (diff === 1) return 1     // net bogey
  if (diff === 0) return 2     // net par
  if (diff === -1) return 3    // net birdie
  if (diff === -2) return 4    // net eagle
  return 5                     // net albatross or better
}

/**
 * Course handicap = round(handicapIndex × (slope / 113) + (courseRating - par))
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number
): number {
  return Math.round(handicapIndex * (slope / 113) + (rating - par))
}

/**
 * Distribute handicap strokes across holes using strokeIndex.
 * Returns a map of hole number (as string) to strokes received.
 *
 * Positive handicap:
 *   - courseHandicap <= 18: 1 stroke on holes where strokeIndex <= courseHandicap
 *   - courseHandicap > 18: 2 strokes on holes where strokeIndex <= (courseHandicap - 18),
 *                          1 stroke on remaining holes
 *   - courseHandicap > 36: 3 strokes distributed similarly
 *
 * Zero handicap: all 0 strokes
 *
 * Negative handicap (player gives strokes):
 *   - subtract from holes where strokeIndex <= abs(courseHandicap)
 */
export function distributeHandicapStrokes(
  courseHandicap: number,
  holes: HoleData[]
): Record<string, number> {
  const result: Record<string, number> = {}

  // Initialize all holes to 0
  for (const h of holes) {
    result[String(h.number)] = 0
  }

  if (courseHandicap === 0) return result

  const totalHoles = holes.length
  const absHcp = Math.abs(courseHandicap)
  const sign = courseHandicap > 0 ? 1 : -1

  // Apply strokes in rounds: full rounds give one stroke to every hole,
  // then remaining strokes go to the lowest-index holes.
  const fullRounds = Math.floor(absHcp / totalHoles)
  const remainder = absHcp % totalHoles

  for (const h of holes) {
    let strokes = fullRounds
    if (h.strokeIndex <= remainder) {
      strokes += 1
    }
    result[String(h.number)] = strokes * sign
  }

  return result
}

/**
 * Beer Can Gimme: one club head length per drink (~4 inches per drink).
 */
export function getBeerCanGimmeRadius(drinksConsumed: number): number {
  return drinksConsumed * 4
}
