import type { OverlayTransform } from '@shared/types'
import { fitTextToWidth, LINE_HEIGHT_MULTIPLIER } from '@shared/textWrap'

const FONT_SIZE_RATIO_OF_HEIGHT = 0.09
const FONT_FAMILY = "'Poppins ExtraBold Preview', sans-serif"

/**
 * Draws `content` onto a transparent canvas exactly the size of the final
 * video frame, matching PreviewOverlayBox.tsx's layout (same font, same
 * center/scale/wrap math) so what the user positions in the live preview is
 * what ends up in the render. Chromium's own text engine draws this — which,
 * unlike ffmpeg's freetype-based `drawtext`, renders emoji in full color
 * instead of a monochrome outline (verified: drawtext only ever produces the
 * glyph outline in `fontcolor`, never the actual emoji colors).
 */
export async function renderTextOverlayToPng(content: string, overlay: OverlayTransform, targetWidth: number, targetHeight: number): Promise<Uint8Array> {
  const baseFontSizePx = targetHeight * FONT_SIZE_RATIO_OF_HEIGHT * overlay.scale
  const maxWidthPx = targetWidth * overlay.maxWidthNormalized
  const fit = fitTextToWidth(content, baseFontSizePx, maxWidthPx)
  const fontSizePx = baseFontSizePx * fit.fontSizeRatio

  await document.fonts.load(`800 ${Math.round(fontSizePx)}px ${FONT_FAMILY}`)
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível criar o contexto de canvas para o texto.')

  ctx.font = `800 ${fontSizePx}px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  const lineHeight = fontSizePx * LINE_HEIGHT_MULTIPLIER
  const totalBlockHeight = lineHeight * fit.lines.length
  const centerX = overlay.xNormalized * targetWidth
  const blockTop = overlay.yNormalized * targetHeight - totalBlockHeight / 2

  ctx.lineWidth = Math.max(1.5, fontSizePx * 0.07) * 2
  ctx.strokeStyle = 'black'
  ctx.fillStyle = 'white'

  fit.lines.forEach((line, i) => {
    const y = blockTop + i * lineHeight + lineHeight / 2
    ctx.strokeText(line, centerX, y)
    ctx.fillText(line, centerX, y)
  })

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Não foi possível gerar a imagem do texto.')
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Renders (if needed) and persists a text overlay as a temp PNG, caching the
 * resulting file path by content+position+resolution so the same hook text
 * reused across many generated jobs is only rendered once per batch.
 */
const overlayImageCache = new Map<string, Promise<string>>()

export function getOrRenderTextOverlayImage(
  content: string,
  overlay: OverlayTransform,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const key = `${content}::${JSON.stringify(overlay)}::${targetWidth}x${targetHeight}`
  const cached = overlayImageCache.get(key)
  if (cached) return cached

  const promise = renderTextOverlayToPng(content, overlay, targetWidth, targetHeight).then((bytes) => window.api.saveOverlayImage(bytes))
  overlayImageCache.set(key, promise)
  return promise
}
