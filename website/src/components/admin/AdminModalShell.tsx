import type { ReactNode } from 'react'

export default function AdminModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-bg-border bg-bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-gray-400 hover:bg-bg-soft hover:text-white">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
