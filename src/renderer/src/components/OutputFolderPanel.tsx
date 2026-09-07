import { useEffect, useState } from 'react'
import { useAppStore } from '../state/useAppStore'

function OutputFolderPanel(): JSX.Element {
  const outputFolder = useAppStore((s) => s.outputFolder)
  const setOutputFolder = useAppStore((s) => s.setOutputFolder)
  const createSubfolderPerProject = useAppStore((s) => s.createSubfolderPerProject)
  const setCreateSubfolderPerProject = useAppStore((s) => s.setCreateSubfolderPerProject)
  const computeOutputFolderPath = useAppStore((s) => s.computeOutputFolderPath)

  const [diskInfo, setDiskInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!outputFolder) {
      setDiskInfo(null)
      return
    }
    window.api.getDiskSpace(outputFolder).then((info) => {
      setDiskInfo(info.availableFormatted)
    })
  }, [outputFolder])

  const finalPath = computeOutputFolderPath()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Pasta de Destino</h3>

      <button
        onClick={setOutputFolder}
        className="self-start rounded-lg bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
      >
        Escolher Pasta
      </button>

      {outputFolder ? (
        <div className="rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-300">
          <p className="truncate" title={outputFolder}>
            {outputFolder}
          </p>
          {finalPath && <p className="mt-1 truncate text-gray-500" title={finalPath}>Saida final: {finalPath}</p>}
          {diskInfo && <p className="mt-1 text-gray-500">Espaço livre em disco: {diskInfo}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Nenhuma pasta selecionada.</p>
      )}

      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={createSubfolderPerProject}
          onChange={(e) => setCreateSubfolderPerProject(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Criar subpasta por projeto (dentro de /videos-gerados)
      </label>
    </div>
  )
}

export default OutputFolderPanel
