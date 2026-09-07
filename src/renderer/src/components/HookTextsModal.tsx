import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

const MAX_CHARS = 90
const RECOMMENDED_CHARS = 60

function HookTextsModal(): JSX.Element {
  const hookTexts = useAppStore((s) => s.hookTexts)
  const addHookText = useAppStore((s) => s.addHookText)
  const updateHookText = useAppStore((s) => s.updateHookText)
  const removeHookText = useAppStore((s) => s.removeHookText)
  const closeModal = useAppStore((s) => s.closeModal)

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

      <button
        onClick={addHookText}
        className="mt-4 w-full rounded-lg border border-dashed border-bg-border py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
      >
        + Adicionar Texto
      </button>

      <div className="mt-5 flex justify-end">
        <button onClick={closeModal} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Concluído
        </button>
      </div>
    </ModalShell>
  )
}

export default HookTextsModal
