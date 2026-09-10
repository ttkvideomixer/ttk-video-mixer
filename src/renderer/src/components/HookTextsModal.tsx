import { useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

const MAX_CHARS = 90
const RECOMMENDED_CHARS = 60

function HookTextsModal(): JSX.Element {
  const hookTexts = useAppStore((s) => s.hookTexts)
  const addHookText = useAppStore((s) => s.addHookText)
  const addHookTexts = useAppStore((s) => s.addHookTexts)
  const updateHookText = useAppStore((s) => s.updateHookText)
  const removeHookText = useAppStore((s) => s.removeHookText)
  const closeModal = useAppStore((s) => s.closeModal)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  const handleBulkAdd = (): void => {
    const lines = bulkText.split('\n')
    addHookTexts(lines)
    setBulkText('')
    setBulkOpen(false)
  }

  return (
    <ModalShell title="Textos de Gancho" onClose={closeModal}>
      <p className="mb-3 text-xs text-gray-500">
        Textos curtos costumam ter melhor leitura em vídeos verticais.
      </p>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {hookTexts.length === 0 && (
          <p className="rounded-lg bg-bg-soft px-3 py-4 text-center text-xs text-gray-500">
            Nenhum texto adicionado ainda.
          </p>
        )}
        {hookTexts.map((hookText, index) => {
          const overRecommended = hookText.text.length > RECOMMENDED_CHARS
          return (
            <div key={hookText.id} className="flex items-start gap-2 rounded-lg bg-bg-soft p-2">
              <span className="mt-2 w-6 shrink-0 text-center text-xs text-gray-500">{index + 1}</span>
              <div className="flex-1">
                <input
                  value={hookText.text}
                  onChange={(e) => updateHookText(hookText.id, e.target.value)}
                  maxLength={MAX_CHARS}
                  placeholder="Você também sofre com isso?"
                  className="w-full rounded-lg border border-bg-border bg-bg-card px-3 py-2 text-sm text-white outline-none focus:border-brand"
                />
                <p className={`mt-1 text-right text-[11px] ${overRecommended ? 'text-warning' : 'text-gray-500'}`}>
                  {hookText.text.length} / {MAX_CHARS}
                </p>
              </div>
              <button
                onClick={() => removeHookText(hookText.id)}
                className="mt-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-error"
              >
                Remover
              </button>
            </div>
          )
        })}
      </div>

      {bulkOpen ? (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            autoFocus
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'Um texto por linha, por exemplo:\nVocê também sofre com isso?\nJá tentou de tudo e nada resolveu?'}
            rows={5}
            className="w-full resize-none rounded-lg border border-bg-border bg-bg-card px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBulkAdd}
              disabled={bulkText.trim().length === 0}
              className="flex-1 rounded-lg bg-brand py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Adicionar todos
            </button>
            <button
              onClick={() => {
                setBulkOpen(false)
                setBulkText('')
              }}
              className="rounded-lg border border-bg-border px-4 py-2 text-xs text-gray-300 hover:bg-bg-soft"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={addHookText}
            className="flex-1 rounded-lg border border-dashed border-bg-border py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
          >
            + Adicionar Texto
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex-1 rounded-lg border border-dashed border-bg-border py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
          >
            + Colar Vários (um por linha)
          </button>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button onClick={closeModal} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Concluído
        </button>
      </div>
    </ModalShell>
  )
}

export default HookTextsModal
