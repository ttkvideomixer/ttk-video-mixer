import { useState } from 'react'
import { useAppStore } from '../state/useAppStore'

function ProjectBar(): JSX.Element {
  const projectName = useAppStore((s) => s.projectName)
  const setProjectName = useAppStore((s) => s.setProjectName)
  const saveProject = useAppStore((s) => s.saveProject)
  const newProject = useAppStore((s) => s.newProject)
  const recentProjects = useAppStore((s) => s.recentProjects)
  const loadProjectFromRecent = useAppStore((s) => s.loadProjectFromRecent)
  const hooks = useAppStore((s) => s.hooks)
  const bodies = useAppStore((s) => s.bodies)
  const ctas = useAppStore((s) => s.ctas)
  const outputFolder = useAppStore((s) => s.outputFolder)

  const [recentOpen, setRecentOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const isFirstRun = hooks.length === 0 && bodies.length === 0 && ctas.length === 0 && !outputFolder

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bg-border bg-bg-card px-5 py-4 shadow-card">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-wide text-gray-500">Nome do Projeto</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-64 rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
            placeholder="Short Linho Setembro"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setRecentOpen((v) => !v)}
              className="rounded-lg border border-bg-border px-3 py-2 text-sm text-gray-300 hover:bg-bg-soft"
            >
              Projetos Recentes
            </button>
            {recentOpen && (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-bg-border bg-bg-soft p-2 shadow-card">
                {recentProjects.length === 0 && (
                  <p className="px-2 py-2 text-xs text-gray-500">Nenhum projeto salvo ainda.</p>
                )}
                {recentProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      loadProjectFromRecent(p.filePath)
                      setRecentOpen(false)
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-bg-card"
                  >
                    {p.name}
                    <span className="block text-xs text-gray-500">
                      {new Date(p.updatedAt).toLocaleString('pt-BR')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={newProject}
            className="rounded-lg border border-bg-border px-3 py-2 text-sm text-gray-300 hover:bg-bg-soft"
            title="Ctrl+N"
          >
            Novo Projeto
          </button>

          <button
            onClick={async () => {
              await saveProject()
              setSavedFlash(true)
              setTimeout(() => setSavedFlash(false), 1500)
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            title="Ctrl+S"
          >
            {savedFlash ? 'Salvo!' : 'Salvar Projeto'}
          </button>
        </div>
      </div>

      {isFirstRun && (
        <div className="rounded-2xl border border-bg-border bg-bg-card px-6 py-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-light">
            Primeiros passos
          </h2>
          <ol className="grid grid-cols-1 gap-2 text-sm text-gray-300 md:grid-cols-5">
            <li className="rounded-lg bg-bg-soft px-3 py-2">1. Adicione seus Ganchos</li>
            <li className="rounded-lg bg-bg-soft px-3 py-2">2. Adicione seus Corpos</li>
            <li className="rounded-lg bg-bg-soft px-3 py-2">3. Adicione seus CTAs</li>
            <li className="rounded-lg bg-bg-soft px-3 py-2">4. Escolha a pasta de destino</li>
            <li className="rounded-lg bg-bg-soft px-3 py-2">5. Clique em Gerar Vídeos</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default ProjectBar
