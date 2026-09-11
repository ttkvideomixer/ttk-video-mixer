import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose?: () => void
  children: ReactNode
}

function ModalShell({ title, onClose, children }: Props): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-bg-border bg-bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate pr-4 text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-bg-soft hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default ModalShell
