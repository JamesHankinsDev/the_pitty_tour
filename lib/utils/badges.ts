import type { Round } from '../types'

export interface BadgeDef {
  id: string
  name: string
  description: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface EarnedBadge extends BadgeDef {
  earned: true
  detail: string   // e.g. "Shot 78 at Augusta National"
}

export interface LockedBadge extends BadgeDef {
  earned: false
  progress: string  // e.g. "2/5 rounds"
}

export type Badge = EarnedBadge | LockedBadge

// ─── Badge Catalog ──────────────────────────────────────────────────────────

const BADGES: BadgeDef[] = [
  // Participation
  { id: 'first_round', name: 'Tour Debut', description: 'Submit your first round', emoji: '🏌️', tier: 'bronze' },
  { id: 'five_rounds', name: 'Regular', description: 'Submit 5 valid rounds', emoji: '📋', tier: 'silver' },
  { id: 'ten_rounds', name: 'Grinder', description: 'Submit 10 valid rounds', emoji: '💪', tier: 'gold' },
  { id: 'twenty_rounds', name: 'Iron Man', description: 'Submit 20 valid rounds', emoji: '🦾', tier: 'platinum' },

  // Scoring
  { id: 'break_90', name: 'Breaking 90', description: 'Shoot under 90 gross', emoji: '🎯', tier: 'bronze' },
  { id: 'break_80', name: 'Breaking 80', description: 'Shoot under 80 gross', emoji: '🔥', tier: 'silver' },
  { id: 'break_70', name: 'Scratch Player', description: 'Shoot under 70 gross', emoji: '⚡', tier: 'platinum' },
  { id: 'net_under_par', name: 'Net Machine', description: 'Shoot net under par (< 72)', emoji: '🏆', tier: 'silver' },
  { id: 'net_60s', name: 'Net 60s', description: 'Shoot a net score in the 60s', emoji: '💎', tier: 'gold' },

  // Skills
  { id: 'first_save', name: 'Sandy', description: 'Record your first sand save', emoji: '⛳', tier: 'bronze' },
  { id: 'five_saves', name: 'Bunker Buster', description: 'Record 5 total sand saves', emoji: '💥', tier: 'silver' },
  { id: 'ten_saves', name: 'Sand Master', description: 'Record 10 total sand saves', emoji: '🏖️', tier: 'gold' },
  { id: 'first_par3', name: 'Par-3 Pro', description: 'Record your first par-3 par', emoji: '🎯', tier: 'bronze' },
  { id: 'five_par3s', name: 'Short Game Sharp', description: 'Record 5 total par-3 pars', emoji: '🎪', tier: 'silver' },
  { id: 'ten_par3s', name: 'Par-3 King', description: 'Record 10 total par-3 pars', emoji: '👑', tier: 'gold' },

  // Attestation / Community
  { id: 'first_attest', name: 'Witness', description: 'Attest another player\'s round', emoji: '👀', tier: 'bronze' },
  { id: 'two_markers', name: 'Making Friends', description: 'Get 2 unique markers', emoji: '🤝', tier: 'bronze' },
  { id: 'four_markers', name: 'Passport Stamped', description: 'Meet the 4-marker requirement', emoji: '📕', tier: 'silver' },
  { id: 'six_markers', name: 'Social Butterfly', description: 'Get 6 unique markers', emoji: '🦋', tier: 'gold' },

  // Streaks
  { id: 'two_month_streak', name: 'Consistency', description: 'Valid round in 2 consecutive months', emoji: '📅', tier: 'bronze' },
  { id: 'four_month_streak', name: 'Relentless', description: 'Valid round in 4 consecutive months', emoji: '🗓️', tier: 'silver' },
  { id: 'full_season', name: 'Full Send', description: 'Valid round every month of the season', emoji: '🚀', tier: 'platinum' },

  // Fun / Rare
  { id: 'nine_hole', name: 'Quick Nine', description: 'Log a 9-hole practice round', emoji: '⏱️', tier: 'bronze' },
  { id: 'five_courses', name: 'Explorer', description: 'Play 5 different courses', emoji: '🗺️', tier: 'silver' },
  { id: 'ten_courses', name: 'Globetrotter', description: 'Play 10 different courses', emoji: '🌎', tier: 'gold' },
]

// ─── Evaluation Engine ──────────────────────────────────────────────────────

export function evaluateBadges(
  rounds: Round[],
  allRounds: Round[],  // all rounds in the season (for attestation check)
  uid: string
): Badge[] {
  const valid18 = rounds.filter((r) => r.isValid && (r.holeCount ?? 18) === 18)
  const allPlayerRounds = rounds // includes 9-hole and invalid
  const validCount = valid18.length

  // Aggregate stats
  const totalSaves = valid18.reduce((s, r) => s + (r.sandSaves ?? 0), 0)
  const totalPar3s = valid18.reduce((s, r) => s + (r.par3Pars ?? 0), 0)
  const lowestGross = valid18.length > 0 ? Math.min(...valid18.map((r) => r.grossScore)) : 999
  const lowestNet = valid18.length > 0 ? Math.min(...valid18.map((r) => r.netScore)) : 999

  // Unique markers
  const markers = new Set<string>()
  for (const r of rounds) {
    for (const att of r.attestations) {
      markers.add(att.attestorUid)
    }
  }
  const uniqueMarkers = markers.size

  // Rounds I attested for others
  const attestedOthers = allRounds.some(
    (r) => r.uid !== uid && r.attestations.some((a) => a.attestorUid === uid)
  )

  // Unique courses
  const uniqueCourses = new Set(valid18.map((r) => r.courseName.toLowerCase())).size

  // Consecutive month streak
  const months = new Set(valid18.map((r) => r.month))
  const sortedMonths = Array.from(months).sort()
  let maxStreak = sortedMonths.length > 0 ? 1 : 0
  let streak = 1
  for (let i = 1; i < sortedMonths.length; i++) {
    const [prevY, prevM] = sortedMonths[i - 1].split('-').map(Number)
    const [curY, curM] = sortedMonths[i].split('-').map(Number)
    if ((curY === prevY && curM === prevM + 1) || (curY === prevY + 1 && prevM === 12 && curM === 1)) {
      streak++
    } else {
      streak = 1
    }
    maxStreak = Math.max(maxStreak, streak)
  }

  // Has 9-hole round
  const has9Hole = allPlayerRounds.some((r) => (r.holeCount ?? 18) === 9)

  // ── Evaluate each badge ──

  function check(id: string): { earned: boolean; detail: string; progress: string } {
    switch (id) {
      // Participation
      case 'first_round':
        return { earned: validCount >= 1, detail: `${validCount} valid rounds`, progress: `${validCount}/1 rounds` }
      case 'five_rounds':
        return { earned: validCount >= 5, detail: `${validCount} valid rounds`, progress: `${validCount}/5 rounds` }
      case 'ten_rounds':
        return { earned: validCount >= 10, detail: `${validCount} valid rounds`, progress: `${validCount}/10 rounds` }
      case 'twenty_rounds':
        return { earned: validCount >= 20, detail: `${validCount} valid rounds`, progress: `${validCount}/20 rounds` }

      // Scoring
      case 'break_90':
        return { earned: lowestGross < 90, detail: lowestGross < 90 ? `Shot ${lowestGross}` : '', progress: `Best: ${lowestGross === 999 ? '—' : lowestGross}` }
      case 'break_80':
        return { earned: lowestGross < 80, detail: lowestGross < 80 ? `Shot ${lowestGross}` : '', progress: `Best: ${lowestGross === 999 ? '—' : lowestGross}` }
      case 'break_70':
        return { earned: lowestGross < 70, detail: lowestGross < 70 ? `Shot ${lowestGross}` : '', progress: `Best: ${lowestGross === 999 ? '—' : lowestGross}` }
      case 'net_under_par':
        return { earned: lowestNet < 72, detail: lowestNet < 72 ? `Net ${lowestNet}` : '', progress: `Best net: ${lowestNet === 999 ? '—' : lowestNet}` }
      case 'net_60s':
        return { earned: lowestNet < 70, detail: lowestNet < 70 ? `Net ${lowestNet}` : '', progress: `Best net: ${lowestNet === 999 ? '—' : lowestNet}` }

      // Skills
      case 'first_save':
        return { earned: totalSaves >= 1, detail: `${totalSaves} saves`, progress: `${totalSaves}/1 saves` }
      case 'five_saves':
        return { earned: totalSaves >= 5, detail: `${totalSaves} saves`, progress: `${totalSaves}/5 saves` }
      case 'ten_saves':
        return { earned: totalSaves >= 10, detail: `${totalSaves} saves`, progress: `${totalSaves}/10 saves` }
      case 'first_par3':
        return { earned: totalPar3s >= 1, detail: `${totalPar3s} par-3 pars`, progress: `${totalPar3s}/1 par-3s` }
      case 'five_par3s':
        return { earned: totalPar3s >= 5, detail: `${totalPar3s} par-3 pars`, progress: `${totalPar3s}/5 par-3s` }
      case 'ten_par3s':
        return { earned: totalPar3s >= 10, detail: `${totalPar3s} par-3 pars`, progress: `${totalPar3s}/10 par-3s` }

      // Community
      case 'first_attest':
        return { earned: attestedOthers, detail: 'Attested a round', progress: attestedOthers ? 'Done' : 'Attest a round' }
      case 'two_markers':
        return { earned: uniqueMarkers >= 2, detail: `${uniqueMarkers} unique markers`, progress: `${uniqueMarkers}/2 markers` }
      case 'four_markers':
        return { earned: uniqueMarkers >= 4, detail: `${uniqueMarkers} unique markers`, progress: `${uniqueMarkers}/4 markers` }
      case 'six_markers':
        return { earned: uniqueMarkers >= 6, detail: `${uniqueMarkers} unique markers`, progress: `${uniqueMarkers}/6 markers` }

      // Streaks
      case 'two_month_streak':
        return { earned: maxStreak >= 2, detail: `${maxStreak}-month streak`, progress: `${maxStreak}/2 months` }
      case 'four_month_streak':
        return { earned: maxStreak >= 4, detail: `${maxStreak}-month streak`, progress: `${maxStreak}/4 months` }
      case 'full_season':
        return { earned: sortedMonths.length >= 8, detail: `${sortedMonths.length} months played`, progress: `${sortedMonths.length}/8 months` }

      // Fun
      case 'nine_hole':
        return { earned: has9Hole, detail: 'Logged a 9-hole round', progress: has9Hole ? 'Done' : 'Log a 9-hole round' }
      case 'five_courses':
        return { earned: uniqueCourses >= 5, detail: `${uniqueCourses} courses`, progress: `${uniqueCourses}/5 courses` }
      case 'ten_courses':
        return { earned: uniqueCourses >= 10, detail: `${uniqueCourses} courses`, progress: `${uniqueCourses}/10 courses` }

      default:
        return { earned: false, detail: '', progress: '' }
    }
  }

  return BADGES.map((def) => {
    const result = check(def.id)
    if (result.earned) {
      return { ...def, earned: true as const, detail: result.detail }
    }
    return { ...def, earned: false as const, progress: result.progress }
  })
}
