import { useAppStore } from '../state/useAppStore'

function LogPanel(): JSX.Element {
  const logs = useAppStore((s) => s.generation.logs)

  const copyLog = async (): Promise<void> => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString('pt-BR')}] ${l.status.toUpperCase()} - ${l.fileName}: ${l.message}`)
      .join('\n')
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex max-h-64 flex-col gap-2 rounded-2xl border border-bg-border bg-bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Log</h3>
        <button onClick={copyLog} className="rounded-md border border-bg-border px-3 py-1 text-xs text-gray-300 hover:bg-bg-soft">
          Copiar Log
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-400">
        {logs.length === 0 && <p className="text-gray-600">Nenhum evento registrado ainda.</p>}
        {logs.map((entry) => (
          <p key={entry.id} className={entry.status === 'error' ? 'text-error' : 'text-gray-400'}>
            [{new Date(entry.timestamp).toLocaleTimeString('pt-BR')}] {entry.fileName} — {entry.message}
          </p>
        ))}
      </div>
    </div>
  )
}

export default LogPanel
