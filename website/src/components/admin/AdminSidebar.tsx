'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAdminMe } from './AdminGate'

const NAV = [
  { href: '/admin', label: 'Visão Geral' },
  { href: '/admin/users', label: 'Usuários' },
  { href: '/admin/non-renewed', label: 'Não Renovaram' },
  { href: '/admin/subscriptions', label: 'Assinaturas' },
  { href: '/admin/payments', label: 'Pagamentos' },
  { href: '/admin/revenue', label: 'Receita' },
  { href: '/admin/funnel', label: 'Funil' },
  { href: '/admin/acquisition', label: 'Aquisição' },
  { href: '/admin/downloads', label: 'Downloads' },
  { href: '/admin/activity', label: 'Atividade' },
  { href: '/admin/insights', label: 'Insights' },
  { href: '/admin/support', label: 'Suporte' },
  { href: '/admin/system', label: 'Sistema' },
  { href: '/admin/webhooks', label: 'Webhooks' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/admins', label: 'Admins' }
]

export default function AdminSidebar(): JSX.Element {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const me = useAdminMe()

  return (
    <aside className={`flex h-screen flex-col border-r border-bg-border bg-bg-card transition-all ${collapsed ? 'w-14' : 'w-60'}`}>
      <div className="flex items-center justify-between border-b border-bg-border px-4 py-4">
        {!collapsed && (
          <Link href="/admin" className="text-xs font-extrabold tracking-tight text-white">
            TTK <span className="text-brand-light">ADMIN</span>
          </Link>
        )}
        <button onClick={() => setCollapsed((v) => !v)} className="text-gray-500 hover:text-gray-300" aria-label="Recolher menu">
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((item) => {
          const active = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block truncate px-4 py-2 text-sm ${
                active ? 'border-l-2 border-brand bg-brand/10 text-white' : 'border-l-2 border-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200'
              }`}
              title={item.label}
            >
              {collapsed ? item.label.slice(0, 1) : item.label}
            </Link>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-bg-border px-4 py-3 text-xs text-gray-500">
          <p className="truncate text-gray-300">{me.displayName ?? me.email}</p>
          <p className="uppercase tracking-wide text-brand-light">{me.role.replace('_', ' ')}</p>
        </div>
      )}
    </aside>
  )
}
