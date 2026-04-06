import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthHeader } from '@/lib/firebase/apiAuth'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ max: 30, windowMs: 60_000 })

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Search GolfCourseAPI for courses by name/location.
 * Protects the API key server-side.
 */
export async function GET(req: NextRequest) {
  const uid = await verifyAuthHeader(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = limiter.check(uid)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ courses: [] })
  }

  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GolfCourseAPI key not configured' },
      { status: 503 }
    )
  }

  try {
    // GolfCourseAPI search endpoint
    const url = `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `GolfCourseAPI returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Normalize response — GolfCourseAPI returns `courses` array
    const courses = (data.courses ?? []).slice(0, 10).map((c: any) => ({
      id: c.id,
      name: c.course_name ?? c.club_name ?? 'Unknown',
      clubName: c.club_name ?? '',
      city: c.location?.city ?? '',
      state: c.location?.state ?? '',
      country: c.location?.country ?? '',
      // Extract rating/slope from first tee box if available
      tees: c.tees ?? null,
    }))

    return NextResponse.json({ courses })
  } catch (err) {
    console.error('Course search error:', err)
    return NextResponse.json(
      { error: 'Failed to search courses' },
      { status: 500 }
    )
  }
}
