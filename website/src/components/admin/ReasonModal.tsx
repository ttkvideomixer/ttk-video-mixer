'use client'

import { useState } from 'react'
import ModalShell from './AdminModalShell'

interface Props {
  title: string
  description?: string
  confirmLabel: string
  requireTypedConfirmation?: string
  reasonOptions?: string[]
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export default function ReasonModal({ title, description, confirmLabel, requireTypedConfirmation, reasonOptions, onConfirm, onClose }: Props): JSX.Element {
  const [reason, setReason] = useState('')
  const [typedConfirmation, setTypedConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm =
    reason.trim().length >= 3 && (!requireTypedConfirmation || typedConfirmation.trim().toUpperCase() === requireTypedConfirmation.toUpperCase())

  const handleConfirm = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      {description && <p className="mb-3 text-sm text-gray-400">{description}</p>}

      {reasonOptions && reasonOptions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {reasonOptions.map((option) => (
            <button
              key={option}
              onClick={() => setReason(option)}
              className={`rounded-md border px-2.5 py-1 text-xs ${reason === option ? 'border-brand bg-brand/10 text-brand-light' : 'border-bg-border text-gray-400 hover:bg-bg-soft'}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (obrigatório)"
        rows={3}
        className="w-full resize-none rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
      />

      {requireTypedConfirmation && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-gray-400">
            Digite <span className="font-bold text-white">{requireTypedConfirmation}</span> para confirmar:
          </p>
          <input
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || busy}
          className="rounded-lg bg-error px-5 py-2 text-sm font-bold text-black hover:bg-red-600 disabled:opacity-40"
        >
          {busy ? 'Aguarde...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
