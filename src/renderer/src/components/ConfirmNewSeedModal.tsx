import { useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

function ConfirmNewSeedModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const confirmNewSeed = useAppStore((s) => s.confirmNewSeed)

  return (
    <ModalShell title="Gerar Novas Variações" onClose={closeModal}>
      <p className="text-sm text-gray-300">
        Isso troca a semente de variação do projeto. Vídeos já concluídos não serão alterados — apenas as próximas
        gerações usarão zoom, rotação, cor, velocidade e espelho diferentes. Você também precisará aprovar o Preview
        novamente.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={closeModal} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Cancelar
        </button>
        <button onClick={confirmNewSeed} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Confirmar
        </button>
      </div>
    </ModalShell>
  )
}

export default ConfirmNewSeedModal
