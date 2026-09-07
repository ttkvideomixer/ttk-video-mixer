import { useAppStore } from '../state/useAppStore'
import { countAvailableVariationSpace } from '@shared/variationParams'
import { formatNumberPtBr } from '../utils/format'

function CreativeVariationPanel(): JSX.Element {
  const creativeVariation = useAppStore((s) => s.creativeVariation)
  const setCreativeVariation = useAppStore((s) => s.setCreativeVariation)
  const applySmoothVariationPreset = useAppStore((s) => s.applySmoothVariationPreset)
  const silenceTrim = useAppStore((s) => s.silenceTrim)
  const setSilenceTrimEnabled = useAppStore((s) => s.setSilenceTrimEnabled)
  const requestNewSeed = useAppStore((s) => s.requestNewSeed)

  const availableSpace = countAvailableVariationSpace(creativeVariation)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Variação Criativa</h3>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={creativeVariation.enabled}
            onChange={(e) => setCreativeVariation({ enabled: e.target.checked })}
            className="h-4 w-4 accent-brand"
          />
          Ativar variações
        </label>
      </div>

      <p className="text-xs text-gray-500">Cria variações naturais e diferentes do conteúdo final.</p>

      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${creativeVariation.enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <VariationCheckbox
          label="Zoom"
          checked={creativeVariation.zoomEnabled}
          onChange={(v) => setCreativeVariation({ zoomEnabled: v })}
        />
        <VariationCheckbox
          label="Crop suave"
          checked={creativeVariation.cropEnabled}
          onChange={(v) => setCreativeVariation({ cropEnabled: v })}
        />
        <VariationCheckbox
          label="Rotação suave"
          checked={creativeVariation.rotationEnabled}
          onChange={(v) => setCreativeVariation({ rotationEnabled: v })}
        />
        <VariationCheckbox
          label="Brilho"
          checked={creativeVariation.brightnessEnabled}
          onChange={(v) => setCreativeVariation({ brightnessEnabled: v })}
        />
        <VariationCheckbox
          label="Contraste"
          checked={creativeVariation.contrastEnabled}
          onChange={(v) => setCreativeVariation({ contrastEnabled: v })}
        />
        <VariationCheckbox
          label="Saturação"
          checked={creativeVariation.saturationEnabled}
          onChange={(v) => setCreativeVariation({ saturationEnabled: v })}
        />
        <VariationCheckbox
          label="Velocidade"
          checked={creativeVariation.speedEnabled}
          onChange={(v) => setCreativeVariation({ speedEnabled: v })}
        />
        <VariationCheckbox
          label="Espelho horizontal"
          checked={creativeVariation.mirrorEnabled}
          onChange={(v) => setCreativeVariation({ mirrorEnabled: v })}
        />
      </div>

      {creativeVariation.mirrorEnabled && (
        <p className="rounded-lg bg-bg-soft px-3 py-2 text-[11px] text-gray-500">
          Evite usar em vídeos que já tenham textos ou logos gravados na imagem, pois eles também serão invertidos.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={applySmoothVariationPreset}
          className="rounded-lg border border-bg-border px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
        >
          Usar Variação Suave
        </button>
        <button
          onClick={requestNewSeed}
          className="rounded-lg border border-bg-border px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-bg-soft"
        >
          Gerar Novas Variações
        </button>
        {creativeVariation.enabled && (
          <span className="text-xs text-gray-500">
            Espaço de variações disponível: {formatNumberPtBr(availableSpace)} combinações possíveis
          </span>
        )}
      </div>

      <label className="flex items-center gap-2 border-t border-bg-border pt-3 text-xs text-gray-400">
        <input
          type="checkbox"
          checked={silenceTrim.enabled}
          onChange={(e) => setSilenceTrimEnabled(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Ajustar pausas nas emendas
        <span className="text-gray-600">— remove pequenas pausas sem fala próximas ao início e ao final dos trechos.</span>
      </label>
    </div>
  )
}

function VariationCheckbox({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-bg-soft px-3 py-2 text-xs text-gray-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  )
}

export default CreativeVariationPanel
