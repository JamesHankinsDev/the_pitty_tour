import {
  findCachedCourseByApiId,
  importCachedCourse,
  searchCachedCourses,
} from '@/lib/firebase/firestore'
import type { CachedCourse, CachedCourseHole, CachedCourseTee } from '@/lib/types'
import { searchCoursesApi, type ApiCourseResult } from './courseSearch'

export interface CourseSearchItem {
  /** Stable identifier for UI keys */
  key: string
  courseName: string
  clubName: string
  city: string
  state: string
  country: string
  /** true if this came from the local Firestore cache */
  fromCache: boolean
  /** present when from cache — include full data */
  cached: CachedCourse | null
  /** present when from API — include the API id so we can fetch details */
  apiId: number | null
}

/**
 * Combined search: Firestore cache first, then GolfCourseAPI.
 */
export async function searchCoursesForExhibition(
  query: string
): Promise<CourseSearchItem[]> {
  if (query.trim().length < 2) return []

  const cached = await searchCachedCourses(query)
  const cachedItems: CourseSearchItem[] = cached.map((c) => ({
    key: `cache-${c.id}`,
    courseName: c.courseName,
    clubName: c.clubName,
    city: c.city,
    state: c.state,
    country: c.country,
    fromCache: true,
    cached: c,
    apiId: null,
  }))

  // Deduplicate: if an API result has an id we already cached, skip it
  const cachedApiIds = new Set(cached.map((c) => c.golfcourseapi_id))
  const apiResults: ApiCourseResult[] = await searchCoursesApi(query)
  const apiItems: CourseSearchItem[] = apiResults
    .filter((a) => !cachedApiIds.has(a.id))
    .map((a) => ({
      key: `api-${a.id}`,
      courseName: a.name,
      clubName: a.clubName,
      city: a.city,
      state: a.state,
      country: a.country,
      fromCache: false,
      cached: null,
      apiId: a.id,
    }))

  return [...cachedItems, ...apiItems].slice(0, 10)
}

/**
 * Given an API course id, fetch full details, write to the Firestore cache,
 * and return the resulting CachedCourse.
 * If already cached, returns the existing entry.
 */
export async function importCourseFromApi(apiId: number): Promise<CachedCourse | null> {
  // Check cache first
  const existing = await findCachedCourseByApiId(apiId)
  if (existing) return existing

  // Fetch full detail from our server-side proxy
  try {
    const res = await fetch(`/api/courses/${apiId}`)
    if (!res.ok) return null
    const data = await res.json()
    const c = data.course
    if (!c) return null

    // Normalize the response to our CachedCourse shape.
    // GolfCourseAPI course shape: { id, course_name, club_name, location, tees: { male: [...], female: [...] } }
    // Each tee: { tee_name, course_rating, slope_rating, total_yards, par_total, number_of_holes, holes: [{ par, yardage, handicap }] }

    // Collect hole-by-hole data from the first tee that has hole details
    const anyTee =
      (c.tees?.male ?? []).find((t: any) => t.holes?.length) ??
      (c.tees?.female ?? []).find((t: any) => t.holes?.length) ??
      (c.tees?.male ?? [])[0] ??
      (c.tees?.female ?? [])[0]

    if (!anyTee) return null

    const holes: CachedCourseHole[] = (anyTee.holes ?? []).map((h: any, i: number) => ({
      number: i + 1,
      par: h.par ?? 4,
      strokeIndex: h.handicap ?? i + 1,
      yardages: {} as { [teeName: string]: number },
    }))

    // Fill in yardages from every tee
    const allTees = [...(c.tees?.male ?? []), ...(c.tees?.female ?? [])]
    for (const tee of allTees) {
      const teeName = tee.tee_name ?? 'Unknown'
      if (tee.holes) {
        tee.holes.forEach((h: any, i: number) => {
          if (holes[i]) {
            holes[i].yardages[teeName] = h.yardage ?? 0
          }
        })
      }
    }

    const tees: CachedCourseTee[] = []
    for (const t of c.tees?.male ?? []) {
      if (t.course_rating && t.slope_rating) {
        tees.push({
          name: t.tee_name ?? 'Unknown',
          gender: 'male',
          slope: t.slope_rating,
          rating: t.course_rating,
          totalYardage: t.total_yards,
        })
      }
    }
    for (const t of c.tees?.female ?? []) {
      if (t.course_rating && t.slope_rating) {
        tees.push({
          name: t.tee_name ?? 'Unknown',
          gender: 'female',
          slope: t.slope_rating,
          rating: t.course_rating,
          totalYardage: t.total_yards,
        })
      }
    }

    const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

    const id = await importCachedCourse({
      golfcourseapi_id: apiId,
      courseName: c.course_name ?? c.club_name ?? 'Unknown',
      clubName: c.club_name ?? '',
      city: c.location?.city ?? '',
      state: c.location?.state ?? '',
      country: c.location?.country ?? '',
      par: totalPar,
      holes,
      tees,
    })

    return { ...(await findCachedCourseByApiId(apiId)), id } as CachedCourse
  } catch (err) {
    console.warn('Failed to import course:', err)
    return null
  }
}
