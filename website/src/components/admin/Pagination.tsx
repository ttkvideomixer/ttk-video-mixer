export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex items-center justify-between border-t border-bg-border pt-3 text-xs text-gray-400">
      <span>
        {total.toLocaleString('pt-BR')} resultado{total === 1 ? '' : 's'} · página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-bg-border px-3 py-1 disabled:opacity-30"
        >
          Anterior
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-bg-border px-3 py-1 disabled:opacity-30"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
