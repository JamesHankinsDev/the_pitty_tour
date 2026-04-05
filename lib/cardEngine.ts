import type {
  CardDefinition,
  CardItem,
  ExhibitionHoleScore,
  ExhibitionPlayer,
  HoleResult,
  ExhibitionFormat,
} from './types'

/**
 * Filter triggered cards based on hole result.
 * Returns four distinct buckets — UI decides what to offer the player.
 */
export function getTriggeredCards(params: {
  holeResult: HoleResult
  isBackToBackBirdie: boolean
  useCards: boolean
  nsfwEnabled: boolean
  activeCards: string[]
  allDefinitions: CardDefinition[]
}): {
  selfPowerUps: CardDefinition[]
  opponentPenalties: CardDefinition[]
  selfPenalties: CardDefinition[]
  opponentBoosts: CardDefinition[]
} {
  const { holeResult, isBackToBackBirdie, useCards, nsfwEnabled, activeCards, allDefinitions } = params

  const empty = { selfPowerUps: [], opponentPenalties: [], selfPenalties: [], opponentBoosts: [] }
  if (!useCards || holeResult === 'par') return empty

  const isActive = (def: CardDefinition) =>
    activeCards.includes(def.key) && (nsfwEnabled || !def.isNsfw)

  // Pools keyed by card.key
  const poolByKey = new Map<string, CardDefinition>()
  for (const d of allDefinitions) {
    if (isActive(d)) poolByKey.set(d.key, d)
  }

  const pool = (keys: string[]) =>
    keys.map((k) => poolByKey.get(k)).filter((c): c is CardDefinition => !!c)

  // Birdie-triggered power-ups (base set)
  const birdiePowerUps = ['mulligan', 'foot_wedge', 'breakfast_ball', 'gimme_putt', 'winter_rules']
  const birdiePenalties = [
    'reverse_mulligan', 'blue_shell', 'the_yips', 'wrong_club',
    'sandtrap_tax', 'caddie_swap', 'cart_path_only', 'happy_hour',
  ]

  switch (holeResult) {
    case 'ace': {
      // All eagle power-ups + beer_can_gimme (if NSFW)
      const keys = [...birdiePowerUps, 'skip_hole', 'beer_can_gimme']
      if (isBackToBackBirdie) keys.push('stroke_shield')
      return {
        selfPowerUps: pool(keys),
        opponentPenalties: pool(birdiePenalties),
        selfPenalties: [],
        opponentBoosts: [],
      }
    }
    case 'eagle': {
      const keys = ['skip_hole', ...birdiePowerUps, 'beer_can_gimme']
      if (isBackToBackBirdie) keys.push('stroke_shield')
      return {
        selfPowerUps: pool(keys),
        opponentPenalties: pool(birdiePenalties),
        selfPenalties: [],
        opponentBoosts: [],
      }
    }
    case 'birdie': {
      const keys = [...birdiePowerUps]
      if (isBackToBackBirdie) keys.push('stroke_shield')
      return {
        selfPowerUps: pool(keys),
        opponentPenalties: pool(birdiePenalties),
        selfPenalties: [],
        opponentBoosts: [],
      }
    }
    case 'bogey': {
      return {
        selfPowerUps: [],
        opponentPenalties: [],
        selfPenalties: pool(['honest_abe']),
        opponentBoosts: pool(['steal_a_stroke', 'extra_gimme']),
      }
    }
    case 'double_bogey': {
      return {
        selfPowerUps: [],
        opponentPenalties: [],
        selfPenalties: pool(['tin_cup', 'grip_it_and_rip_it']),
        opponentBoosts: pool(['free_drop']),
      }
    }
    case 'triple_plus': {
      return {
        selfPowerUps: [],
        opponentPenalties: [],
        selfPenalties: pool(['walk_of_shame']),
        opponentBoosts: pool(['opponent_breakfast_ball']),
      }
    }
    default:
      return empty
  }
}

/**
 * Apply an auto-activated card's effect to a hole score.
 * Honest Abe: net = gross (ignore handicap strokes).
 * Blue Shell: +1 to gross.
 * Sandtrap Tax: +1 to gross (group-confirmed bunker contact).
 */
export function applyAutoCard(
  score: ExhibitionHoleScore,
  card: CardItem
): ExhibitionHoleScore {
  if (score.gross === null) return score
  const grossValue: number = score.gross
  const next: ExhibitionHoleScore = { ...score, gross: grossValue }

  switch (card.key) {
    case 'honest_abe':
      next.honestAbeActive = true
      next.net = grossValue
      break
    case 'blue_shell': {
      const g = grossValue + 1
      next.gross = g
      next.net = next.honestAbeActive ? g : g - next.handicapStrokes
      break
    }
    case 'sandtrap_tax': {
      const g = grossValue + 1
      next.gross = g
      next.net = next.honestAbeActive ? g : g - next.handicapStrokes
      break
    }
  }

  return next
}

/**
 * Check if a player has an active Stroke Shield, bounce the incoming card.
 * If blocked, removes shield from inventory and returns the bounced card
 * (type converted to self_penalty) for the original sender.
 */
export function checkStrokeShield(
  targetPlayer: ExhibitionPlayer,
  incomingCard: CardItem
): {
  blocked: boolean
  bouncedCard: CardItem | null
  updatedInventory: CardItem[]
} {
  const shieldIdx = targetPlayer.cardInventory.findIndex((c) => c.key === 'stroke_shield')
  if (shieldIdx === -1) {
    return {
      blocked: false,
      bouncedCard: null,
      updatedInventory: targetPlayer.cardInventory,
    }
  }

  const updatedInventory = [
    ...targetPlayer.cardInventory.slice(0, shieldIdx),
    ...targetPlayer.cardInventory.slice(shieldIdx + 1),
  ]
  const bouncedCard: CardItem = {
    key: incomingCard.key,
    name: incomingCard.name,
    type: 'self_penalty',
    holeEarned: incomingCard.holeEarned,
    mustPlayByHole: incomingCard.mustPlayByHole,
  }
  return { blocked: true, bouncedCard, updatedInventory }
}

/**
 * Determine the current leader for Blue Shell targeting.
 * Returns the userId of the player in the lead based on format.
 */
export function getCurrentLeader(
  players: ExhibitionPlayer[],
  format: ExhibitionFormat,
  currentHole: number
): string | null {
  if (players.length === 0) return null

  if (format === 'stroke_play' || format === 'shamble' || format === 'scramble' || format === 'vegas') {
    // Best cumulative net score through currentHole
    let bestUid: string | null = null
    let bestNet = Infinity
    for (const p of players) {
      let total = 0
      let holesPlayed = 0
      for (let h = 1; h <= currentHole; h++) {
        const s = p.scores[String(h)]
        if (s?.net !== null && s?.net !== undefined) {
          total += s.net
          holesPlayed++
        }
      }
      if (holesPlayed > 0 && total < bestNet) {
        bestNet = total
        bestUid = p.userId
      }
    }
    return bestUid
  }

  if (format === 'stableford') {
    // Highest point total
    let bestUid: string | null = null
    let bestPts = -Infinity
    for (const p of players) {
      let total = 0
      for (let h = 1; h <= currentHole; h++) {
        const s = p.scores[String(h)]
        if (s?.stablefordPoints !== null && s?.stablefordPoints !== undefined) {
          total += s.stablefordPoints
        }
      }
      if (total > bestPts) {
        bestPts = total
        bestUid = p.userId
      }
    }
    return bestUid
  }

  if (format === 'match_play') {
    // Player who is most holes up (2-player assumed)
    if (players.length < 2) return null
    const [a, b] = players
    let aUp = 0
    for (let h = 1; h <= currentHole; h++) {
      const sa = a.scores[String(h)]?.net
      const sb = b.scores[String(h)]?.net
      if (sa === null || sb === null || sa === undefined || sb === undefined) continue
      if (sa < sb) aUp++
      else if (sb < sa) aUp--
    }
    if (aUp > 0) return a.userId
    if (aUp < 0) return b.userId
    return null
  }

  if (format === 'skins') {
    // Player with most skins won
    const skinCounts = new Map<string, number>()
    let carryover = 1
    for (let h = 1; h <= currentHole; h++) {
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
    let bestUid: string | null = null
    let bestCount = -1
    for (const [uid, count] of skinCounts) {
      if (count > bestCount) {
        bestCount = count
        bestUid = uid
      }
    }
    return bestUid
  }

  return null
}

/**
 * Detect whether a birdie is back-to-back given the player's scores.
 */
export function isBackToBackBirdie(
  scores: Record<string, ExhibitionHoleScore>,
  currentHole: number
): boolean {
  if (currentHole <= 1) return false
  const prev = scores[String(currentHole - 1)]
  if (!prev || prev.gross === null) return false
  // Previous hole was a birdie
  return prev.gross === prev.par - 1
}
