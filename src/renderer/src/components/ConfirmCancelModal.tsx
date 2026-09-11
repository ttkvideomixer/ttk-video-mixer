import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

function ConfirmCancelModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const confirmCancelGeneration = useAppStore((s) => s.confirmCancelGeneration)

  return (
    <ModalShell title="Cancelar Geração" onClose={closeModal}>
      <p className="text-sm text-gray-300">Deseja realmente cancelar a geração?</p>
      <p className="mt-2 text-xs text-gray-500">
        Os vídeos já concluídos não serão apagados. Os que estiverem em andamento serão interrompidos.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={closeModal} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Voltar
        </button>
        <button
          onClick={confirmCancelGeneration}
          className="rounded-lg bg-error px-5 py-2 text-sm font-bold text-black hover:opacity-90"
        >
          Cancelar Geração
        </button>
      </div>
    </ModalShell>
  )
}

export default ConfirmCancelModal
