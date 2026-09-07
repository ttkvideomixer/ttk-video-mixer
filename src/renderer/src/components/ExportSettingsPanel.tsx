import { useAppStore } from '../state/useAppStore'
import type { FpsPreset, ResolutionPreset, TransitionDuration, TransitionType } from '@shared/types'
import { RESOLUTION_LABELS } from '@shared/resolutions'

const RESOLUTION_OPTIONS: ResolutionPreset[] = [
  '1080x1920',
  '720x1280',
  '1080x1350',
  '1080x1080',
  '1920x1080',
  'original'
]

const TRANSITION_DURATIONS: TransitionDuration[] = [0.1, 0.2, 0.3, 0.5]

function ExportSettingsPanel(): JSX.Element {
  const prefix = useAppStore((s) => s.prefix)
  const setPrefix = useAppStore((s) => s.setPrefix)
  const settings = useAppStore((s) => s.exportSettings)
  const setExportSettings = useAppStore((s) => s.setExportSettings)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Configurações de Exportação</h3>

      <Field label="Prefixo dos arquivos">
        <input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="video"
          className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
        />
      </Field>

      <Field label="Resolução (recomendado: 1080 × 1920 para TikTok/Reels/Shorts)">
        <select
          value={settings.resolution}
          onChange={(e) => setExportSettings({ resolution: e.target.value as ResolutionPreset })}
          className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
        >
          {RESOLUTION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {RESOLUTION_LABELS[opt]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="FPS">
          <select
            value={settings.fps}
            onChange={(e) => setExportSettings({ fps: e.target.value as FpsPreset })}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
          >
            <option value="original">Manter original</option>
            <option value="30">30 FPS</option>
            <option value="60">60 FPS</option>
          </select>
        </Field>

        <Field label="Ajuste de enquadramento">
          <select
            value={settings.framing}
            onChange={(e) => setExportSettings({ framing: e.target.value as 'contain' | 'cover' })}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
          >
            <option value="contain">Ajustar sem cortar</option>
            <option value="cover">Preencher tela cortando bordas</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Transição entre trechos">
          <select
            value={settings.transition}
            onChange={(e) => setExportSettings({ transition: e.target.value as TransitionType })}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
          >
            <option value="cut">Corte seco (recomendado)</option>
            <option value="fade">Fade</option>
            <option value="crossfade">Crossfade</option>
          </select>
        </Field>

        <Field label="Duração da transição">
          <select
            disabled={settings.transition === 'cut'}
            value={settings.transitionDuration}
            onChange={(e) => setExportSettings({ transitionDuration: Number(e.target.value) as TransitionDuration })}
            className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand disabled:opacity-40"
          >
            {TRANSITION_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d.toLocaleString('pt-BR')} s
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Processamentos simultâneos">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setExportSettings({ concurrency: n as 1 | 2 | 3 | 4 })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                settings.concurrency === n
                  ? 'border-brand bg-brand text-white'
                  : 'border-bg-border bg-bg-soft text-gray-300 hover:bg-bg-border'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={settings.overwriteExisting}
          onChange={(e) => setExportSettings({ overwriteExisting: e.target.checked })}
          className="h-4 w-4 accent-brand"
        />
        Sobrescrever arquivos existentes
      </label>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
    </div>
  )
}

export default ExportSettingsPanel
