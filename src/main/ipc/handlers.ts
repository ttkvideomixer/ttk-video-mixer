import { BrowserWindow, dialog, ipcMain, shell, app } from 'electron'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { basename, extname, join } from 'node:path'
import { IpcChannels } from '@shared/ipcChannels'
import type {
  DiskSpaceInfo,
  FfmpegStatus,
  GenerationJob,
  GenerationStartOptions,
  ImportedVideoDescriptor,
  Project,
  RenderJobInput,
  StartGenerationResult
} from '@shared/types'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/defaults'
import { resolveFfmpegPaths } from '../ffmpeg/binaries'
import { probeVideoFile } from '../ffmpeg/probe'
import { generateThumbnailDataUrl } from '../ffmpeg/thumbnail'
import { processJob } from '../ffmpeg/videoProcessor'
import { listVideoFilesInFolder } from '../utils/videoImport'
import { getDiskSpaceInfo } from '../utils/diskSpace'
import { buildCombinationsCsv } from '../utils/csv'
import { getPreferences, setPreferences } from '../store/preferences'
import { createProjectId, getProjectFilePath, loadProject, saveProject } from '../store/projectStore'
import { writeProjectManifest } from '../store/manifest'
import { GenerationQueue } from '../queue/queueManager'
import { authorizeGeneration, completeGeneration } from '../billing/generationLicenseService'
import { HttpFunctionError } from '../billing/httpFunctionError'

async function describeVideoFile(filePath: string): Promise<ImportedVideoDescriptor> {
  const base: ImportedVideoDescriptor = {
    path: filePath,
    name: basename(filePath),
    duration: null,
    width: null,
    height: null,
    fps: null,
    hasAudio: null,
    thumbnailDataUrl: null,
    probeError: null
  }

  try {
    const probe = await probeVideoFile(filePath)
    base.duration = probe.durationSeconds
    base.width = probe.width
    base.height = probe.height
    base.fps = probe.fps
    base.hasAudio = probe.hasAudio
  } catch (error) {
    base.probeError = error instanceof Error ? error.message : String(error)
  }

  try {
    base.thumbnailDataUrl = await generateThumbnailDataUrl(filePath)
  } catch {
    base.thumbnailDataUrl = null
  }

  return base
}

let activeQueue: GenerationQueue | null = null

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IpcChannels.ffmpegStatus, (): FfmpegStatus => resolveFfmpegPaths())
  ipcMain.handle(IpcChannels.getAppVersion, (): string => app.getVersion())

  ipcMain.handle(IpcChannels.importVideos, async (): Promise<ImportedVideoDescriptor[]> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar videos',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Videos', extensions: SUPPORTED_VIDEO_EXTENSIONS.map((e) => e.replace('.', '')) }
      ]
    })
    if (result.canceled) return []
    return Promise.all(result.filePaths.map(describeVideoFile))
  })

  ipcMain.handle(IpcChannels.importFolder, async (): Promise<ImportedVideoDescriptor[]> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar pasta de videos',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const files = await listVideoFilesInFolder(result.filePaths[0])
    return Promise.all(files.map(describeVideoFile))
  })

  ipcMain.handle(IpcChannels.describePaths, async (_event, paths: string[]): Promise<ImportedVideoDescriptor[]> => {
    const validPaths = [...new Set(paths)].filter((p) => existsSync(p) && isVideoExtension(p))
    return Promise.all(validPaths.map(describeVideoFile))
  })

  ipcMain.handle(IpcChannels.chooseOutputFolder, async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Escolher pasta de destino',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IpcChannels.openPath, async (_event, targetPath: string) => {
    const error = await shell.openPath(targetPath)
    if (error) throw new Error(error)
  })

  ipcMain.handle(IpcChannels.showInFolder, (_event, targetPath: string) => {
    shell.showItemInFolder(targetPath)
  })

  ipcMain.handle(IpcChannels.getDiskSpace, async (_event, targetPath: string): Promise<DiskSpaceInfo> => {
    return getDiskSpaceInfo(targetPath)
  })

  ipcMain.handle(IpcChannels.getPreferences, () => getPreferences())

  ipcMain.handle(IpcChannels.setPreferences, (_event, partial) => setPreferences(partial))

  ipcMain.handle(IpcChannels.newProjectId, () => createProjectId())

  ipcMain.handle(IpcChannels.saveProject, async (_event, project: Project) => {
    return saveProject(project)
  })

  ipcMain.handle(IpcChannels.loadProject, async (_event, filePath: string): Promise<Project> => {
    const project = await loadProject(filePath)
    for (const list of [project.hooks, project.bodies, project.ctas]) {
      for (const video of list) {
        if (!existsSync(video.path)) {
          video.probeError = 'Arquivo nao encontrado.'
        }
      }
    }
    return project
  })

  ipcMain.handle(IpcChannels.listRecentProjects, () => getPreferences().recentProjects)

  ipcMain.handle(IpcChannels.exportCombinationsCsv, async (_event, jobs: GenerationJob[]) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar lista de combinacoes',
      defaultPath: join(app.getPath('documents'), 'combinacoes.csv'),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, buildCombinationsCsv(jobs), 'utf-8')
    return result.filePath
  })

  ipcMain.handle(IpcChannels.startGeneration, async (_event, options: GenerationStartOptions): Promise<StartGenerationResult> => {
    // The renderer can ASK to generate, but only this main-process handler
    // decides whether GenerationQueue.start() actually runs — see project
    // rule "IPC request generation -> main process valida token/autorização
    // -> Queue começa". A real ffmpeg process never spawns before the
    // server said yes.
    const combinationHash = createHash('sha256')
      .update(options.jobs.map((j) => j.outputFileName).sort().join('|'))
      .digest('hex')

    let authorization
    try {
      authorization = await authorizeGeneration({
        requestedOutputs: options.jobs.length,
        combinationHash,
        deviceId: options.deviceId
      })
    } catch (err) {
      const code = err instanceof HttpFunctionError ? err.code : 'SERVER_ERROR'
      return { authorized: false, reason: code }
    }

    if (!authorization.allowed) {
      return { authorized: false, reason: authorization.reason }
    }

    const allowedOutputs = authorization.allowedOutputs ?? options.jobs.length
    const jobsToRun = allowedOutputs < options.jobs.length ? options.jobs.slice(0, allowedOutputs) : options.jobs
    const reservationId = authorization.reservationId

    activeQueue?.cancel()
    activeQueue = new GenerationQueue(
      jobsToRun,
      {
        exportSettings: options.exportSettings,
        overlays: options.overlays,
        silenceTrim: options.silenceTrim,
        creativeVariation: options.creativeVariation,
        projectSeed: options.projectSeed,
        projectName: options.projectName
      },
      {
        onJobUpdated: (job) => mainWindow.webContents.send(IpcChannels.onJobUpdated, job),
        onSummary: (summary) => mainWindow.webContents.send(IpcChannels.onGenerationSummary, summary),
        onLog: (entry) => mainWindow.webContents.send(IpcChannels.onLogEntry, entry),
        onFinished: (summary) => {
          mainWindow.webContents.send(IpcChannels.onGenerationFinished, summary)
          writeProjectManifest(options.outputFolder, options.projectName, jobsToRun).catch(() => undefined)
          if (reservationId) {
            completeGeneration(reservationId, summary.completed, summary.errors).catch(() => undefined)
          }
        }
      }
    )
    activeQueue.start()

    return { authorized: true, allowedOutputs: jobsToRun.length }
  })

  ipcMain.handle(IpcChannels.pauseGeneration, () => activeQueue?.pause())
  ipcMain.handle(IpcChannels.resumeGeneration, () => activeQueue?.resume())
  ipcMain.handle(IpcChannels.cancelGeneration, () => activeQueue?.cancel())
  ipcMain.handle(IpcChannels.retryErrors, () => activeQueue?.retryErrors())

  ipcMain.handle(IpcChannels.previewCombination, async (_event, input: RenderJobInput) => {
    const previewDir = join(app.getPath('temp'), 'video-mixer-preview')
    const outputPath = join(previewDir, `preview_${randomUUID()}.mp4`)
    const handle = processJob({ ...input, outputPath, videoMixerId: 'PREVIEW' })
    await handle.promise
    return outputPath
  })

  ipcMain.handle(
    IpcChannels.generateSingle,
    async (_event, input: RenderJobInput & { outputFolder: string; fileName: string; deviceId: string | null }) => {
      // "Gerar Apenas Este Vídeo" produces a real final file, so it costs
      // one generation the same as any batch item — only the live Preview
      // clip (previewCombination, above) is free.
      let authorization
      try {
        authorization = await authorizeGeneration({
          requestedOutputs: 1,
          combinationHash: createHash('sha256').update(input.fileName).digest('hex'),
          deviceId: input.deviceId
        })
      } catch (err) {
        const code = err instanceof HttpFunctionError ? err.code : 'SERVER_ERROR'
        throw new Error(code)
      }

      if (!authorization.allowed) {
        throw new Error(authorization.reason ?? 'SUBSCRIPTION_REQUIRED')
      }

      const outputPath = join(input.outputFolder, input.fileName)
      const handle = processJob({ ...input, outputPath, videoMixerId: 'VM-SINGLE' })

      try {
        await handle.promise
        if (authorization.reservationId) await completeGeneration(authorization.reservationId, 1, 0)
      } catch (err) {
        if (authorization.reservationId) await completeGeneration(authorization.reservationId, 0, 1)
        throw err
      }

      return outputPath
    }
  )
}

export function getProjectPathForId(id: string): string {
  return getProjectFilePath(id)
}

export function isVideoExtension(filePath: string): boolean {
  return SUPPORTED_VIDEO_EXTENSIONS.includes(extname(filePath).toLowerCase())
}
