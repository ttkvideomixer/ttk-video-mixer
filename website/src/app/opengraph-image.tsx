import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07070b',
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(124,92,255,0.35), transparent 60%)'
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#a48bff', letterSpacing: 4 }}>
          TTK VIDEO MIXER
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: 'white', marginTop: 24, textAlign: 'center', maxWidth: 900 }}>
          Grave 30 partes. Transforme em até 1.000 vídeos.
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#9ca3af', marginTop: 24 }}>
          Teste com 27 vídeos grátis
        </div>
      </div>
    ),
    { ...size }
  )
}
