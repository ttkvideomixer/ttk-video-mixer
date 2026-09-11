import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #25f4ee 0%, #fe2c55 100%)',
          borderRadius: 14
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: '14px solid transparent',
            borderBottom: '14px solid transparent',
            borderLeft: '22px solid black',
            marginLeft: 6
          }}
        />
      </div>
    ),
    { ...size }
  )
}
