import type { ReactNode } from 'react'
import Header from './Header'

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="minimal" />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-2xl border border-bg-border bg-bg-card p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-white">{title}</h1>
            <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
