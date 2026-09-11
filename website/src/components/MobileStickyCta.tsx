'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function MobileStickyCta(): JSX.Element | null {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setVisible(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-bg-border bg-bg/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/criar-conta"
        className="block rounded-xl bg-brand-gradient px-4 py-3 text-center text-sm font-extrabold uppercase tracking-wide text-black shadow-glow"
      >
        Testar Grátis
      </Link>
    </div>
  )
}
