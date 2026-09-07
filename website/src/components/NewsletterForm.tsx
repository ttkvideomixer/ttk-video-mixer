'use client'

import { useState, type FormEvent } from 'react'
import { useToast } from './ui/Toast'
import { getUtmParams } from '@/lib/utm'

export default function NewsletterForm(): JSX.Element {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const { push } = useToast()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    try {
      const utm = getUtmParams()
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter',
          utmSource: utm.utm_source,
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
          utmContent: utm.utm_content,
          utmTerm: utm.utm_term
        })
      })
      if (!response.ok) throw new Error()
      push('success', 'Você vai receber novidades do TTK VIDEO MIXER.')
      setEmail('')
    } catch {
      push('error', 'Não foi possível cadastrar seu e-mail agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        placeholder="Seu melhor e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="whitespace-nowrap rounded-lg border border-bg-border px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-bg-soft disabled:opacity-50"
      >
        {busy ? 'Enviando...' : 'Receber novidades'}
      </button>
    </form>
  )
}
