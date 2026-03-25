import { NextRequest, NextResponse } from 'next/server'

const GHIN_API_BASE = 'https://api2.ghin.com/api/v1'
const FIREBASE_SESSION_URL =
  'https://firebaseinstallations.googleapis.com/v1/projects/ghin-mobile-app/installations'
const GOOGLE_API_KEY = 'AIzaSyBxgTOAWxiud0HuaE5tN-5NTlzFnrtyz-I'
const SESSION_DEFAULTS = {
  appId: '1:884417644529:web:47fb315bc6c70242f72650',
  authVersion: 'FIS_v2',
  fid: 'fg6JfS0U01YmrelthLX9Iz',
  sdkVersion: 'w:0.5.7',
}

let cachedToken: string | null = null
let tokenExpiry = 0

async function getGhinToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const username = process.env.GHIN_USERNAME
  const password = process.env.GHIN_PASSWORD
  if (!username || !password) {
    throw new Error('GHIN_USERNAME and GHIN_PASSWORD must be set in .env.local')
  }

  // Step 1: Get Firebase session token
  const sessionRes = await fetch(FIREBASE_SESSION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GOOGLE_API_KEY,
    },
    body: JSON.stringify(SESSION_DEFAULTS),
  })

  if (!sessionRes.ok) {
    throw new Error(`Firebase session failed: ${sessionRes.status}`)
  }

  const sessionData = await sessionRes.json()
  const sessionToken = sessionData?.authToken?.token

  if (!sessionToken) {
    throw new Error('No session token returned from Firebase')
  }

  // Step 2: Login to GHIN with session token + credentials
  const loginRes = await fetch(`${GHIN_API_BASE}/golfer_login.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: sessionToken,
      user: {
        email_or_ghin: username,
        password: password,
      },
    }),
  })

  if (!loginRes.ok) {
    const body = await loginRes.text()
    throw new Error(`GHIN login failed: ${loginRes.status} - ${body}`)
  }

  const loginData = await loginRes.json()
  const accessToken = loginData?.golfer_user?.golfer_user_token

  if (!accessToken) {
    throw new Error('No access token returned from GHIN login')
  }

  // Cache token for 50 minutes (they typically last 1 hour)
  cachedToken = accessToken
  tokenExpiry = Date.now() + 50 * 60 * 1000

  return accessToken
}

export async function POST(req: NextRequest) {
  try {
    const { ghinNumber } = await req.json()

    if (!ghinNumber) {
      return NextResponse.json(
        { error: 'GHIN number is required.' },
        { status: 400 }
      )
    }

    const ghinId = String(ghinNumber).trim()
    console.log('[GHIN] Looking up golfer:', ghinId)

    const token = await getGhinToken()

    // Call the golfers search endpoint directly
    const url = `${GHIN_API_BASE}/golfers.json?per_page=1&page=1&golfer_id=${ghinId}&status=Active&from_ghin=true&source=GHINcom`

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[GHIN] Lookup failed:', res.status, body)

      // If token expired, clear cache and retry once
      if (res.status === 401 || res.status === 403) {
        cachedToken = null
        tokenExpiry = 0
        return NextResponse.json(
          { error: 'GHIN authentication expired. Please try again.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Golfer not found. Check your GHIN number.' },
        { status: 404 }
      )
    }

    const data = await res.json()
    console.log('[GHIN] Raw response:', JSON.stringify(data, null, 2))

    const golfer = data?.golfers?.[0]
    if (!golfer) {
      return NextResponse.json(
        { error: 'Golfer not found. Check your GHIN number.' },
        { status: 404 }
      )
    }

    const rawHi = golfer.handicap_index ?? golfer.hi_value ?? golfer.HandicapIndex
    const rawStr = String(rawHi ?? '').trim()
    const isNH = rawStr === 'NH' || rawStr === '' || rawStr === 'null'
    const handicapIndex = isNH ? null : parseFloat(rawStr)

    console.log('[GHIN] Found golfer:', golfer.first_name, golfer.last_name, '- HI:', rawStr)

    return NextResponse.json({
      handicapIndex: handicapIndex !== null && !isNaN(handicapIndex) ? handicapIndex : null,
      noHandicap: isNH,
      ghinNumber: ghinId,
    })
  } catch (err) {
    console.error('[GHIN] Error:', err)
    return NextResponse.json(
      { error: 'Failed to look up handicap. Please try again.' },
      { status: 500 }
    )
  }
}
