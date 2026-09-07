import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { getSiteUrl } from '@/lib/env'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'TTK VIDEO MIXER — Crie vídeos em escala para TikTok Shop',
    template: '%s · TTK VIDEO MIXER'
  },
  description:
    'Grave Ganchos, Corpos e CTAs uma única vez e combine automaticamente centenas de vídeos para o seu TikTok Shop. Teste com 27 vídeos grátis.',
  openGraph: {
    title: 'TTK VIDEO MIXER — Crie vídeos em escala para TikTok Shop',
    description: 'Grave 30 partes. Transforme em até 1.000 vídeos. Teste com 27 vídeos grátis.',
    url: getSiteUrl(),
    siteName: 'TTK VIDEO MIXER',
    locale: 'pt_BR',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TTK VIDEO MIXER',
    description: 'Grave 30 partes. Transforme em até 1.000 vídeos.'
  },
  robots: { index: true, follow: true }
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-white antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
