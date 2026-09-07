const MAX_LINES = 3
/**
 * Average glyph width as a fraction of font size, for a bold geometric sans
 * (Poppins ExtraBold). Exported so every place that needs to estimate a
 * rendered line's pixel width (the editor's per-line centering math AND the
 * ffmpeg per-line drawtext x position) uses the exact same number — if
 * these ever drifted apart the Preview would stop matching the real
 * export, which is the whole point of computing it once, here.
 */
export const AVG_CHAR_WIDTH_RATIO = 0.62
/** Line box height as a multiple of font size — shared by the CSS preview and the ffmpeg per-line y math. */
export const LINE_HEIGHT_MULTIPLIER = 1.2
const MIN_FONT_SIZE_RATIO = 0.4

/** Rough pixel width estimate for one already-wrapped line at a given font size. */
export function estimateLineWidthPx(line: string, fontSizePx: number): number {
  return line.length * fontSizePx * AVG_CHAR_WIDTH_RATIO
}

/**
 * Wraps text into whole words only (never splitting a word), capped at
 * maxLines. If more words remain once maxLines is reached, they are all
 * appended to the last line rather than silently dropped — the caller
 * (fitTextToWidth) is responsible for shrinking the font until that no
 * longer overflows.
 */
export function wrapTextByWords(text: string, maxCharsPerLine: number, maxLines = MAX_LINES): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`
    const startingNewLineWouldOverflowMax = lines.length === maxLines - 1

    if (candidate.length <= Math.max(1, maxCharsPerLine) || current.length === 0 || startingNewLineWouldOverflowMax) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current.length > 0) lines.push(current)

  return lines
}

export interface FitTextResult {
  lines: string[]
  fontSizeRatio: number
}

/**
 * Picks the largest font size (as a fraction of the requested base size)
 * that keeps the text within maxLines and within maxWidthPx, by shrinking
 * in small steps and re-wrapping at each step.
 */
export function fitTextToWidth(text: string, baseFontSizePx: number, maxWidthPx: number): FitTextResult {
  let ratio = 1
  const step = 0.05

  while (ratio >= MIN_FONT_SIZE_RATIO) {
    const fontSize = baseFontSizePx * ratio
    const maxCharsPerLine = Math.max(1, Math.floor(maxWidthPx / (fontSize * AVG_CHAR_WIDTH_RATIO)))
    const lines = wrapTextByWords(text, maxCharsPerLine)
    const longest = Math.max(...lines.map((l) => l.length))
    const fitsWidth = longest * fontSize * AVG_CHAR_WIDTH_RATIO <= maxWidthPx + 0.01
    const fitsLines = lines.length <= MAX_LINES

    if (fitsWidth && fitsLines) {
      return { lines, fontSizeRatio: ratio }
    }

    ratio -= step
  }

  const fontSize = baseFontSizePx * MIN_FONT_SIZE_RATIO
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidthPx / (fontSize * AVG_CHAR_WIDTH_RATIO)))
  return { lines: wrapTextByWords(text, maxCharsPerLine), fontSizeRatio: MIN_FONT_SIZE_RATIO }
}
