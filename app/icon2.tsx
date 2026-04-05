import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// Maskable icon: "P" is sized within the inner 80% safe zone
// so it survives circular/rounded-square masks on Android.
export default function Icon512() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#16a34a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 280,
          fontWeight: 900,
        }}
      >
        P
      </div>
    ),
    { ...size }
  )
}
