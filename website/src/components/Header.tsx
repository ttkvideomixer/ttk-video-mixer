'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from './AuthProvider'

const NAV_LINKS = [
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#teste-gratis', label: 'Teste grátis' },
  { href: '/#instalacao', label: 'Instalação' },
  { href: '/#preco', label: 'Preço' },
  { href: '/#faq', label: 'FAQ' }
]

interface HeaderProps {
  variant?: 'full' | 'minimal'
}

function Logo(): JSX.Element {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="black" />
        </svg>
      </span>
      <span className="text-sm font-extrabold tracking-tight text-white">
        TTK <span className="text-brand-light">VIDEO MIXER</span>
      </span>
    </Link>
  )
}

export default function Header({ variant = 'full' }: HeaderProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-bg-border/80 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />

        {variant === 'full' && (
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-gray-300 hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-3 md:flex">
          {!loading && user ? (
            <Link
              href="/download"
              className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-black shadow-glow hover:opacity-90"
            >
              Baixar / Minha conta
            </Link>
          ) : (
            <>
              <Link href="/download" className="rounded-lg border border-bg-border px-4 py-2 text-sm text-gray-200 hover:bg-bg-soft">
                Download
              </Link>
              <Link
                href="/criar-conta"
                className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-black shadow-glow hover:opacity-90"
              >
                Começar Grátis
              </Link>
            </>
          )}
        </div>

        {variant === 'full' && (
          <button
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-bg-border text-gray-200 md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {variant === 'full' && menuOpen && (
        <div className="border-t border-bg-border bg-bg px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {!loading && user ? (
              <Link href="/download" onClick={() => setMenuOpen(false)} className="rounded-lg bg-brand-gradient px-4 py-2 text-center text-sm font-bold text-black">
                Baixar / Minha conta
              </Link>
            ) : (
              <>
                <Link href="/download" onClick={() => setMenuOpen(false)} className="rounded-lg border border-bg-border px-4 py-2 text-center text-sm text-gray-200">
                  Download
                </Link>
                <Link href="/criar-conta" onClick={() => setMenuOpen(false)} className="rounded-lg bg-brand-gradient px-4 py-2 text-center text-sm font-bold text-black">
                  Começar Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
