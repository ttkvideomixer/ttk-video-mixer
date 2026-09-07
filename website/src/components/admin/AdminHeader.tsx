'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { useAdminMe } from './AdminGate'

export default function AdminHeader(): JSX.Element {
  const me = useAdminMe()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/admin/users?q=${encodeURIComponent(query.trim())}`)
  }

  const handleLogout = async (): Promise<void> => {
    const supabase = getBrowserSupabaseClient()
    await supabase?.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-bg-border bg-bg-card px-5">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuário, email, ID TTK... (Ctrl+K)"
          className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none"
        />
      </form>

      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-bg-soft">
          <span className="truncate max-w-[160px]">{me.displayName ?? me.email}</span>
          <span className="text-gray-600">▾</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 w-48 rounded-lg border border-bg-border bg-bg-card p-1 shadow-card">
            <div className="px-3 py-2 text-xs text-gray-500">{me.publicUserId}</div>
            <button onClick={handleLogout} className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-300 hover:bg-bg-soft">
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
