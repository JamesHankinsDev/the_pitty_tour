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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}

  self.registration.showNotification(title || 'PITY Tour', {
    body: body || '',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
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
