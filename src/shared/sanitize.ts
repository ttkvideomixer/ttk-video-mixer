// Windows forbids these characters in file/folder names, plus trailing dots/spaces
// and a set of reserved device names.
// eslint-disable-next-line no-control-regex -- control chars are also illegal in Windows file names
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
])

/**
 * Sanitizes a user-provided string so it is always safe to use as (part of)
 * a Windows file name. Falls back to "video" when nothing valid remains.
 */
export function sanitizeFileNamePart(input: string, fallback = 'video'): string {
  let result = input
    .replace(ILLEGAL_CHARS, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[.\s_]+|[.\s_]+$/g, '')

  if (result.length === 0) {
    result = fallback
  }

  if (RESERVED_NAMES.has(result.toUpperCase())) {
    result = `${result}_arquivo`
  }

  return result.slice(0, 80)
}
