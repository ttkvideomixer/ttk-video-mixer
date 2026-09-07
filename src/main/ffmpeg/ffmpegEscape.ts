/**
 * Escapes a filesystem path for safe use as a quoted value inside an ffmpeg
 * filtergraph option (e.g. drawtext's fontfile=/textfile=), so Windows
 * paths with drive-letter colons, backslashes or apostrophes never break
 * the filter syntax. Returns the value already wrapped in single quotes.
 */
export function escapeFfmpegFilterPath(path: string): string {
  const escaped = path.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
  return `'${escaped}'`
}
