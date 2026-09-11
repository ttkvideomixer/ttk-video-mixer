import { useAppStore } from '../state/useAppStore'
import { formatNumberPtBr } from '../utils/format'
import ModalShell from './ModalShell'

function CompletionModal(): JSX.Element {
  const summary = useAppStore((s) => s.generation.summary)
  const outputFolderUsed = useAppStore((s) => s.generation.outputFolderUsed)
  const backToProject = useAppStore((s) => s.backToProject)
  const newProject = useAppStore((s) => s.newProject)
  const closeModal = useAppStore((s) => s.closeModal)

  if (!summary) return <></>

  return (
    <ModalShell title="Geração Concluída" onClose={closeModal}>
      <p className="text-center text-sm text-gray-300">
        {formatNumberPtBr(summary.total)} {summary.total === 1 ? 'vídeo processado' : 'vídeos processados'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-bg-soft py-4">
          <p className="text-3xl font-bold text-success">{formatNumberPtBr(summary.completed)}</p>
          <p className="text-xs uppercase text-gray-500">Concluídos</p>
        </div>
        <div className="rounded-xl bg-bg-soft py-4">
          <p className="text-3xl font-bold text-error">{formatNumberPtBr(summary.errors)}</p>
          <p className="text-xs uppercase text-gray-500">Erros</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => outputFolderUsed && window.api.openPath(outputFolderUsed)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black hover:bg-brand-dark"
        >
          Abrir Pasta
        </button>
        <button onClick={backToProject} className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft">
          Voltar ao Projeto
        </button>
        <button
          onClick={() => {
            backToProject()
            newProject()
          }}
          className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft"
        >
          Novo Projeto
        </button>
      </div>
    </ModalShell>
  )
}

export default CompletionModal
