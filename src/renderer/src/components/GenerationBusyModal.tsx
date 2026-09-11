import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

function GenerationBusyModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const goToProgress = useAppStore((s) => s.goToProgress)

  return (
    <ModalShell title="Geração em Andamento" onClose={closeModal}>
      <p className="text-sm text-gray-300">
        Já existe uma geração de vídeos em andamento. Aguarde ela terminar (ou cancele-a) antes de iniciar uma nova.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={closeModal} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Entendi
        </button>
        <button
          onClick={() => {
            closeModal()
            goToProgress()
          }}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-black hover:bg-brand-dark"
        >
          Ver Andamento
        </button>
      </div>
    </ModalShell>
  )
}

export default GenerationBusyModal
