import { percentChange } from '@/lib/admin/periods'

export default function MetricCard({
  label,
  formattedValue,
  rawValue,
  previousRawValue,
  href
}: {
  label: string
  formattedValue: string
  rawValue?: number
  previousRawValue?: number | null
  href?: string
}): JSX.Element {
  const content = (
    <div className="rounded-2xl border border-bg-border bg-bg-card p-5 transition hover:border-brand/40">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{formattedValue}</p>
      {rawValue !== undefined && previousRawValue !== undefined && previousRawValue !== null && (
        <ComparisonBadge current={rawValue} previous={previousRawValue} />
      )}
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }
  return content
}

function ComparisonBadge({ current, previous }: { current: number; previous: number }): JSX.Element | null {
  const change = percentChange(current, previous)
  if (change === null) return null
  const positive = change >= 0
  return (
    <p className={`mt-1 text-xs font-semibold ${positive ? 'text-success' : 'text-error'}`}>
      {positive ? '+' : ''}
      {change.toFixed(1)}% <span className="font-normal text-gray-500">vs período anterior</span>
    </p>
  )
}
