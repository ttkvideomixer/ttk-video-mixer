import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Project } from '@shared/types'
import { migrateProject } from '@shared/projectMigration'
import { pushRecentProject } from './preferences'

function getProjectsDir(): string {
  return join(app.getPath('userData'), 'projects')
}

async function ensureProjectsDir(): Promise<string> {
  const dir = getProjectsDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export function createProjectId(): string {
  return randomUUID()
}

export function getProjectFilePath(projectId: string): string {
  return join(getProjectsDir(), `${projectId}.json`)
}

export async function saveProject(project: Project): Promise<string> {
  await ensureProjectsDir()
  const filePath = getProjectFilePath(project.id)
  const updated: Project = { ...project, updatedAt: Date.now() }
  await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
  pushRecentProject({
    id: updated.id,
    name: updated.name,
    filePath,
    updatedAt: updated.updatedAt
  })
  return filePath
}

export async function loadProject(filePath: string): Promise<Project> {
  const raw = await readFile(filePath, 'utf-8')
  return migrateProject(JSON.parse(raw) as Record<string, unknown>)
}

export function projectFileExists(filePath: string): boolean {
  return existsSync(filePath)
}
