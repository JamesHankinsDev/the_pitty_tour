/**
 * Client-side cache for GolfCourseAPI search results.
 * Caches search responses by query to limit round-trips.
 * Cache persists across component mounts in the same session.
 */

export interface ApiTee {
  tee_name?: string
  course_rating?: number
  slope_rating?: number
  total_yards?: number
  par_total?: number
  number_of_holes?: number
}

export interface ApiCourseResult {
  id: number
  name: string
  clubName: string
  city: string
  state: string
  country: string
  tees: {
    male?: ApiTee[]
    female?: ApiTee[]
  } | null
}

/** Flattened tee option with gender/color info for dropdowns */
export interface TeeOption {
  id: string         // unique key e.g. "male-0"
  name: string       // display name e.g. "Blue" or "Championship"
  gender: 'male' | 'female'
  rating: number
  slope: number
  yards?: number
  par?: number
}

/** Extract all tees from a course result as a flat, selectable list. */
export function getAvailableTees(course: ApiCourseResult): TeeOption[] {
  const options: TeeOption[] = []
  const add = (tees: ApiTee[] | undefined, gender: 'male' | 'female') => {
    tees?.forEach((t, i) => {
      if (t.course_rating && t.slope_rating) {
        options.push({
          id: `${gender}-${i}`,
          name: t.tee_name ?? `Tee ${i + 1}`,
          gender,
          rating: t.course_rating,
          slope: t.slope_rating,
          yards: t.total_yards,
          par: t.par_total,
        })
      }
    })
  }
  add(course.tees?.male, 'male')
  add(course.tees?.female, 'female')
  // Sort by slope descending (harder tees first) as a common convention
  return options.sort((a, b) => b.slope - a.slope)
}

// Module-level cache shared across all consumers
const cache = new Map<string, ApiCourseResult[]>()
const inflight = new Map<string, Promise<ApiCourseResult[]>>()

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const cacheTimestamps = new Map<string, number>()

/**
 * Search GolfCourseAPI via our proxy route, with caching + deduplication.
 * Same query within TTL returns cached results; concurrent calls share one request.
 */
export async function searchCoursesApi(query: string): Promise<ApiCourseResult[]> {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 3) return []

  // Check cache (with TTL)
  const cached = cache.get(normalized)
  const ts = cacheTimestamps.get(normalized)
  if (cached && ts && Date.now() - ts < CACHE_TTL) {
    return cached
  }

  // Dedupe in-flight requests
  const existing = inflight.get(normalized)
  if (existing) return existing

  const promise = (async () => {
    try {
      const { authHeaders } = await import('@/lib/firebase/authFetch')
      const headers = await authHeaders()
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`, { headers })
      if (!res.ok) {
        return []
      }
      const data = await res.json()
      const results: ApiCourseResult[] = data.courses ?? []
      cache.set(normalized, results)
      cacheTimestamps.set(normalized, Date.now())
      return results
    } catch {
      return []
    } finally {
      inflight.delete(normalized)
    }
  })()

  inflight.set(normalized, promise)
  return promise
}

/**
 * Extract course rating and slope from the tees data.
 */
export function extractRatingSlope(
  tees: ApiCourseResult['tees']
): { rating?: number; slope?: number } {
  const firstTee = tees?.male?.[0] ?? tees?.female?.[0]
  return {
    rating: firstTee?.course_rating,
    slope: firstTee?.slope_rating,
  }
}

/**
 * Format a location string from API result fields.
 */
export function formatCourseLocation(course: ApiCourseResult): string {
  return [course.city, course.state, course.country].filter(Boolean).join(', ')
}
