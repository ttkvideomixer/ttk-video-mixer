import type { Project } from './types'
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_COMBINATION_SETTINGS,
  DEFAULT_CREATIVE_VARIATION_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_FRAME_SETTINGS,
  DEFAULT_OVERLAYS_STATE,
  DEFAULT_PREVIEW_STATE,
  DEFAULT_SILENCE_TRIM_SETTINGS,
  DEFAULT_VISUAL_CTA_SETTINGS,
  PROJECT_SCHEMA_VERSION
} from './defaults'

/**
 * Normalizes a project loaded from disk into the current schema shape.
 * Projects saved before the hook-text/visual-CTA/creative-variation update
 * (schemaVersion undefined, i.e. version 1) simply lack those fields —
 * this fills them with safe defaults instead of failing to open. Newer
 * projects pass through basically unchanged (still merged with defaults in
 * case a single sub-setting is missing from a future partial write).
 */
export function migrateProject(raw: Record<string, unknown>): Project {
  const p = raw as Partial<Project>
  const rawOverlays = (raw.overlays ?? {}) as Partial<Project['overlays']>

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: p.id ?? '',
    name: p.name ?? 'Projeto',
    hooks: p.hooks ?? [],
    bodies: p.bodies ?? [],
    ctas: p.ctas ?? [],
    outputFolder: p.outputFolder ?? null,
    createSubfolderPerProject: p.createSubfolderPerProject ?? true,
    prefix: p.prefix ?? 'video',
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS, ...p.exportSettings },
    combinationSettings: { ...DEFAULT_COMBINATION_SETTINGS, ...p.combinationSettings },
    hookTexts: p.hookTexts ?? [],
    visualCta: { ...DEFAULT_VISUAL_CTA_SETTINGS, ...p.visualCta },
    creativeVariation: { ...DEFAULT_CREATIVE_VARIATION_SETTINGS, ...p.creativeVariation },
    silenceTrim: { ...DEFAULT_SILENCE_TRIM_SETTINGS, ...p.silenceTrim },
    overlays: {
      hookText: { ...DEFAULT_OVERLAYS_STATE.hookText, ...rawOverlays.hookText },
      visualCta: { ...DEFAULT_OVERLAYS_STATE.visualCta, ...rawOverlays.visualCta },
      showSafeZones: rawOverlays.showSafeZones ?? DEFAULT_OVERLAYS_STATE.showSafeZones
    },
    projectSeed: p.projectSeed ?? Date.now(),
    preview: { ...DEFAULT_PREVIEW_STATE, ...p.preview },
    frameSettings: { ...DEFAULT_FRAME_SETTINGS, ...p.frameSettings },
    audioSettings: {
      ...DEFAULT_AUDIO_SETTINGS,
      ...p.audioSettings,
      hookTracks: p.audioSettings?.hookTracks ?? [],
      bodyTracks: p.audioSettings?.bodyTracks ?? [],
      ctaTracks: p.audioSettings?.ctaTracks ?? [],
      fullTracks: p.audioSettings?.fullTracks ?? []
    },
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now()
  }
}
