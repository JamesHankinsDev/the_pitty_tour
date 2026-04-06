import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthHeader } from '@/lib/firebase/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Fetch full course details from GolfCourseAPI including hole-by-hole data.
 * Used by the exhibition course search to pull par + strokeIndex per hole.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const uid = await verifyAuthHeader(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Missing course id' }, { status: 400 })
  }

  const apiKey = process.env.GOLF_COURSE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GolfCourseAPI key not configured' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`https://api.golfcourseapi.com/v1/courses/${id}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `GolfCourseAPI returned ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ course: data.course ?? data })
  } catch (err) {
    console.error('Course detail error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}
