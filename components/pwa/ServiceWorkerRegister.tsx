'use client'

import { useEffect } from 'react'

// Registers the app's service worker on first mount. This is the same
// worker used by Firebase Messaging; it also handles PWA shell caching.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'development') return

    const register = () => {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .catch((err) => {
          console.warn('Service worker registration failed:', err)
        })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
