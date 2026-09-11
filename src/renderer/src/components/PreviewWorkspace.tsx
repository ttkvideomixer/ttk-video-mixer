import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../state/useAppStore'
import { formatDuration } from '../utils/format'
import PreviewOverlayBox from './PreviewOverlayBox'
import SafeZoneGuides, { SAFE_ZONES } from './SafeZoneGuides'
import { RESOLUTION_MAP } from '@shared/resolutions'
import { toMediaUrl } from '@shared/mediaUrl'
import type { OverlayTransform } from '@shared/types'

function isInRiskZone(overlay: OverlayTransform): boolean {
  const halfWidth = (overlay.maxWidthNormalized * overlay.scale) / 2
  const left = overlay.xNormalized - halfWidth
  const right = overlay.xNormalized + halfWidth

  return Object.values(SAFE_ZONES).some(
    (zone) =>
      right >= zone.xMin && left <= zone.xMax && overlay.yNormalized >= zone.yMin && overlay.yNormalized <= zone.yMax
  )
}

function PreviewWorkspace(): JSX.Element {
  const hooks = useAppStore((s) => s.hooks)
  const bodies = useAppStore((s) => s.bodies)
  const ctas = useAppStore((s) => s.ctas)
  const testSelection = useAppStore((s) => s.testSelection)
  const setTestSelection = useAppStore((s) => s.setTestSelection)
  const runTestPreview = useAppStore((s) => s.runTestPreview)
  const testPreviewPath = useAppStore((s) => s.testPreviewPath)
  const testPreviewLoading = useAppStore((s) => s.testPreviewLoading)
  const testPreviewError = useAppStore((s) => s.testPreviewError)
  const overlays = useAppStore((s) => s.overlays)
  const updateOverlay = useAppStore((s) => s.updateOverlay)
  const setShowSafeZones = useAppStore((s) => s.setShowSafeZones)
  const hookTexts = useAppStore((s) => s.hookTexts)
  const visualCtaEnabled = useAppStore((s) => s.visualCta.enabled)
  const previewExampleVariation = useAppStore((s) => s.previewExampleVariation)
  const previewExampleCtaPhrase = useAppStore((s) => s.previewExampleCtaPhrase)
  const approvePreview = useAppStore((s) => s.approvePreview)
  const previewApproved = useAppStore((s) => s.previewApproved)
  const resolution = useAppStore((s) => s.exportSettings.resolution)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const hook = hooks.find((h) => h.id === testSelection.hookId) ?? hooks[0] ?? null
  const body = bodies.find((b) => b.id === testSelection.bodyId) ?? bodies[0] ?? null
  const cta = ctas.find((c) => c.id === testSelection.ctaId) ?? ctas[0] ?? null

  const canPreview = hooks.length > 0 && bodies.length > 0 && ctas.length > 0

  const target =
    resolution === 'original'
      ? { width: hook?.width ?? 1080, height: hook?.height ?? 1920 }
      : RESOLUTION_MAP[resolution]

  // Fixed, computed-not-measured pixel size: the on-screen box is always an
  // exact scaled-down copy of the real target resolution. This is what
  // guarantees the text overlay math (fontSizePx = containerHeight * ratio)
  // produces the identical result the ffmpeg render will — no dependency on
  // CSS aspect-ratio rounding or ResizeObserver timing.
  const PREVIEW_WIDTH_PX = 280
  const containerSize = {
    width: PREVIEW_WIDTH_PX,
    height: Math.round((PREVIEW_WIDTH_PX * target.height) / target.width)
  }

  useEffect(() => {
    setIsPlaying(true)
    videoRef.current?.play().catch(() => undefined)
  }, [testPreviewPath])

  if (!canPreview) return <></>

  const rawHookDuration = hook?.duration ?? 1
  const rawBodyDuration = body?.duration ?? 1
  const rawCtaDuration = cta?.duration ?? 1
  const rawTotal = rawHookDuration + rawBodyDuration + rawCtaDuration

  const effectiveDuration = videoDuration || rawTotal
  const hookEnd = (rawHookDuration / rawTotal) * effectiveDuration
  const bodyEnd = hookEnd + (rawBodyDuration / rawTotal) * effectiveDuration

  const activeSegment: 'hook' | 'body' | 'cta' = currentTime < hookEnd ? 'hook' : currentTime < bodyEnd ? 'body' : 'cta'
  const playheadPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0

  const hookTextContent = hookTexts.find((t) => t.enabled && t.text.trim().length > 0)?.text ?? null

  const seekTo = (fraction: number): void => {
    if (!videoRef.current || effectiveDuration <= 0) return
    // Never seek to the exact end: HTML5 video fires `ended` the instant
    // currentTime reaches duration, which — combined with our manual loop
    // below — used to snap the scrubber straight back to 0 the moment
    // someone dragged it close to the end, making the last stretch of the
    // video unreachable.
    const clampedFraction = Math.min(Math.max(fraction, 0), 1)
    const target = Math.min(clampedFraction * effectiveDuration, Math.max(0, effectiveDuration - 0.15))
    videoRef.current.currentTime = target
  }

  const togglePlay = (): void => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleEnded = (): void => {
    // Replaces the native `loop` attribute so we control exactly when the
    // restart happens, instead of Chromium's own loop firing mid-drag.
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.play().catch(() => undefined)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-300">Preview</h3>
        {previewApproved && <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Aprovado</span>}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select label="Gancho" options={hooks.map((h) => ({ id: h.id, name: h.name }))} value={hook?.id ?? null} onChange={(id) => setTestSelection({ hookId: id })} />
        <Select label="Corpo" options={bodies.map((b) => ({ id: b.id, name: b.name }))} value={body?.id ?? null} onChange={(id) => setTestSelection({ bodyId: id })} />
        <Select label="CTA" options={ctas.map((c) => ({ id: c.id, name: c.name }))} value={cta?.id ?? null} onChange={(id) => setTestSelection({ ctaId: id })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={testPreviewLoading}
          onClick={runTestPreview}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-brand-dark disabled:opacity-50"
        >
          {testPreviewLoading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          )}
          {testPreviewLoading ? 'Gerando prévia...' : 'Visualizar Combinação'}
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={overlays.showSafeZones}
            onChange={(e) => setShowSafeZones(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Mostrar guias
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Zoom: {previewExampleVariation.zoom.toFixed(2)}x · Rotação: {previewExampleVariation.rotation.toFixed(1)}° · Velocidade:{' '}
        {previewExampleVariation.speed.toFixed(2)}x · Espelho: {previewExampleVariation.mirror ? 'Sim' : 'Não'}
        {previewExampleCtaPhrase ? ` · CTA: "${previewExampleCtaPhrase}"` : ''}
      </p>

      {testPreviewError && <p className="text-xs text-error">{testPreviewError}</p>}

      {testPreviewPath && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] text-gray-500">
            Arraste o texto para posicionar · puxe a alça lateral para quebrar a linha · puxe a alça inferior para
            aumentar/diminuir a letra
          </p>

          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-black"
            style={{ width: containerSize.width, height: containerSize.height }}
          >
            <video
              ref={videoRef}
              key={testPreviewPath}
              src={toMediaUrl(testPreviewPath)}
              autoPlay
              className="absolute inset-0 h-full w-full cursor-pointer object-fill"
              onClick={togglePlay}
              onEnded={handleEnded}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
            />
            {overlays.showSafeZones && <SafeZoneGuides />}

            {hookTextContent && activeSegment === 'hook' && (
              <PreviewOverlayBox
                overlay={overlays.hookText}
                content={hookTextContent}
                containerRef={containerRef}
                containerSize={containerSize}
                onChange={(partial) => updateOverlay('hookText', partial)}
                inRiskZone={isInRiskZone(overlays.hookText)}
                accentColor="#a48bff"
              />
            )}
            {visualCtaEnabled && activeSegment === 'cta' && (
              <PreviewOverlayBox
                overlay={overlays.visualCta}
                content={previewExampleCtaPhrase ?? 'Veja na sacolinha laranja'}
                containerRef={containerRef}
                containerSize={containerSize}
                onChange={(partial) => updateOverlay('visualCta', partial)}
                inRiskZone={isInRiskZone(overlays.visualCta)}
                accentColor="#22c55e"
              />
            )}
          </div>

          <div className="flex w-full max-w-[280px] items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-soft text-gray-200 hover:bg-bg-border"
            >
              {isPlaying ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                  <rect x="3" y="2" width="3.5" height="12" />
                  <rect x="9.5" y="2" width="3.5" height="12" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                  <path d="M4 2.5v11l10-5.5z" />
                </svg>
              )}
            </button>
            <span className="text-[11px] tabular-nums text-gray-500">
              {formatDuration(currentTime)} / {formatDuration(effectiveDuration)}
            </span>
          </div>

          <Timeline
            hookFraction={rawHookDuration / rawTotal}
            bodyFraction={rawBodyDuration / rawTotal}
            ctaFraction={rawCtaDuration / rawTotal}
            hasHookText={!!hookTextContent}
            hasVisualCta={visualCtaEnabled}
            playheadPercent={playheadPercent}
            onSeek={seekTo}
          />

          <p className="text-xs text-gray-500">Duração estimada: {formatDuration(effectiveDuration)}</p>

          <button
            onClick={approvePreview}
            className="w-full max-w-[280px] rounded-lg bg-success px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Aprovar Preview
          </button>
        </div>
      )}
    </div>
  )
}

function Timeline({
  hookFraction,
  bodyFraction,
  ctaFraction,
  hasHookText,
  hasVisualCta,
  playheadPercent,
  onSeek
}: {
  hookFraction: number
  bodyFraction: number
  ctaFraction: number
  hasHookText: boolean
  hasVisualCta: boolean
  playheadPercent: number
  onSeek: (fraction: number) => void
}): JSX.Element {
  // Every row is a flex ["w-24" label][gap-2][bar] — the label + gap column
  // is always exactly 6.5rem wide, identical on all three rows. Measuring
  // the drag rect on the OUTER wrapper (which also spans that label text)
  // used to compute fractions against the full row width instead of just
  // the colored-bar width, so roughly the first third of every drag was a
  // dead zone that mapped nowhere near the visible bar — the scrubber could
  // never be dragged to reach the true start or end. Measuring against the
  // bar track itself fixes that; it's horizontally aligned the same on
  // every row, so one measurement is valid for the whole component.
  const trackRef = useRef<HTMLDivElement>(null)

  const seekFromEvent = (e: React.PointerEvent<HTMLDivElement>): void => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    onSeek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
  }

  const startScrub = (e: React.PointerEvent<HTMLDivElement>): void => {
    // Capture on currentTarget (the wrapper), not target — target can be any
    // inner row, and capturing here is what lets a single drag gesture
    // sweep across all three rows (Vídeo / Texto do Gancho / CTA Visual)
    // as one continuous scrub track.
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromEvent(e)
  }

  return (
    <div
      className="w-full max-w-[280px] cursor-pointer select-none"
      onPointerDown={startScrub}
      onPointerMove={(e) => {
        if (e.buttons === 1) seekFromEvent(e)
      }}
    >
      <div className="relative py-1">
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white"
          style={{ left: `calc(6.5rem + ${playheadPercent / 100} * (100% - 6.5rem))` }}
        >
          <div className="absolute -top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
        </div>

        <TimelineRow label="Vídeo">
          <div ref={trackRef} className="flex h-5 w-full overflow-hidden rounded">
            <div style={{ width: `${hookFraction * 100}%` }} className="bg-brand" />
            <div style={{ width: `${bodyFraction * 100}%` }} className="bg-brand-dark" />
            <div style={{ width: `${ctaFraction * 100}%` }} className="bg-success/70" />
          </div>
        </TimelineRow>

        <TimelineRow label="Texto do Gancho">
          {/* No onClick/onPointerDown of its own — this used to be a button
              that unconditionally jumped to a fixed point (fraction 0)
              whenever clicked, stopping the drag from the outer wrapper
              along the way. That meant any drag or click landing on this
              row discarded wherever the user was actually trying to go and
              snapped back to the start instead. Now it's just a plain
              visual row and the outer wrapper's own pointer handlers scrub
              it exactly like the Vídeo row above. */}
          <div title="Texto do gancho" className="h-3 w-full rounded bg-bg-soft">
            {hasHookText && <div style={{ width: `${hookFraction * 100}%` }} className="h-full rounded bg-brand-light" />}
          </div>
        </TimelineRow>

        <TimelineRow label="CTA Visual">
          <div title="CTA visual" className="h-3 w-full rounded bg-bg-soft">
            {hasVisualCta && (
              <div
                style={{ width: `${ctaFraction * 100}%`, marginLeft: `${(hookFraction + bodyFraction) * 100}%` }}
                className="h-full rounded bg-success"
              />
            )}
          </div>
        </TimelineRow>
      </div>
    </div>
  )
}

function TimelineRow({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-24 shrink-0 text-right text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Select({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: { id: string; name: string }[]
  value: string | null
  onChange: (id: string) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-bg-border bg-bg-soft px-3 py-2 text-sm text-white outline-none focus:border-brand"
      >
        <option value="" disabled>
          Selecione...
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default PreviewWorkspace
