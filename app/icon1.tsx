import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          background: '#16a34a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          borderRadius: 32,
        }}
      >
        P
      </div>
    ),
    { ...size }
  )
}
