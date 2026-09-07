import { sanitizeFileNamePart } from './sanitize'

/**
 * Pads an index (0-based) into a fixed width label, e.g. index 3, count 120
 * -> "004" (width grows automatically so counts above 99 still sort well).
 */
export function padIndex(index1Based: number, totalCount: number): string {
  const width = Math.max(2, String(totalCount).length)
  return String(index1Based).padStart(width, '0')
}

export interface OutputFileNameParams {
  prefix: string
  hookIndex: number
  bodyIndex: number
  ctaIndex: number
  hookCount: number
  bodyCount: number
  ctaCount: number
  extension?: string
  /** Set only in "cada texto gera uma nova variação" mode, to keep file names unique per text. */
  textIndex?: number
  textCount?: number
}

export function buildOutputFileName(params: OutputFileNameParams): string {
  const safePrefix = sanitizeFileNamePart(params.prefix, 'video')
  const ext = params.extension ?? 'mp4'
  const g = padIndex(params.hookIndex + 1, params.hookCount)
  const c = padIndex(params.bodyIndex + 1, params.bodyCount)
  const cta = padIndex(params.ctaIndex + 1, params.ctaCount)
  const textSuffix =
    params.textIndex !== undefined && params.textCount !== undefined
      ? `_T${padIndex(params.textIndex + 1, params.textCount)}`
      : ''
  return `${safePrefix}_G${g}_C${c}_CTA${cta}${textSuffix}.${ext}`
}

export function buildCombinationLabel(params: {
  hookIndex: number
  bodyIndex: number
  ctaIndex: number
  hookCount: number
  bodyCount: number
  ctaCount: number
}): string {
  const g = padIndex(params.hookIndex + 1, params.hookCount)
  const c = padIndex(params.bodyIndex + 1, params.bodyCount)
  const cta = padIndex(params.ctaIndex + 1, params.ctaCount)
  return `G${g}+C${c}+CTA${cta}`
}
