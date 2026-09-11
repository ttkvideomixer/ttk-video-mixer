import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

function ConfirmClearCategoryModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const confirmClearCategory = useAppStore((s) => s.confirmClearCategory)

  return (
    <ModalShell title="Remover Todos" onClose={closeModal}>
      <p className="text-sm text-gray-300">Remover todos os vídeos desta categoria?</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={closeModal} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Cancelar
        </button>
        <button
          onClick={confirmClearCategory}
          className="rounded-lg bg-error px-5 py-2 text-sm font-bold text-black hover:opacity-90"
        >
          Remover Todos
        </button>
      </div>
    </ModalShell>
  )
}

export default ConfirmClearCategoryModal
