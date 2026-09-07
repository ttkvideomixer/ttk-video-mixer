import Store from 'electron-store'
import type { PreferencesSchema, RecentProjectEntry } from '@shared/types'
import { DEFAULT_EXPORT_SETTINGS } from '@shared/defaults'

const store = new Store<PreferencesSchema>({
  name: 'preferences',
  defaults: {
    lastExportSettings: DEFAULT_EXPORT_SETTINGS,
    lastOutputFolder: null,
    lastPrefix: 'video',
    createSubfolderPerProject: true,
    recentProjects: []
  }
});

export function getPreferences(): PreferencesSchema {
  return {
    lastExportSettings: store.get('lastExportSettings'),
    lastOutputFolder: store.get('lastOutputFolder'),
    lastPrefix: store.get('lastPrefix'),
    createSubfolderPerProject: store.get('createSubfolderPerProject'),
    recentProjects: store.get('recentProjects')
  }
}

export function setPreferences(partial: Partial<PreferencesSchema>): PreferencesSchema {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key as keyof PreferencesSchema, value as never)
  }
  return getPreferences()
}

export function pushRecentProject(entry: RecentProjectEntry): void {
  const current = store.get('recentProjects').filter((p) => p.id !== entry.id)
  current.unshift(entry)
  store.set('recentProjects', current.slice(0, 10))
}
