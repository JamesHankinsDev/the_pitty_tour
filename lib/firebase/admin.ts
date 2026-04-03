import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

let app: App
let messaging: Messaging

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // In production, use GOOGLE_APPLICATION_CREDENTIALS env var pointing
  // to a service account JSON file. For local dev, you can also set
  // FIREBASE_SERVICE_ACCOUNT_KEY as a JSON string in .env.local.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccount) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }

  // Fallback: Application Default Credentials (works in Cloud Run, etc.)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

export function getAdminMessaging(): Messaging {
  if (!messaging) {
    app = getAdminApp()
    messaging = getMessaging(app)
  }
  return messaging
}
