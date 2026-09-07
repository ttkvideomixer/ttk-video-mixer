/**
 * Minimal Windows path join usable from the renderer (which has no Node
 * `path` module available by design - see AGENTS security rules). Only
 * needs to handle the simple "folder + subfolder + filename" cases used
 * when building output paths for jobs.
 */
export function joinWindowsPath(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .map((part, i) => {
      let cleaned = part.replace(/[/\\]+/g, '\\')
      if (i > 0) cleaned = cleaned.replace(/^\\+/, '')
      cleaned = cleaned.replace(/\\+$/, '')
      return cleaned
    })
    .join('\\')
}
