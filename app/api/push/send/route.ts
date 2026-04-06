export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminMessaging } from '@/lib/firebase/admin'
import { verifyAuthHeader } from '@/lib/firebase/apiAuth'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize admin Firestore for reading push tokens
function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (serviceAccount) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccount)),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    }
  }
  return getFirestore()
}

interface PushRequest {
  recipientUids: string[]   // send to specific users
  title: string
  body: string
  link?: string             // deep link path, e.g. '/dashboard/leaderboard'
}

export async function POST(req: NextRequest) {
  const uid = await verifyAuthHeader(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data: PushRequest = await req.json()

    if (!data.recipientUids?.length || !data.title || !data.body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const db = getAdminDb()
    const messaging = getAdminMessaging()

    // Get FCM tokens for all recipient UIDs
    const tokensSnap = await db
      .collection('pushTokens')
      .where('uid', 'in', data.recipientUids.slice(0, 30)) // Firestore 'in' limit is 30
      .get()

    if (tokensSnap.empty) {
      return NextResponse.json({ sent: 0, reason: 'No push tokens found' })
    }

    const tokens = tokensSnap.docs.map((d) => d.data().token as string)

    // Send multicast message
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: data.title,
        body: data.body,
      },
      webpush: {
        fcmOptions: {
          link: data.link
            ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}${data.link}`
            : undefined,
        },
      },
      data: {
        link: data.link ?? '/dashboard',
      },
    })

    // Clean up invalid tokens
    const invalidTokens: string[] = []
    result.responses.forEach((resp, i) => {
      if (resp.error?.code === 'messaging/registration-token-not-registered' ||
          resp.error?.code === 'messaging/invalid-registration-token') {
        invalidTokens.push(tokens[i])
      }
    })

    // Delete stale tokens
    if (invalidTokens.length > 0) {
      const batch = db.batch()
      for (const doc of tokensSnap.docs) {
        if (invalidTokens.includes(doc.data().token)) {
          batch.delete(doc.ref)
        }
      }
      await batch.commit()
    }

    return NextResponse.json({
      sent: result.successCount,
      failed: result.failureCount,
    })
  } catch (err) {
    console.error('Push send error:', err)
    return NextResponse.json(
      { error: 'Failed to send push' },
      { status: 500 }
    )
  }
}
