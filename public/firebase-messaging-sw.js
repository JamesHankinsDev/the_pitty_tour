/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyD7BG5tCgJEjlZ8IpOdLJFtgORfKKVYwUQ',
  authDomain: 'the-pity-tour.firebaseapp.com',
  projectId: 'the-pity-tour',
  storageBucket: 'the-pity-tour.firebasestorage.app',
  messagingSenderId: '693516808750',
  appId: '1:693516808750:web:30d64c007d2561ae2025bf',
})

const messaging = firebase.messaging()

/* ─── PWA caching ────────────────────────────────────────────────────────── */
const CACHE_VERSION = 'pity-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

// Take over as soon as updated
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch strategy:
// - Never intercept non-GET, Firestore/Firebase, or cross-origin API calls
// - Static Next.js assets (/_next/static/*): cache-first
// - Navigations (HTML): network-first, fall back to cached shell
// - Other same-origin GETs: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Don't interfere with Firebase / cross-origin
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname === '/firebase-messaging-sw.js') return

  // Next.js hashed static assets — cache-first, safe to keep forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
      })
    )
    return
  }

  // Navigations — network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match('/dashboard')
          )
        )
    )
    return
  }

  // Other same-origin GETs — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})

/* ─── FCM push handling ─────────────────────────────────────────────────── */
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}

  self.registration.showNotification(title || 'PITY Tour', {
    body: body || '',
    icon: icon || '/icon1',
    badge: '/icon',
    data: payload.data,
  })
})

// Handle notification click — open the app to the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      // Otherwise open new window
      return clients.openWindow(link)
    })
  )
})
