import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          borderRadius: 14
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderTop: '14px solid transparent',
            borderBottom: '14px solid transparent',
            borderLeft: '22px solid #25f4ee',
            marginLeft: 3,
            transform: 'translate(-3px, 2px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderTop: '14px solid transparent',
            borderBottom: '14px solid transparent',
            borderLeft: '22px solid #fe2c55',
            marginLeft: 9,
            transform: 'translate(3px, -2px)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderTop: '14px solid transparent',
            borderBottom: '14px solid transparent',
            borderLeft: '22px solid white',
            marginLeft: 6
          }}
        />
      </div>
    ),
    { ...size }
  )
}
