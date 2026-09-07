'use client'

import { useEffect, useRef, useState } from 'react'

export default function AnimatedNumber({ value, durationMs = 700 }: { value: number; durationMs?: number }): JSX.Element {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    let frame: number

    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
      else fromRef.current = to
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return <span>{display.toLocaleString('pt-BR')}</span>
}
