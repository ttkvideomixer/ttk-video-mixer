import { CircleCheck, FilePlus, FolderOpen, Undo2 } from 'lucide-react'
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
      <div className="flex justify-center">
        <CircleCheck className="h-10 w-10 text-success" />
      </div>
      <p className="mt-2 text-center text-sm text-gray-300">
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
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black hover:bg-brand-dark"
        >
          <FolderOpen className="h-4 w-4" />
          Abrir Pasta
        </button>
        <button
          onClick={backToProject}
          className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft"
        >
          <Undo2 className="h-4 w-4" />
          Voltar ao Projeto
        </button>
        <button
          onClick={() => {
            backToProject()
            newProject()
          }}
          className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-300 hover:bg-bg-soft"
        >
          <FilePlus className="h-4 w-4" />
          Novo Projeto
        </button>
      </div>
    </ModalShell>
  )
}

export default CompletionModal
