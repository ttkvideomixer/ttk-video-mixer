import { getMissingGenerateRequirements, useAppStore } from '../state/useAppStore'
import ModalShell from './ModalShell'

function MissingRequirementsModal(): JSX.Element {
  const closeModal = useAppStore((s) => s.closeModal)
  const hooks = useAppStore((s) => s.hooks)
  const bodies = useAppStore((s) => s.bodies)
  const ctas = useAppStore((s) => s.ctas)
  const outputFolder = useAppStore((s) => s.outputFolder)
  const previewApproved = useAppStore((s) => s.previewApproved)

  const missing = getMissingGenerateRequirements({ hooks, bodies, ctas, outputFolder, previewApproved })

  return (
    <ModalShell title="Falta pouco para gerar" onClose={closeModal}>
      <p className="text-sm text-gray-300">Antes de gerar os vídeos, resolva o que falta abaixo:</p>
      <ul className="mt-3 flex flex-col gap-2">
        {missing.map((m) => (
          <li key={m} className="flex items-start gap-2 rounded-lg bg-bg-soft px-3 py-2 text-sm text-warning">
            <span>⚠</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end">
        <button onClick={closeModal} className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-black hover:bg-brand-dark">
          Entendi
        </button>
      </div>
    </ModalShell>
  )
}

export default MissingRequirementsModal
