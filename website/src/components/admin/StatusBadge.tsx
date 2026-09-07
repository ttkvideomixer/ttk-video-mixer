const TONES: Record<string, string> = {
  active: 'bg-success/15 text-success',
  trial: 'bg-brand/15 text-brand-light',
  past_due: 'bg-warning/15 text-warning',
  canceled: 'bg-bg-border text-gray-400',
  expired: 'bg-bg-border text-gray-400',
  suspended: 'bg-error/15 text-error',
  blocked: 'bg-error/15 text-error',
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-brand/15 text-brand-light',
  closed: 'bg-bg-border text-gray-400',
  paid: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  failed: 'bg-error/15 text-error',
  refunded: 'bg-bg-border text-gray-400'
}

const LABELS: Record<string, string> = {
  active: 'Ativo',
  trial: 'Trial',
  past_due: 'Inadimplente',
  canceled: 'Cancelado',
  expired: 'Expirado',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
  open: 'Aberto',
  in_progress: 'Em andamento',
  closed: 'Fechado',
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado'
}

export default function StatusBadge({ status }: { status: string | null | undefined }): JSX.Element {
  if (!status) return <span className="text-xs text-gray-600">—</span>
  const tone = TONES[status] ?? 'bg-bg-border text-gray-400'
  const label = LABELS[status] ?? status
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${tone}`}>{label}</span>
}
