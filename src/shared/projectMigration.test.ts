import { describe, expect, it } from 'vitest'
import { migrateProject } from './projectMigration'
import { PROJECT_SCHEMA_VERSION } from './defaults'

describe('migrateProject', () => {
  it('fills in defaults for an old (pre-schemaVersion) project', () => {
    const legacy = {
      id: 'p1',
      name: 'Campanha Antiga',
      hooks: [],
      bodies: [],
      ctas: [],
      outputFolder: 'C:\\Videos',
      createSubfolderPerProject: true,
      prefix: 'video',
      exportSettings: { resolution: '1080x1920', fps: '30', framing: 'contain', transition: 'cut', transitionDuration: 0.2, concurrency: 2, overwriteExisting: false, crf: 19, audioBitrateKbps: 192 },
      combinationSettings: { mode: 'all', maxCombinations: null, shuffle: false },
      createdAt: 1,
      updatedAt: 1
    }

    const migrated = migrateProject(legacy)

    expect(migrated.schemaVersion).toBe(PROJECT_SCHEMA_VERSION)
    expect(migrated.hookTexts).toEqual([])
    expect(migrated.visualCta.enabled).toBe(false)
    expect(migrated.creativeVariation.enabled).toBe(false)
    expect(migrated.silenceTrim.enabled).toBe(false)
    expect(migrated.preview.approved).toBe(false)
    expect(migrated.combinationSettings.multiplyByHookText).toBe(false)
    expect(typeof migrated.projectSeed).toBe('number')
    expect(migrated.overlays.hookText.xNormalized).toBeCloseTo(0.5)
  })

  it('is idempotent: migrating an already-current project changes nothing', () => {
    const current = migrateProject({ id: 'p1', name: 'Novo' })
    const remigrated = migrateProject(current as unknown as Record<string, unknown>)
    expect(remigrated).toEqual(current)
  })
})
