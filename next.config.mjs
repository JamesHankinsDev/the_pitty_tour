/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent the site from being embedded in iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop browsers from MIME-sniffing the content type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Force HTTPS for 1 year (browsers will refuse plain HTTP)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Block reflected XSS in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control what info is sent in the Referer header
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict what browser features the app can use
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (Next.js needs it) + Firebase + Google APIs
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://www.gstatic.com https://apis.google.com",
              // Styles: self + inline (Tailwind/Next.js injects styles)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Images: self + Google profile photos + Firebase storage + data URIs (QR codes)
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com",
              // API/data connections: self + Firebase + Google APIs + GHIN + GolfCourseAPI + Open-Meteo
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://fcmregistrations.googleapis.com https://api2.ghin.com https://api.golfcourseapi.com https://api.open-meteo.com wss://*.firebaseio.com",
              // Web workers / service workers
              "worker-src 'self' blob:",
              // Frames: none (we don't embed iframes)
              "frame-src 'self' https://*.firebaseapp.com https://apis.google.com https://accounts.google.com",
              // Block all object/embed
              "object-src 'none'",
              // Form submissions only to self
              "form-action 'self'",
              // Only load from HTTPS (except self for localhost dev)
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
