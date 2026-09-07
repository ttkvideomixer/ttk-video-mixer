'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics'

export default function PageViewTracker(): null {
  const pathname = usePathname()

  useEffect(() => {
    track('page_view', { path: pathname })
  }, [pathname])

  return null
}
