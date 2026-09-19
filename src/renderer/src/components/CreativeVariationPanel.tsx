import { useAppStore, type AudioSlot } from '../state/useAppStore'
import { countAvailableVariationSpace } from '@shared/variationParams'
import { BEAT_FX_STYLES, BEAT_TRANSITION_STYLES, FRAME_ELIGIBLE_RESOLUTION } from '@shared/defaults'
import type { BeatFxStyle, BeatTransitionStyle } from '@shared/types'
import { formatNumberPtBr } from '../utils/format'

const BEAT_TRANSITION_LABELS: Record<BeatTransitionStyle, string> = {
  fade: 'Fade',
  wipeleft: 'Wipe esquerda',
  wiperight: 'Wipe direita',
  slideup: 'Deslizar cima',
  slidedown: 'Deslizar baixo',
  circleopen: 'Círculo (abrir)',
  circleclose: 'Círculo (fechar)',
  pixelize: 'Pixelizar',
  zoomin: 'Zoom',
  dissolve: 'Dissolver',
  radial: 'Radial'
}

const BEAT_FX_LABELS: Record<BeatFxStyle, string> = {
  zoomPunch: 'Zoom (impacto)',
  shake: 'Tremida',
  flash: 'Flash',
  rgbGlitch: 'Glitch RGB',
  invertBlip: 'Inversão rápida',
  hueSwing: 'Giro de cor'
}

function CreativeVariationPanel(): JSX.Element {
  const creativeVariation = useAppStore((s) => s.creativeVariation)
  const setCreativeVariation = useAppStore((s) => s.setCreativeVariation)
  const applySmoothVariationPreset = useAppStore((s) => s.applySmoothVariationPreset)
  const silenceTrim = useAppStore((s) => s.silenceTrim)
  const setSilenceTrimEnabled = useAppStore((s) => s.setSilenceTrimEnabled)
  const requestNewSeed = useAppStore((s) => s.requestNewSeed)
  const frameSettings = useAppStore((s) => s.frameSettings)
  const setFramesEnabled = useAppStore((s) => s.setFramesEnabled)
  const resolution = useAppStore((s) => s.exportSettings.resolution)
  const audioSettings = useAppStore((s) => s.audioSettings)
  const setMuteHook = useAppStore((s) => s.setMuteHook)
  const setMuteBody = useAppStore((s) => s.setMuteBody)
  const setMuteCta = useAppStore((s) => s.setMuteCta)
  const muteAllAudio = useAppStore((s) => s.muteAllAudio)
  const unmuteAllAudio = useAppStore((s) => s.unmuteAllAudio)
  const openAudioFilesModal = useAppStore((s) => s.openAudioFilesModal)
  const clearAllAttachedAudio = useAppStore((s) => s.clearAllAttachedAudio)
  const beatCutSettings = useAppStore((s) => s.beatCutSettings)
  const setBeatCutHook = useAppStore((s) => s.setBeatCutHook)
  const setBeatCutBody = useAppStore((s) => s.setBeatCutBody)
  const setBeatCutCta = useAppStore((s) => s.setBeatCutCta)
  const enableBeatCutAll = useAppStore((s) => s.enableBeatCutAll)
  const disableBeatCutAll = useAppStore((s) => s.disableBeatCutAll)
  const setBeatCutFallbackChunkCount = useAppStore((s) => s.setBeatCutFallbackChunkCount)
  const setBeatCutAllowedTransitions = useAppStore((s) => s.setBeatCutAllowedTransitions)
  const beatFxSettings = useAppStore((s) => s.beatFxSettings)
  const setBeatFxHook = useAppStore((s) => s.setBeatFxHook)
  const setBeatFxBody = useAppStore((s) => s.setBeatFxBody)
  const setBeatFxCta = useAppStore((s) => s.setBeatFxCta)
  const enableBeatFxAll = useAppStore((s) => s.enableBeatFxAll)
  const disableBeatFxAll = useAppStore((s) => s.disableBeatFxAll)
  const setBeatFxFallbackChunkCount = useAppStore((s) => s.setBeatFxFallbackChunkCount)
  const setBeatFxAllowedStyles = useAppStore((s) => s.setBeatFxAllowedStyles)

  const availableSpace = countAvailableVariationSpace(creativeVariation)
  const frameResolutionMismatch = frameSettings.enabled && resolution !== FRAME_ELIGIBLE_RESOLUTION

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

      <div className="border-t border-bg-border pt-3">
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={frameSettings.enabled}
            onChange={(e) => setFramesEnabled(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Aplicar molduras
        </label>
        <p className="mt-1.5 text-[11px] text-gray-600">
          Sobrepõe uma moldura pronta (tema TikTok Shop/promoção) em cada vídeo, sorteada aleatoriamente — uma
          diferente por vídeo, repetindo só depois de usar todas. Funciona apenas na resolução 9:16 (1080 × 1920).
        </p>
        {frameResolutionMismatch && (
          <p className="mt-1.5 text-[11px] text-warning">
            A resolução atual não é 9:16 — as molduras não serão aplicadas nesta geração até você trocar em
            &ldquo;Configurações de Exportação&rdquo;.
          </p>
        )}
      </div>

      <div className="border-t border-bg-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-300">Áudio</h4>
          <div className="flex gap-2">
            <button
              onClick={unmuteAllAudio}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Desmutar tudo
            </button>
            <button
              onClick={muteAllAudio}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Mutar tudo
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <VariationCheckbox label="Mutar Gancho" checked={audioSettings.muteHook} onChange={setMuteHook} />
          <VariationCheckbox label="Mutar Corpo" checked={audioSettings.muteBody} onChange={setMuteBody} />
          <VariationCheckbox label="Mutar CTA" checked={audioSettings.muteCta} onChange={setMuteCta} />
        </div>

        <p className="mt-3 text-[11px] text-gray-600">
          Anexe trilhas próprias por categoria — sorteadas aleatoriamente por vídeo, repetindo se forem curtas e
          cortando se forem longas.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AudioManageButton slot="hook" label="Gancho" count={audioSettings.hookTracks.length} onClick={openAudioFilesModal} />
          <AudioManageButton slot="body" label="Corpo" count={audioSettings.bodyTracks.length} onClick={openAudioFilesModal} />
          <AudioManageButton slot="cta" label="CTA" count={audioSettings.ctaTracks.length} onClick={openAudioFilesModal} />
          <AudioManageButton
            slot="full"
            label="Vídeo completo"
            count={audioSettings.fullTracks.length}
            onClick={openAudioFilesModal}
          />
        </div>

        {(audioSettings.hookTracks.length > 0 ||
          audioSettings.bodyTracks.length > 0 ||
          audioSettings.ctaTracks.length > 0 ||
          audioSettings.fullTracks.length > 0) && (
          <button
            onClick={clearAllAttachedAudio}
            className="mt-2 rounded-lg px-2 py-1 text-[11px] text-gray-500 hover:text-error"
          >
            Desativar todos os áudios anexados
          </button>
        )}
      </div>

      <div className="border-t border-bg-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-300">Cortes na Batida</h4>
          <div className="flex gap-2">
            <button
              onClick={disableBeatCutAll}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Desativar tudo
            </button>
            <button
              onClick={enableBeatCutAll}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Ativar tudo
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-[11px] text-gray-600">
          Divide o trecho em pedaços e embaralha a ordem, com transições entre eles — sincronizado com a batida de
          uma trilha anexada (usa a trilha da própria categoria, ou a de &ldquo;Vídeo completo&rdquo; se não houver
          uma específica) ou, sem música, em pedaços de tamanho parecido. Cada vídeo gerado sai com um remix
          diferente.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <VariationCheckbox label="Gancho" checked={beatCutSettings.hookEnabled} onChange={setBeatCutHook} />
          <VariationCheckbox label="Corpo" checked={beatCutSettings.bodyEnabled} onChange={setBeatCutBody} />
          <VariationCheckbox label="CTA" checked={beatCutSettings.ctaEnabled} onChange={setBeatCutCta} />
        </div>

        {(beatCutSettings.hookEnabled || beatCutSettings.bodyEnabled || beatCutSettings.ctaEnabled) && (
          <>
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              Pedaços sem música (por trecho)
              <input
                type="number"
                min={2}
                max={16}
                value={beatCutSettings.fallbackChunkCount}
                onChange={(e) => setBeatCutFallbackChunkCount(Math.max(2, Math.min(16, Number(e.target.value) || 2)))}
                className="w-16 rounded-lg border border-bg-border bg-bg-soft px-2 py-1 text-sm text-white outline-none focus:border-brand"
              />
            </label>

            <p className="mt-3 text-[11px] text-gray-500">Estilos de transição sorteados entre os pedaços:</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BEAT_TRANSITION_STYLES.map((style) => {
                const checked = beatCutSettings.allowedTransitionStyles.includes(style)
                return (
                  <label key={style} className="flex items-center gap-1.5 rounded-lg bg-bg-soft px-2 py-1.5 text-[11px] text-gray-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...beatCutSettings.allowedTransitionStyles, style]
                          : beatCutSettings.allowedTransitionStyles.filter((s) => s !== style)
                        setBeatCutAllowedTransitions(next)
                      }}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    {BEAT_TRANSITION_LABELS[style]}
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-bg-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-gray-300">Efeitos na Batida</h4>
          <div className="flex gap-2">
            <button
              onClick={disableBeatFxAll}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Desativar tudo
            </button>
            <button
              onClick={enableBeatFxAll}
              className="rounded-lg border border-bg-border px-2 py-1 text-[11px] text-gray-300 hover:bg-bg-soft"
            >
              Ativar tudo
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-[11px] text-gray-600">
          Efeitos de impacto (zoom, tremida, flash, glitch...) disparados exatamente no instante da batida — sem
          reordenar o vídeo, ao contrário do Corte na Batida. Pode usar junto ou separado dele. Usa a mesma trilha
          (da categoria ou &ldquo;Vídeo completo&rdquo;) para achar a batida, ou pedaços parecidos sem música.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <VariationCheckbox label="Gancho" checked={beatFxSettings.hookEnabled} onChange={setBeatFxHook} />
          <VariationCheckbox label="Corpo" checked={beatFxSettings.bodyEnabled} onChange={setBeatFxBody} />
          <VariationCheckbox label="CTA" checked={beatFxSettings.ctaEnabled} onChange={setBeatFxCta} />
        </div>

        {(beatFxSettings.hookEnabled || beatFxSettings.bodyEnabled || beatFxSettings.ctaEnabled) && (
          <>
            <label className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              Batidas sem música (por trecho)
              <input
                type="number"
                min={2}
                max={32}
                value={beatFxSettings.fallbackChunkCount}
                onChange={(e) => setBeatFxFallbackChunkCount(Math.max(2, Math.min(32, Number(e.target.value) || 2)))}
                className="w-16 rounded-lg border border-bg-border bg-bg-soft px-2 py-1 text-sm text-white outline-none focus:border-brand"
              />
            </label>

            <p className="mt-3 text-[11px] text-gray-500">Efeitos sorteados a cada batida:</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BEAT_FX_STYLES.map((style) => {
                const checked = beatFxSettings.allowedStyles.includes(style)
                return (
                  <label key={style} className="flex items-center gap-1.5 rounded-lg bg-bg-soft px-2 py-1.5 text-[11px] text-gray-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...beatFxSettings.allowedStyles, style]
                          : beatFxSettings.allowedStyles.filter((s) => s !== style)
                        setBeatFxAllowedStyles(next)
                      }}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    {BEAT_FX_LABELS[style]}
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>
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

function AudioManageButton({
  slot,
  label,
  count,
  onClick
}: {
  slot: AudioSlot
  label: string
  count: number
  onClick: (slot: AudioSlot) => void
}): JSX.Element {
  return (
    <button
      onClick={() => onClick(slot)}
      className="rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-left text-xs font-semibold text-gray-300 hover:bg-bg-border"
    >
      Gerenciar Áudio: {label} ({count})
    </button>
  )
}

export default CreativeVariationPanel
