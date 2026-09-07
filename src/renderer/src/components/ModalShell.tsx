import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose?: () => void
  children: ReactNode
}

function ModalShell({ title, onClose, children }: Props): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-bg-border bg-bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate pr-4 text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="rounded-md px-2 py-1 text-gray-400 hover:bg-bg-soft hover:text-white">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default ModalShell
