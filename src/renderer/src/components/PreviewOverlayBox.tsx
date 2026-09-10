import { useRef, useState } from 'react'
import type { OverlayTransform } from '@shared/types'
import { fitTextToWidth, LINE_HEIGHT_MULTIPLIER } from '@shared/textWrap'

interface Props {
  overlay: OverlayTransform
  content: string
  containerRef: React.RefObject<HTMLDivElement>
  containerSize: { width: number; height: number }
  onChange: (partial: Partial<OverlayTransform>) => void
  inRiskZone: boolean
  accentColor: string
}

type DragMode = 'move' | 'width' | 'scale'

const FONT_SIZE_RATIO_OF_HEIGHT = 0.09
const MIN_MAX_WIDTH = 0.15
const MAX_MAX_WIDTH = 1
const MIN_SCALE = 0.15
const MAX_SCALE = 2.5

/** Mirrors exactly what the ffmpeg pipeline does (see filterGraph.ts resolveTextFit / buildDrawTextStage). */
function computeRenderedText(content: string, overlay: OverlayTransform, containerWidth: number, containerHeight: number) {
  const baseFontSizePx = containerHeight * FONT_SIZE_RATIO_OF_HEIGHT * overlay.scale
  const maxWidthPx = containerWidth * overlay.maxWidthNormalized
  const fit = fitTextToWidth(content, baseFontSizePx, maxWidthPx)
  return { lines: fit.lines, fontSizePx: baseFontSizePx * fit.fontSizeRatio, maxWidthPx }
}

function PreviewOverlayBox({ overlay, content, containerRef, containerSize, onChange, inRiskZone, accentColor }: Props): JSX.Element {
  const dragState = useRef<{ mode: DragMode; startX: number; startY: number; startOverlay: OverlayTransform } | null>(null)
  const [active, setActive] = useState(false)

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragState.current = { mode, startX: e.clientX, startY: e.clientY, startOverlay: overlay }
    setActive(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragState.current
    const container = containerRef.current
    if (!drag || !container) return
    const rect = container.getBoundingClientRect()

    if (drag.mode === 'move') {
      let x = drag.startOverlay.xNormalized + (e.clientX - drag.startX) / rect.width
      const y = drag.startOverlay.yNormalized + (e.clientY - drag.startY) / rect.height
      if (Math.abs(x - 0.5) < 0.02) x = 0.5
      onChange({ xNormalized: Math.min(1, Math.max(0, x)), yNormalized: Math.min(1, Math.max(0, y)) })
    } else if (drag.mode === 'width') {
      const deltaWidth = ((e.clientX - drag.startX) * 2) / rect.width
      const maxWidthNormalized = Math.min(MAX_MAX_WIDTH, Math.max(MIN_MAX_WIDTH, drag.startOverlay.maxWidthNormalized + deltaWidth))
      onChange({ maxWidthNormalized })
    } else {
      const delta = (e.clientY - drag.startY) / rect.height
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, drag.startOverlay.scale - delta * 3))
      onChange({ scale })
    }
  }

  const endDrag = (): void => {
    dragState.current = null
    setActive(false)
  }

  if (containerSize.width === 0) return <></>

  const { lines, fontSizePx, maxWidthPx } = computeRenderedText(content, overlay, containerSize.width, containerSize.height)
  const showCenterGuide = Math.abs(overlay.xNormalized - 0.5) < 0.001

  return (
    <>
      {showCenterGuide && active && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand-light/60" />
      )}
      <div
        onPointerDown={beginDrag('move')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        style={{
          left: `${overlay.xNormalized * 100}%`,
          top: `${overlay.yNormalized * 100}%`,
          width: `${maxWidthPx}px`,
          transform: 'translate(-50%, -50%)',
          outlineStyle: 'dashed',
          outlineWidth: active ? 2 : 0,
          outlineColor: accentColor,
          outlineOffset: 4
        }}
        onMouseEnter={(e) => (e.currentTarget.style.outlineWidth = '1px')}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.outlineWidth = '0'
        }}
        className="group absolute cursor-move select-none rounded-sm"
      >
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontSize: `${fontSizePx}px`,
              lineHeight: LINE_HEIGHT_MULTIPLIER,
              fontFamily: "'Poppins ExtraBold Preview', sans-serif",
              fontWeight: 800,
              color: 'white',
              WebkitTextFillColor: 'white',
              WebkitTextStroke: `${Math.max(1.5, fontSizePx * 0.07)}px black`,
              paintOrder: 'stroke fill'
            }}
            className="whitespace-nowrap text-center"
          >
            {line}
          </p>
        ))}

        {inRiskZone && (
          <p className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-warning">
            Próximo da interface do TikTok
          </p>
        )}

        {/* Width handle: drag to control line-break width */}
        <div
          onPointerDown={beginDrag('width')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          title="Arraste para quebrar a linha"
          className="absolute right-0 top-1/2 h-6 w-2 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-sm border border-white opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: accentColor }}
        />

        {/* Scale handle: drag vertically to grow/shrink the text */}
        <div
          onPointerDown={beginDrag('scale')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          title="Arraste para aumentar/diminuir a letra"
          className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-full border border-white opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </>
  )
}

export default PreviewOverlayBox
