import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PITY Tour — Players\' Invitational Tour Yearly'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Same image as opengraph-image — duplicated because Next.js requires
// literal exports for runtime/size/contentType (re-exports don't work).
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            background: 'white',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ color: '#166534', fontWeight: 900, fontSize: 72 }}>P</span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-2px', marginBottom: 12 }}>
          PITY Tour
        </div>
        <div style={{ fontSize: 24, color: '#bbf7d0', textAlign: 'center', maxWidth: 700, lineHeight: 1.4 }}>
          A season-long amateur golf league with real prize pools, monthly majors, and a points race to crown the Tour Champion.
        </div>
      </div>
    ),
    { ...size }
  )
}
