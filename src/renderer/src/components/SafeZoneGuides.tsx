/**
 * Approximate guide overlays for where TikTok's own UI usually sits
 * (right-side action column, bottom caption/controls, top status area).
 * Purely a UI aid — these never get baked into the rendered video.
 */
function SafeZoneGuides(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute right-0 top-0 h-full w-[13%] border-l border-dashed border-warning/40 bg-warning/5" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] border-t border-dashed border-warning/40 bg-warning/5" />
      <div className="absolute inset-x-0 top-0 h-[6%] border-b border-dashed border-warning/40 bg-warning/5" />
    </div>
  )
}

export const SAFE_ZONES = {
  right: { xMin: 0.87, xMax: 1, yMin: 0, yMax: 1 },
  bottom: { xMin: 0, xMax: 1, yMin: 0.82, yMax: 1 },
  top: { xMin: 0, xMax: 1, yMin: 0, yMax: 0.06 }
}

export default SafeZoneGuides
