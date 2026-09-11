'use client'

import { useState, type FormEvent } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ui/Toast'

const MINI_FAQ = [
  { q: 'Como recupero minha senha?', a: 'Use "Esqueci minha senha" na tela de login.' },
  { q: 'Onde vejo minha versão do aplicativo?', a: 'Abra o TTK VIDEO MIXER e confira o rodapé da tela inicial.' },
  { q: 'Meus vídeos ficam salvos onde?', a: 'Na pasta de destino que você escolheu dentro do aplicativo, no seu computador.' }
]

export default function SupportPage(): JSX.Element {
  const { user } = useAuth()
  const { push } = useToast()
  const [email, setEmail] = useState(user?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [platform, setPlatform] = useState('Windows')
  const [appVersion, setAppVersion] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subject, message, platform, appVersion: appVersion || undefined })
      })
      if (!response.ok) throw new Error()
      push('success', 'Sua mensagem foi enviada. Vamos responder por e-mail em breve.')
      setSubject('')
      setMessage('')
    } catch {
      push('error', 'Não foi possível enviar sua mensagem agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-5 py-16">
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Suporte</h1>
            <p className="mt-2 text-sm text-gray-400">
              Envie sua dúvida ou problema e responderemos por e-mail.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              {MINI_FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-bg-border bg-bg-card p-4">
                  <p className="text-sm font-semibold text-white">{item.q}</p>
                  <p className="mt-1 text-xs text-gray-400">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-bg-border bg-bg-card p-6">
            <input
              type="email"
              required
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white focus:border-brand focus:outline-none"
            >
              <option>Windows</option>
              <option>macOS</option>
              <option>Site</option>
            </select>
            <input
              type="text"
              placeholder="Versão do aplicativo (opcional)"
              value={appVersion}
              onChange={(e) => setAppVersion(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Assunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
            <textarea
              required
              rows={5}
              placeholder="Descreva sua dúvida ou problema"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none rounded-lg border border-bg-border bg-bg-soft px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
