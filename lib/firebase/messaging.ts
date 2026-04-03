'use client'

import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'
import { toast } from 'sonner'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''

/**
 * Request notification permission, register the service worker,
 * and return the FCM token. Returns null if denied or unavailable.
 */
export async function requestPushPermission(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return null
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const { getApp } = await import('firebase/app')
    const messaging = getMessaging(getApp())

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    return token || null
  } catch (err) {
    console.warn('Failed to get FCM token:', err)
    return null
  }
}

/**
 * Store the FCM token in Firestore so the server can send pushes to this device.
 */
export async function savePushToken(uid: string, token: string): Promise<void> {
  await setDoc(
    doc(db, 'pushTokens', `${uid}_${token.slice(-8)}`),
    {
      uid,
      token,
      updatedAt: serverTimestamp(),
      platform: 'web',
    },
    { merge: true }
  )
}

/**
 * Listen for foreground messages and show a toast.
 */
export function listenForForegroundMessages(): (() => void) | null {
  if (typeof window === 'undefined') return null

  try {
    const { getApp } = require('firebase/app')
    const messaging = getMessaging(getApp())

    return onMessage(messaging, (payload: MessagePayload) => {
      const title = payload.notification?.title ?? 'PITY Tour'
      const body = payload.notification?.body ?? ''
      toast(title, { description: body })
    })
  } catch {
    return null
  }
}
